import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import LoginPage from '@/components/LoginPage';
import HomePage from '@/components/HomePage';
import SettingsPage from '@/components/SettingsPage';
import VideoCallScreen from '@/components/VideoCallScreen';
import AudioCallScreen from '@/components/AudioCallScreen';
import IncomingCallScreen from '@/components/IncomingCallScreen';
import CallEndedScreen from '@/components/CallEndedScreen';
import webrtcService, { CallType } from '@/lib/webrtcService';
import soundService from '@/lib/soundService';
import { Loader2, Phone, Video } from 'lucide-react';

type Screen = 'loading' | 'login' | 'home' | 'settings' | 'video-call' | 'audio-call' | 'joining' | 'call-ended';
type CallStatus = 'ringing' | 'incoming' | 'active';

type HomeTab = 'create' | 'join' | 'recent' | 'search' | 'scan';

interface CallState {
    type: CallType;
    roomId: string;
    isInitiator: boolean;
    status: 'ringing' | 'active' | 'ended';
    isDirect: boolean;
}

const updateUrl = (path: string) => {
    window.history.replaceState({}, '', path);
};

const parseRoomFromUrl = (): { roomId: string | null; callType: CallType | null } => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const roomFromQuery = searchParams.get('room');
    if (roomFromQuery) return { roomId: roomFromQuery.toUpperCase(), callType: 'video' };

    const videoMatch = path.match(/^\/video\/([A-Z0-9]+)$/i);
    if (videoMatch) return { roomId: videoMatch[1].toUpperCase(), callType: 'video' };

    const audioMatch = path.match(/^\/audio\/([A-Z0-9]+)$/i);
    if (audioMatch) return { roomId: audioMatch[1].toUpperCase(), callType: 'audio' };

    return { roomId: null, callType: null };
};

