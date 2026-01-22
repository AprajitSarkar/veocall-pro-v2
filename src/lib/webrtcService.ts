import { database } from './firebaseConfig';
import { ref, set, get, onValue, off, remove, push, onDisconnect } from 'firebase/database';

export type CallType = 'audio' | 'video';

export interface WebRTCCallbacks {
    onLocalStream?: (stream: MediaStream) => void;
    onRemoteStream?: (stream: MediaStream, peerId: string, username?: string) => void;
    onCallEnded?: () => void;
    onPeerLeft?: (peerId: string) => void;
    onPeerDisconnected?: () => void;
    onPeerVideoToggle?: (enabled: boolean) => void;
    onUserJoined?: (username: string) => void;
}

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
];

class WebRTCService {
    private peerConnection: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private roomId: string | null = null;
    private callbacks: WebRTCCallbacks = {};
    private isInitiator: boolean = false;
    private myUsername: string = '';
    private remoteUsername: string = '';
    private callType: CallType = 'video';
    private unsubscribers: (() => void)[] = [];
    private disconnectTimeout: NodeJS.Timeout | null = null;
    private hostTimeoutId: NodeJS.Timeout | null = null;
    private hasRemoteJoined: boolean = false;

    setCallbacks(callbacks: WebRTCCallbacks) {
        // Merge callbacks instead of replacing to preserve existing handlers
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    async createRoom(type: CallType, username: string, isDirect: boolean = false, existingRoomId?: string): Promise<string> {
        this.callType = type;
        this.myUsername = username;
        this.isInitiator = true;

        // Generate room ID or use existing
        let roomId = existingRoomId;
        if (!roomId) {
            roomId = isDirect
                ? `DIRECT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
                : Math.random().toString(36).substring(2, 8).toUpperCase();
        }

        this.roomId = roomId;

        // Save session
        sessionStorage.setItem('veocall_session', JSON.stringify({
            roomId,
            type,
            isInitiator: true,
            myUsername: username,
            remoteUsername: this.remoteUsername,
            timestamp: Date.now()
        }));

        // Get local media
        await this.getLocalMedia();

        // Create peer connection
        this.createPeerConnection();

        // Create room in Firebase
        const roomRef = ref(database, `calls/${roomId}`);
        // Only set initial data if not exists (to avoid overwriting if reconnecting)
        const roomSnap = await get(roomRef);
        if (!roomSnap.exists()) {
            await set(roomRef, {
                type,
                createdBy: username,
                createdAt: Date.now(),
                isDirect,
                status: 'active',
                participantCount: 1
            });
        } else {
            // Increment participant count on reconnect
            const currentCount = roomSnap.val()?.participantCount || 0;
            await set(ref(database, `calls/${roomId}/participantCount`), currentCount + 1);
        }

        // Start Host-only timeout (3 min to wait for guest)
        this.startHostTimeout(roomId);

        // Create and set offer
        const offer = await this.peerConnection!.createOffer();
        await this.peerConnection!.setLocalDescription(offer);

        await set(ref(database, `calls/${roomId}/offer`), {
            sdp: offer.sdp,
            type: offer.type,
        });

        // Listen for answer
        const answerRef = ref(database, `calls/${roomId}/answer`);
        const unsubAnswer = onValue(answerRef, async (snapshot) => {
            if (snapshot.exists() && this.peerConnection) {
                const answer = snapshot.val();
                try {
                    // Only apply if we are expecting an answer (have local offer)
                    if (this.peerConnection.signalingState === 'have-local-offer') {
                        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                    } else if (this.peerConnection.signalingState === 'stable') {
                        // Received answer but already stable - unexpected, possibly race condition or duplicate
                        console.log("Received answer while stable. Ignoring or checking for renegotiation.");
                    }
                } catch (e) {
                    console.warn("Failed to set remote description", e);
                }
            }
        });
        this.unsubscribers.push(() => off(answerRef));

        // Listen for Guest Join (Triggers Renegotiation/ICE Restart)
        const guestJoinRef = ref(database, `calls/${roomId}/guestJoined`);
        const unsubGuestJoin = onValue(guestJoinRef, async (snapshot) => {
            if (snapshot.exists() && this.peerConnection) {
                console.log("Guest joined/rejoined. Creating new offer (ICE Restart)...");
                try {
                    // Clear old answer to avoid processing stale data
                    await remove(ref(database, `calls/${roomId}/answer`));

                    const newOffer = await this.peerConnection.createOffer({ iceRestart: true });
                    await this.peerConnection.setLocalDescription(newOffer);
                    await set(ref(database, `calls/${roomId}/offer`), {
                        sdp: newOffer.sdp,
                        type: newOffer.type,
                    });
                } catch (e) {
                    console.error("Failed to restart ICE", e);
                }
            }
        });
        this.unsubscribers.push(() => off(guestJoinRef));


        // Listen for remote ICE candidates
        this.listenForIceCandidates('calleeCandidates');

        // Listen for remote username
        const remoteUserRef = ref(database, `calls/${roomId}/calleeUsername`);
        const unsubUser = onValue(remoteUserRef, (snapshot) => {
            if (snapshot.exists()) {
                this.remoteUsername = snapshot.val();
                const s = sessionStorage.getItem('veocall_session');
                if (s) {
                    const parsed = JSON.parse(s);
                    parsed.remoteUsername = this.remoteUsername;
                    sessionStorage.setItem('veocall_session', JSON.stringify(parsed));
                }
                // Notify UI that user joined
                if (this.remoteUsername) {
                    this.hasRemoteJoined = true;
                    this.callbacks.onUserJoined?.(this.remoteUsername);
                    // Also clear host timeout
                    this.clearHostTimeout();
                }
            }
        });
        this.unsubscribers.push(() => off(remoteUserRef));

        // Listen for Video Toggle
        this.listenForVideoToggle(roomId);

        // Signal initial video state (ON)
        const videoTrack = this.localStream?.getVideoTracks()[0];
        if (videoTrack && type === 'video') {
            await set(ref(database, `calls/${roomId}/actions/video/${username}`), videoTrack.enabled);
        }

        // Listen for Call Status (Ended)
        this.listenForCallStatus(roomId);

        // Listen for Actions (Remote Switch)
        this.listenForActions(roomId);

        return roomId;
    }

    async joinRoom(roomId: string, username: string): Promise<CallType> {
        this.roomId = roomId;
        this.myUsername = username;
        this.isInitiator = false;

        // Check if room exists (and get type)
        const roomRef = ref(database, `calls/${roomId}`);
        const roomSnapshot = await get(roomRef);

        if (!roomSnapshot.exists()) {
            throw new Error('Room not found');
        }

        // Clean up old signaling data to ensure fresh connection
        await remove(ref(database, `calls/${roomId}/calleeCandidates`));
        await remove(ref(database, `calls/${roomId}/callerCandidates`));
        await remove(ref(database, `calls/${roomId}/answer`));

        const roomData = roomSnapshot.val();
        this.callType = roomData.type || 'video';
        this.remoteUsername = roomData.createdBy || 'Host';

        // 2-User Limit Check for Direct Calls
        const isDirect = roomData.isDirect || roomId.startsWith('DIRECT');
        const currentCount = roomData.participantCount || 0;
        if (isDirect && currentCount >= 2) {
            throw new Error('Call is full. Only 2 participants allowed.');
        }

        // Increment participant count
        await set(ref(database, `calls/${roomId}/participantCount`), currentCount + 1);

        // Save session
        sessionStorage.setItem('veocall_session', JSON.stringify({
            roomId,
            type: this.callType,
            isInitiator: false,
            myUsername: username,
            remoteUsername: this.remoteUsername,
            timestamp: Date.now()
        }));

        // Get local media
        await this.getLocalMedia();

        // Create peer connection
        this.createPeerConnection();

        // Signal Join (Triggers Host to make new Offer)
        await set(ref(database, `calls/${roomId}/guestJoined`), Date.now());
        // Set Callee Username so Host knows who joined
        await set(ref(database, `calls/${roomId}/calleeUsername`), username);

        // Listen for Video Toggle
        this.listenForVideoToggle(roomId);

        // Signal initial video state (ON)
        const videoTrack = this.localStream?.getVideoTracks()[0];
        if (videoTrack && this.callType === 'video') {
            await set(ref(database, `calls/${roomId}/actions/video/${username}`), videoTrack.enabled);
        }

        // Listen for Offer (Handles Host Connect & Host Refresh/Renegotiation)
        const offerRef = ref(database, `calls/${roomId}/offer`);
        const unsubOffer = onValue(offerRef, async (snapshot) => {
            if (snapshot.exists() && this.peerConnection) {
                const offer = snapshot.val();
                try {
                    // Always accept new offers for renegotiation
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

                    // Create Answer
                    const answer = await this.peerConnection.createAnswer();
                    await this.peerConnection.setLocalDescription(answer);

                    await set(ref(database, `calls/${roomId}/answer`), {
                        sdp: answer.sdp,
                        type: answer.type,
                    });
                } catch (e) {
                    console.warn("Failed to handle new offer", e);
                }
            }
        });
        this.unsubscribers.push(() => off(offerRef));

        // Set callee username
        await set(ref(database, `calls/${roomId}/calleeUsername`), username);

        // Listen for remote ICE candidates
        this.listenForIceCandidates('callerCandidates');

        // Listen for Call Status
        this.listenForCallStatus(roomId);

        // Listen for Actions (Remote Switch)
        this.listenForActions(roomId);

        return this.callType;
    }

    private listenForCallStatus(roomId: string) {
        const statusRef = ref(database, `calls/${roomId}/status`);
        const unsubStatus = onValue(statusRef, (snapshot) => {
            if (snapshot.exists()) {
                const status = snapshot.val();
                if (status === 'ended' || status === 'rejected') {
                    this.callbacks.onCallEnded?.();
                }
            }
        });
        this.unsubscribers.push(() => off(statusRef));
    }

    async checkRoomExists(roomId: string): Promise<boolean> {
        const roomRef = ref(database, `calls/${roomId}`);
        const snapshot = await get(roomRef);
        return snapshot.exists();
    }

    private async getLocalMedia(): Promise<void> {
        const constraints: MediaStreamConstraints = {
            audio: true,
            video: this.callType === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        };

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.callbacks.onLocalStream?.(this.localStream);
        } catch (error) {
            console.error('Error getting local media:', error);
            throw error;
        }
    }

    private createPeerConnection(): void {
        this.peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        // Add local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection!.addTrack(track, this.localStream!);
            });
        }

        // Handle remote tracks
        this.peerConnection.ontrack = (event) => {
            // Mark that someone joined (clear host timeout)
            if (!this.hasRemoteJoined) {
                this.hasRemoteJoined = true;
                this.clearHostTimeout();
            }

            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0];
                this.callbacks.onRemoteStream?.(this.remoteStream, 'remote-peer', this.remoteUsername);
            } else {
                if (!this.remoteStream) {
                    this.remoteStream = new MediaStream();
                }
                this.remoteStream.addTrack(event.track);
                this.callbacks.onRemoteStream?.(this.remoteStream, 'remote-peer', this.remoteUsername);
            }
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.roomId) {
                const candidatePath = this.isInitiator ? 'callerCandidates' : 'calleeCandidates';
                const candidateRef = ref(database, `calls/${this.roomId}/${candidatePath}`);
                push(candidateRef, event.candidate.toJSON());
            }
        };

        // Handle connection state
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection?.connectionState;
            console.log('Connection state:', state);

            if (state === 'connected') {
                this.clearDisconnectTimeout();
            } else if (state === 'disconnected' || state === 'failed') {
                this.callbacks.onPeerDisconnected?.();
                this.startDisconnectTimeout();
            } else if (state === 'closed') {
                // Do NOT call onCallEnded here purely on 'closed' state, as it breaks Refresh.
                // Rely on listenForCallStatus or manual End.
                console.log("Connection closed (Refresh or End).");
                this.clearDisconnectTimeout();
            }
        };
    }

    private startDisconnectTimeout() {
        if (this.disconnectTimeout) return;
        console.log("Peer disconnected. Starting 3-minute auto-end timer.");

        // 3 Minutes = 180,000 ms
        this.disconnectTimeout = setTimeout(async () => {
            console.log("3 minutes passed. Auto-ending call and deleting room.");
            const roomIdToDelete = this.roomId;
            await this.endCall();
            // Hard delete room data
            if (roomIdToDelete) {
                await remove(ref(database, `calls/${roomIdToDelete}`));
            }
        }, 3 * 60 * 1000);
    }

    private clearDisconnectTimeout() {
        if (this.disconnectTimeout) {
            console.log("Connection restored. Clearing auto-end timer.");
            clearTimeout(this.disconnectTimeout);
            this.disconnectTimeout = null;
        }
    }

    private startHostTimeout(roomId: string) {
        // 3 min timeout for host to wait for guest
        this.hostTimeoutId = setTimeout(async () => {
            if (!this.hasRemoteJoined) {
                console.log("No one joined in 3 minutes. Auto-ending call.");
                await this.endCall();
                // Delete room
                await remove(ref(database, `calls/${roomId}`));
            }
        }, 3 * 60 * 1000);
    }

    private clearHostTimeout() {
        if (this.hostTimeoutId) {
            clearTimeout(this.hostTimeoutId);
            this.hostTimeoutId = null;
        }
    }

    private listenForIceCandidates(path: string): void {
        if (!this.roomId) return;

        const candidatesRef = ref(database, `calls/${this.roomId}/${path}`);
        const unsubCandidates = onValue(candidatesRef, (snapshot) => {
            snapshot.forEach((child) => {
                const candidate = child.val();
                if (candidate && this.peerConnection) {
                    this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
                }
            });
        });
        this.unsubscribers.push(() => off(candidatesRef));
    }

    toggleMute(): boolean {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                return !audioTrack.enabled;
            }
        }
        return false;
    }

    toggleVideo(): boolean {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                const enabled = !videoTrack.enabled;
                videoTrack.enabled = enabled;
                // Signal change
                if (this.roomId) {
                    set(ref(database, `calls/${this.roomId}/actions/video/${this.myUsername}`), enabled);
                }
                return enabled;
            }
        }
        return false;
    }

    private listenForVideoToggle(roomId: string) {
        const videoRef = ref(database, `calls/${roomId}/actions/video`);
        const unsub = onValue(videoRef, (snapshot) => {
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    const user = child.key;
                    const enabled = child.val();
                    if (user !== this.myUsername) {
                        this.callbacks.onPeerVideoToggle?.(enabled);
                    }
                });
            }
        });
        this.unsubscribers.push(() => off(videoRef));
    }

    async switchCamera(): Promise<void> {
        if (!this.localStream || this.callType !== 'video') return;

        const videoTrack = this.localStream.getVideoTracks()[0];
        if (!videoTrack) return;

        const currentFacingMode = videoTrack.getSettings().facingMode;
        const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: newFacingMode },
                audio: false,
            });

            const newVideoTrack = newStream.getVideoTracks()[0];

            // Replace track in peer connection
            const sender = this.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
                sender.replaceTrack(newVideoTrack);
            }

            // Replace in local stream
            this.localStream.removeTrack(videoTrack);
            this.localStream.addTrack(newVideoTrack);
            videoTrack.stop();

            this.callbacks.onLocalStream?.(this.localStream);
        } catch (error) {
            console.error('Error switching camera:', error);
        }
    }

    getLocalStreamRef(): MediaStream | null {
        return this.localStream;
    }

    getRemoteStreamRef(): MediaStream | null {
        return this.remoteStream;
    }

    getRemoteUsername(): string {
        return this.remoteUsername;
    }

    async requestRemoteCameraSwitch(): Promise<void> {
        if (!this.roomId || !this.remoteUsername) return;

        try {
            await set(ref(database, `calls/${this.roomId}/actions/switchCamera`), {
                target: this.remoteUsername,
                timestamp: Date.now()
            });
        } catch (e) {
            console.error("Failed to request remote camera switch", e);
        }
    }

    private listenForActions(roomId: string): void {
        const actionRef = ref(database, `calls/${roomId}/actions/switchCamera`);
        const unsub = onValue(actionRef, (snapshot) => {
            if (snapshot.exists()) {
                const action = snapshot.val();
                // Check if this action is for me and is recent (within 5 seconds)
                const isForMe = action.target === this.myUsername;
                const isRecent = Date.now() - action.timestamp < 5000;

                if (isForMe && isRecent) {
                    // Prevent duplicate triggers if we already processed? 
                    // Timestamp check helps. 
                    // Better: store lastProcessedTimestamp.
                    if (this.lastActionTimestamp !== action.timestamp) {
                        this.lastActionTimestamp = action.timestamp;
                        console.log("Received remote camera switch request!");
                        this.switchCamera();
                    }
                }
            }
        });
        this.unsubscribers.push(() => off(actionRef));
    }
    private lastActionTimestamp = 0;

    // DIRECT CALLING SIGNALING
    async initiateCall(targetUsername: string, roomId: string, type: CallType): Promise<void> {
        try {
            await set(ref(database, `users/${targetUsername}/incomingCall`), {
                caller: this.myUsername,
                roomId,
                type,
                timestamp: Date.now()
            });
        } catch (e) {
            console.error("Failed to initiate call", e);
        }
    }

    listenForIncomingCalls(username: string, callback: (call: { caller: string, roomId: string, type: CallType } | null) => void): void {
        const callRef = ref(database, `users/${username}/incomingCall`);
        onValue(callRef, (snapshot) => {
            if (snapshot.exists()) {
                const call = snapshot.val();
                // Check if call is stale (older than 30 seconds)
                if (Date.now() - call.timestamp < 30000) {
                    callback(call);
                } else {
                    // Auto-clear stale calls?
                    // remove(callRef);
                    callback(null);
                }
            } else {
                callback(null);
            }
        });
    }

    async clearIncomingCall(username: string): Promise<void> {
        await remove(ref(database, `users/${username}/incomingCall`));
    }

    async rejectIncomingCall(roomId: string): Promise<void> {
        // Signal to caller that call was rejected
        try {
            await set(ref(database, `calls/${roomId}/status`), 'rejected');
        } catch (e) {
            console.error("Failed to signal call rejection", e);
        }
    }

    async endCall(keepRoom: boolean = false): Promise<void> {
        const roomIdToDelete = this.roomId;

        // Clear timeouts
        this.clearDisconnectTimeout();
        this.clearHostTimeout();

        // Signal call end to others
        if (roomIdToDelete) {
            try {
                await set(ref(database, `calls/${roomIdToDelete}/status`), 'ended');

                // Delete room unless specifically asked to keep it
                // (e.g. for persistent direct call rooms)
                if (!keepRoom) {
                    await remove(ref(database, `calls/${roomIdToDelete}`));
                }
            } catch (e) {
                console.error("Failed to signal call end", e);
            }
        }

        // Stop all tracks
        this.localStream?.getTracks().forEach(track => track.stop());
        this.remoteStream?.getTracks().forEach(track => track.stop());

        // Close peer connection
        this.peerConnection?.close();

        // Unsubscribe from Firebase listeners
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];

        // Reset state
        sessionStorage.removeItem('veocall_session');
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.roomId = null;
        this.remoteUsername = '';
        this.hasRemoteJoined = false;
    }

    async checkAudioOutputSupport(): Promise<boolean> {
        const audio = document.createElement('audio');
        return typeof (audio as any).setSinkId === 'function';
    }
    async setVideoQuality(highQuality: boolean, highFps: boolean): Promise<void> {
        if (!this.localStream) return;
        const track = this.localStream.getVideoTracks()[0];
        if (!track) return;

        const constraints: MediaTrackConstraints = {
            frameRate: highFps ? { ideal: 60, max: 60 } : { ideal: 30 },
            width: highQuality ? { ideal: 1920 } : { ideal: 640 },
            height: highQuality ? { ideal: 1080 } : { ideal: 480 }
        };

        try {
            await track.applyConstraints(constraints);
            console.log("Applied video constraints:", constraints);
        } catch (e) {
            console.warn("Failed to apply video constraints:", e);
        }
    }
}

const webrtcService = new WebRTCService();
export default webrtcService;