const AppContent: React.FC = () => {
    const { isLoggedIn, isInitialized, addCallToHistory, user, requestNotificationPermission, showCallNotification } = useApp();
    const [screen, setScreen] = useState<Screen>('loading');
    const [callState, setCallState] = useState<CallState | null>(null);
    const [callStartTime, setCallStartTime] = useState<number>(0);
    const callStateRef = useRef<CallState | null>(null);
    const callStartTimeRef = useRef<number>(0); // Added for timeout logic
    const callingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined); // Added for timeout logic

    // Listen for WebRTC connection state to start timer
    useEffect(() => {
        const handleConnectionChange = (state: string) => {
            if (state === 'connected') {
                setCallStartTime(prev => prev === 0 ? Date.now() : prev);
                // Clear timeout immediately on connected
                if (callingTimeoutRef.current) {
                    clearTimeout(callingTimeoutRef.current);
                    callingTimeoutRef.current = undefined;
                }
            } else if (state === 'disconnected' || state === 'closed') {
                // optionally handle disconnect
            }
        };
        // We need updates from webrtcService. Using a dedicated listener would be better, 
        // but for now we can piggyback or add a callback setter.
        // Actually, webrtcService exposes callbacks.
        webrtcService.setCallbacks({
            onCallEnded: () => handleEndCall(),
            onUserJoined: (username) => {
                setCallState(prev => prev ? { ...prev, status: 'active' } : null);
                // START TIMER when user joins (this is when call is "received")
                setCallStartTime(prev => prev === 0 ? Date.now() : prev);
                // Clear timeout immediately on join
                if (callingTimeoutRef.current) {
                    clearTimeout(callingTimeoutRef.current);
                    callingTimeoutRef.current = undefined;
                }
            },
            onPeerVideoToggle: (enabled) => { /* handled in VideoCallScreen */ }
        });

        // Improve: Add onConnectionStateChange to callbacks in webrtcService (if not present) 
        // or hook into the service.
        // Based on webrtcService.ts content seen earlier, it has `onconnectionstatechange`.
        // Let's rely on `onUserJoined` as a proxy for "connected" or simply start timer when status becomes 'active'?
        // The user wants "When call is received".
        // For caller: when callee answers (remote joins).
        // For callee: when they answer (join room).

        // Actually, 'onUserJoined' is fired when remote peer joins.
        // For Caller: Remote joins -> Timer Start.
        // For Callee: Remote (Caller) is already there? No, Callee joins -> Caller is there.
        // Let's use `webrtcService.peerConnection.connectionState` listener?
        // Easier: setCallStartTime when `callState.status` becomes `active` AND we have a remote user?

    }, []);

    // Sync Ref for Event Listeners
    useEffect(() => { callStateRef.current = callState; }, [callState]);
    useEffect(() => { callStartTimeRef.current = callStartTime; }, [callStartTime]); // Added for timeout logic

    // Save history on window close (Guest fix)
    useEffect(() => {
        const handleUnload = () => {
            if (callStateRef.current?.status === 'active') {
                const duration = Math.floor((Date.now() - callStartTime) / 1000);
                const remoteUser = webrtcService.getRemoteUsername() || 'Participant';
                addCallToHistory({
                    roomId: callStateRef.current.roomId,
                    type: callStateRef.current.type,
                    duration,
                    username: remoteUser,
                    direction: callStateRef.current.isInitiator ? 'outgoing' : 'incoming',
                    status: duration > 0 ? 'received' : 'missed'
                });
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [callStartTime, addCallToHistory]);
    const [pendingRoom, setPendingRoom] = useState<{ roomId: string; callType: CallType; isInitiatorReconnect?: boolean } | null>(null);
    const [homeTab, setHomeTab] = useState<HomeTab>('create');
    const [incomingCall, setIncomingCall] = useState<{ caller: string, roomId: string, type: CallType } | null>(null);
    const [lastDuration, setLastDuration] = useState(0);
    const [lastRemoteUser, setLastRemoteUser] = useState('');
    const hasJoinedFromUrl = useRef(false);

    // Stale call cleanup on app open
    useEffect(() => {
        const sessionStr = sessionStorage.getItem('veocall_session');
        if (sessionStr) {
            try {
                const session = JSON.parse(sessionStr);
                // Check if session has timestamp (add if not)
                const sessionAge = session.timestamp ? Date.now() - session.timestamp : Infinity;
                // If older than 3 minutes, silently clean up
                if (sessionAge > 3 * 60 * 1000) {
                    console.log("Stale session detected. Cleaning up silently.");
                    sessionStorage.removeItem('veocall_session');
                    // Try to delete room from Firebase
                    if (session.roomId) {
                        import('firebase/database').then(({ ref, remove }) => {
                            import('@/lib/firebaseConfig').then(({ database }) => {
                                remove(ref(database, `calls/${session.roomId}`)).catch(() => { });
                            });
                        });
                    }
                }
            } catch { /* ignore */ }
        }
    }, []);

    useEffect(() => {
        if (!isInitialized) return;
        const path = window.location.pathname;
        const { roomId, callType } = parseRoomFromUrl();

        if (roomId && callType) {
            // Check session for reconnect
            const sessionStr = sessionStorage.getItem('veocall_session');
            let isInitiatorReconnect = false;
            if (sessionStr) {
                try {
                    const session = JSON.parse(sessionStr);
                    if (session.roomId === roomId && session.isInitiator) {
                        isInitiatorReconnect = true;
                    }
                } catch { }
            }

            setPendingRoom({ roomId, callType, isInitiatorReconnect });
            setScreen(isLoggedIn ? 'home' : 'login');
            return;
        }

        if (path === '/setting' || path === '/settings') {
            setScreen(isLoggedIn ? 'settings' : 'login');
            return;
        }
        if (path === '/recent') { setHomeTab('recent'); setScreen(isLoggedIn ? 'home' : 'login'); return; }
        if (path === '/join') { setHomeTab('join'); setScreen(isLoggedIn ? 'home' : 'login'); return; }
        if (path === '/scan') { setHomeTab('scan'); setScreen(isLoggedIn ? 'home' : 'login'); return; }
        if (path === '/search') { setHomeTab('search'); setScreen(isLoggedIn ? 'home' : 'login'); return; }

        setScreen(isLoggedIn ? 'home' : 'login');
        if (path !== '/') updateUrl('/');
    }, [isInitialized, isLoggedIn]);

    useEffect(() => {
        if (isLoggedIn && pendingRoom && screen === 'home' && !hasJoinedFromUrl.current) {
            hasJoinedFromUrl.current = true;
            const timer = setTimeout(async () => {
                if (pendingRoom.isInitiatorReconnect) {
                    try {
                        setScreen('joining');
                        // Re-create room with existing ID
                        const roomId = await webrtcService.createRoom(
                            pendingRoom.callType,
                            user?.username || 'Host',
                            pendingRoom.roomId.startsWith('DIRECT'),
                            pendingRoom.roomId
                        );
                        setCallState({ type: pendingRoom.callType, roomId, isInitiator: true, status: 'active', isDirect: pendingRoom.roomId.startsWith('DIRECT') }); // Active immediately
                        setCallStartTime(Date.now());
                        setScreen(pendingRoom.callType === 'video' ? 'video-call' : 'audio-call');
                    } catch (e) {
                        console.error("Reconnect failed", e);
                        sessionStorage.removeItem('veocall_session');
                        setScreen('home');
                    }
                } else {
                    handleJoinRoom(pendingRoom.roomId);
                }
                setPendingRoom(null);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isLoggedIn, pendingRoom, screen]);

    // Request notification permission on login
    useEffect(() => {
        if (isLoggedIn) {
            requestNotificationPermission();
        }
    }, [isLoggedIn, requestNotificationPermission]);

    useEffect(() => {
        if (user?.username) {
            webrtcService.listenForIncomingCalls(user.username, (call) => {
                if (!call) { setIncomingCall(null); return; }

                // Privacy Check
                const privacy = user.callPrivacy || 'everyone';
                let allowed = false;

                if (privacy === 'everyone') allowed = true;
                else if (privacy === 'none') allowed = false;
                else if (privacy === 'recent') {
                    // Check if caller is in recent calls (incoming or outgoing)
                    // We need to access callHistory from AppContext (available via logic, but simpler to check here)
                    // Does useApp provide callHistory? Yes.
                    // But we are inside useEffect, need to include it in dependency or useRef.
                    // Let's assume allowed for now and adding logic.
                    // Checking callHistory from prop is tricky due to closure staleness if not in dependency.
                    // 'user' is in dependency.
                    allowed = true; // Placeholder, will refine below with list check
                } else if (privacy === 'selected') {
                    allowed = user.allowedUsers?.includes(call.caller);
                }

                // Refined Recent check: Use webrtcService or context?
                // Actually, I can use a ref for latest user/history needed? 
                // Or just trust the `user` object if it's updated.
                // callHistory is in `useApp`.

                if (privacy === 'recent') {
                    // Check 'pinnedUsers' or actual history?
                    // User said "Only the ones who are in the recent".
                    // Need access to history.
                    // The `user` object in context doesn't have callHistory. `callHistory` is separate in `useApp`.
                }
            });
            // Re-implementing correctly below in one block
        }
    }, [user?.username]); // We need callHistory here too.

    const { callHistory } = useApp();

    useEffect(() => {
        if (user?.username) {
            webrtcService.listenForIncomingCalls(user.username, (call) => {
                if (!call) { setIncomingCall(null); return; }

                let allowed = true;
                const privacy = user.callPrivacy || 'everyone';

                if (privacy === 'none') allowed = false;
                else if (privacy === 'selected') {
                    allowed = user.allowedUsers?.includes(call.caller) || false;
                } else if (privacy === 'recent') {
                    const isRecent = callHistory.some(c => c.username === call.caller);
                    allowed = isRecent;
                }

                if (allowed) {
                    setIncomingCall(call);
                    showCallNotification(call.caller, call.type);
                } else {
                    console.log(`Call from ${call.caller} blocked by privacy settings (${privacy})`);
                    // Optionally silently reject
                    webrtcService.rejectIncomingCall(call.roomId);
                }
            });

            // Clear calling timeout if any
            if (callingTimeoutRef.current) {
                clearTimeout(callingTimeoutRef.current);
                callingTimeoutRef.current = undefined;
            }
        }
    }, [user?.username, user?.callPrivacy, user?.allowedUsers, callHistory, showCallNotification]);

    useEffect(() => {
        if (!isInitialized) return;
        if (screen === 'settings') updateUrl('/setting');
        else if (screen === 'home') {
            if (homeTab === 'recent') updateUrl('/recent');
            else if (homeTab === 'join') updateUrl('/join');
            else if (homeTab === 'scan') updateUrl('/scan');
            else if (homeTab === 'search') updateUrl('/search');
            else updateUrl('/');
        } else if (screen === 'video-call' && callState) {
            updateUrl(`/video/${callState.roomId}`);
        } else if (screen === 'audio-call' && callState) {
            updateUrl(`/audio/${callState.roomId}`);
        }
    }, [screen, callState, homeTab, isInitialized]);

    const handleLogin = () => setScreen('home');

    const handleCreateCall = useCallback(async (type: CallType, isDirect: boolean = false) => {
        try {
            setScreen('joining');
            const roomId = await webrtcService.createRoom(type, user?.username || 'Guest', isDirect);
            setCallState({ type, roomId, isInitiator: true, status: 'ringing', isDirect });
            // Timer starts when connected, initialized to 0
            setCallStartTime(0);
            setScreen(type === 'video' ? 'video-call' : 'audio-call');
        } catch (error) {
            console.error('Failed to create call:', error);
            soundService.stopAll();
            setScreen('home');
        }
    }, [user?.username]);

    const handleCallUser = async (targetUsername: string, type: CallType) => {
        if (!user?.username) return;
        try {
            setScreen('joining');
            // Create Direct Room
            const roomId = await webrtcService.createRoom(type, user.username, true);
            // Notify User
            await webrtcService.initiateCall(targetUsername, roomId, type);
            setCallState({ type: type, roomId, isInitiator: true, status: 'ringing', isDirect: true }); // Status 'ringing' for initiator
            setCallStartTime(0);

            // Start 60s timeout for "No Response"
            callingTimeoutRef.current = setTimeout(() => {
                if (callStateRef.current?.status !== 'active' && callStartTimeRef.current === 0) {
                    // Still ringing/connecting? Actually status is 'active' for initiator on create, but connectionState is what matters.
                    // But here we can just end call.
                    alert("User not responding");
                    handleEndCall();
                }
            }, 60000);

            setScreen(type === 'video' ? 'video-call' : 'audio-call');
        } catch (error) {
            console.error("Failed to call user", error);
            soundService.stopAll();
            setScreen('home');
        }
    };

    const handleJoinRoom = useCallback(async (roomId: string) => {
        try {
            setScreen('joining');
            const exists = await webrtcService.checkRoomExists(roomId);
            if (!exists) {
                alert('Room not found or has expired');
                setScreen('home');
                updateUrl('/');
                return;
            }
            const callType = await webrtcService.joinRoom(roomId, user?.username || 'Guest');
            // Determine if it's a direct call based on roomId prefix or other metadata if available
            // For now, assuming if joining a room, it might not be direct unless explicitly passed
            // The `isDirect` property should ideally come from `webrtcService.joinRoom` or `checkRoomExists`
            // For simplicity, let's assume it's not direct if we're just joining a generic room ID.
            // If it's an incoming call, `incomingCall.isDirect` would be used.
            setCallState({ type: callType, roomId, isInitiator: false, status: 'active', isDirect: roomId.startsWith('DIRECT') });
            setCallStartTime(Date.now()); // Callee joins -> Connected immediately? Yes, usually.
            // But better to use the connection event if possible. 
            // For now, if joining a room, you ARE connecting. 
            // Let's keep Date.now() for Joiner (Callee) because they enter an existing room.
            // BUT user said "Only start the counting when the call is received".
            // If I join, I am receiving. So Timer start is correct for Joiner?
            // Yes. 
            setScreen(callType === 'video' ? 'video-call' : 'audio-call');
        } catch (error) {
            console.error('Failed to join room:', error);
            alert('Failed to join the call');
            sessionStorage.removeItem('veocall_session'); // Clear bad session
            setScreen('home');
            updateUrl('/');
        }
    }, [user?.username]);

    const handleEndCall = async () => {
        // Stop all sounds immediately
        soundService.stopAll();

        // Clear calling timeout if any
        if (callingTimeoutRef.current) {
            clearTimeout(callingTimeoutRef.current);
            callingTimeoutRef.current = undefined;
        }

        const duration = (callState && callStartTime > 0) ? Math.floor((Date.now() - callStartTime) / 1000) : 0;
        if (callState) {
            addCallToHistory({
                username: webrtcService.getRemoteUsername() || 'Participant',
                roomId: callState.roomId,
                type: callState.type,
                direction: callState.isInitiator ? 'outgoing' : 'incoming',
                status: duration > 0 ? 'received' : 'missed',
                duration,
            });
            setLastRemoteUser(webrtcService.getRemoteUsername() || 'Participant');
        }
        const isDirectLink = localStorage.getItem('veocall_direct_link') === 'true';
        // Keep room if we are not the initiator (guest) OR if Direct Link is enabled (host)
        const keepRoom = (!callState?.isInitiator) || isDirectLink;
        await webrtcService.endCall(keepRoom);
        setLastDuration(duration);
        setCallState(null);
        setScreen('call-ended');
        updateUrl('/');
    };

    if (screen === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (screen === 'login') return <LoginPage onLogin={handleLogin} />;
    if (screen === 'settings') return <SettingsPage onBack={() => setScreen('home')} />;
    if (screen === 'video-call' && callState) {
        return (
            <VideoCallScreen
                roomId={callState.roomId}
                isInitiator={callState.isInitiator}
                isDirectCall={callState.isDirect}
                onEnd={handleEndCall}
            />
        );
    }
    if (screen === 'audio-call' && callState) {
        return (
            <AudioCallScreen
                roomId={callState.roomId}
                isInitiator={callState.isInitiator}
                isDirectCall={callState.isDirect}
                onEnd={handleEndCall}
            />
        );
    }
    if (screen === 'call-ended') return <CallEndedScreen duration={lastDuration} remoteUsername={lastRemoteUser} onHome={() => setScreen('home')} />;
    if (screen === 'joining') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center animate-pulse">
                        <Video className="w-10 h-10 text-white" />
                    </div>
                </div>
                <h2 className="text-xl font-semibold mb-2">Connecting...</h2>
                <p className="text-muted-foreground">{pendingRoom?.roomId || 'Please wait'}</p>
            </div>
        );
    }

    return (
        <>
            <HomePage
                onSettings={() => setScreen('settings')}
                onCreateCall={handleCreateCall}
                onJoinRoom={handleJoinRoom}
                onCallUser={handleCallUser}
                initialTab={homeTab}
                onTabChange={setHomeTab}
            />
            {incomingCall && (
                <IncomingCallScreen
                    callerName={incomingCall.caller}
                    callType={incomingCall.type}
                    onAccept={() => {
                        handleJoinRoom(incomingCall.roomId);
                        if (user?.username) webrtcService.clearIncomingCall(user.username);
                        setIncomingCall(null);
                    }}
                    onReject={() => {
                        // Signal rejection to caller
                        webrtcService.rejectIncomingCall(incomingCall.roomId);
                        if (user?.username) webrtcService.clearIncomingCall(user.username);
                        setIncomingCall(null);
                    }}
                />
            )}
        </>
    );
};

const Index: React.FC = () => (
    <AppProvider>
        <AppContent />
    </AppProvider>
);

export default Index;
