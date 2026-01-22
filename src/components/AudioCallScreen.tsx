import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, Volume2, User, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import webrtcService from '@/lib/webrtcService';
import soundService from '@/lib/soundService';
import Counter from './ui/Counter';
import AudioOutputDrawer from './AudioOutputDrawer';

interface AudioCallScreenProps {
    roomId: string;
    isInitiator: boolean;
    isDirectCall: boolean;
    onEnd: () => void;
}

interface PeerState {
    id: string;
    username: string;
    stream: MediaStream;
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'ended';

const AudioCallScreen: React.FC<AudioCallScreenProps> = ({ roomId, isInitiator, isDirectCall, onEnd }) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [duration, setDuration] = useState(0);
    const [peers, setPeers] = useState<Map<string, PeerState>>(new Map());
    const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
    const prevConnectionState = useRef<ConnectionState>('connecting');
    const [showAudioDrawer, setShowAudioDrawer] = useState(false);
    const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

    // Sound effects based on connection state
    useEffect(() => {
        // Play dialing sound when initiator and connecting AND isDirectCall
        if (isInitiator && isDirectCall && connectionState === 'connecting') {
            soundService.playDialing();
        }

        // Play connected sound when transitioning to connected
        if (connectionState === 'connected' && prevConnectionState.current !== 'connected') {
            soundService.playConnected();
        }

        // Stop all sounds when disconnected or ended
        if (connectionState === 'disconnected' || connectionState === 'ended') {
            soundService.stopAll();
        }

        prevConnectionState.current = connectionState;
    }, [connectionState, isInitiator]);

    // Cleanup sounds on unmount
    useEffect(() => {
        return () => {
            soundService.stopAll();
        };
    }, []);

    useEffect(() => {
        webrtcService.setCallbacks({
            onLocalStream: () => { },
            onRemoteStream: (stream, peerId, username) => {
                setPeers(prev => {
                    const newMap = new Map(prev);
                    newMap.set(peerId, { id: peerId, username: username || 'Participant', stream });
                    return newMap;
                });
                setConnectionState('connected');
            },
            onPeerLeft: (peerId) => {
                setPeers(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(peerId);
                    return newMap;
                });
            },
            onCallEnded: () => {
                soundService.stopAll();
                soundService.playCallEnded();
                onEnd();
            },
            onPeerDisconnected: () => {
                setConnectionState('disconnected');
            }
        });

        const remoteStream = webrtcService.getRemoteStreamRef();
        if (remoteStream) {
            setPeers(prev => {
                const newMap = new Map(prev);
                newMap.set('remote-peer', {
                    id: 'remote-peer',
                    username: webrtcService.getRemoteUsername() || 'Participant',
                    stream: remoteStream
                });
                return newMap;
            });
            setConnectionState('connected');
        }
    }, [onEnd]);

    // Only start timer when connected
    useEffect(() => {
        if (connectionState !== 'connected') return;
        const interval = setInterval(() => setDuration(d => d + 1), 1000);
        return () => clearInterval(interval);
    }, [connectionState]);

    const toggleMute = () => {
        const muted = webrtcService.toggleMute();
        setIsMuted(muted);
    };

    const toggleSpeaker = () => {
        const newState = !isSpeakerOn;
        setIsSpeakerOn(newState);
        // Try to toggle audio output (limited on mobile web)
        audioRefs.current.forEach((audio) => {
            // Volume approach - mute/unmute or adjust volume
            // Note: True earpiece switching isn't possible in web browsers
            // This toggles between audible and muted as a visual indicator
            if ((audio as any).setSinkId && typeof (audio as any).setSinkId === 'function') {
                // Desktop: Could switch between different outputs, but here we just track state
            }
        });
    };

    const handleEnd = () => {
        soundService.stopAll();
        onEnd();
    };

    const peerList = Array.from(peers.values());

    return (
        <div className="fixed inset-0 bg-background flex flex-col items-center justify-between p-8 z-50 animate-fade-in">
            {/* Audio Elements */}
            {peerList.map(peer => (
                <audio
                    key={peer.id}
                    autoPlay
                    ref={el => {
                        if (el && el.srcObject !== peer.stream) {
                            el.srcObject = peer.stream;
                            audioRefs.current.set(peer.id, el);
                        }
                    }}
                />
            ))}

            <div className="flex-1 w-full flex flex-col items-center justify-center">
                <div className={cn("grid gap-6 w-full max-w-md transition-all",
                    peerList.length === 0 ? "grid-cols-1" :
                        peerList.length === 1 ? "grid-cols-1" : "grid-cols-2"
                )}>
                    {peerList.length === 0 ? (
                        <div className="flex flex-col items-center animate-pulse">
                            <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center mb-4 shadow-lg border-4 border-primary/20">
                                <User className="w-12 h-12 text-muted-foreground" />
                            </div>
                            <h2 className="text-2xl font-bold">Calling...</h2>
                            <p className="text-muted-foreground">{roomId}</p>
                        </div>
                    ) : (
                        peerList.map(peer => (
                            <div key={peer.id} className="flex flex-col items-center animate-scale-in">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-2 shadow-lg border border-primary/20">
                                        <User className="w-10 h-10 text-primary" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-background" />
                                </div>
                                <h3 className="font-semibold">{peer.username}</h3>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Volume2 className="w-3 h-3" />
                                    <span>Active</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-1 font-mono text-xl opacity-80 mb-2">
                    <Counter value={Math.floor(duration / 60)} fontSize={20} padding={0} places={[10, 1]} gap={2} textColor="white" gradientHeight={0} />
                    <span className="text-white">:</span>
                    <Counter value={duration % 60} fontSize={20} padding={0} places={[10, 1]} gap={2} textColor="white" gradientHeight={0} />
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>Encrypted P2P Connection</span>
                </div>
            </div>

            <div className="bg-secondary/50 backdrop-blur-md p-4 rounded-3xl flex items-center gap-4 md:gap-6 shadow-2xl border border-white/5">
                <Button variant={isSpeakerOn ? "default" : "secondary"} size="icon" className="w-14 h-14 rounded-full" onClick={toggleSpeaker}>
                    <Volume2 className="w-6 h-6" />
                </Button>
                {/* Settings button - Desktop only */}
                <Button
                    variant="secondary"
                    size="icon"
                    className="hidden md:flex w-14 h-14 rounded-full"
                    onClick={() => setShowAudioDrawer(true)}
                >
                    <Settings2 className="w-6 h-6" />
                </Button>
                <Button variant={isMuted ? "destructive" : "secondary"} size="icon" className="w-16 h-16 rounded-full shadow-lg" onClick={toggleMute}>
                    {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                </Button>
                <Button variant="destructive" size="icon" className="w-16 h-16 rounded-full shadow-red-500/20 hover:scale-105 transition-transform" onClick={handleEnd}>
                    <Phone className="w-7 h-7 rotate-[135deg]" />
                </Button>
            </div>

            {/* Audio Output Drawer */}
            <AudioOutputDrawer
                isOpen={showAudioDrawer}
                onClose={() => setShowAudioDrawer(false)}
            />
        </div>
    );
};

export default AudioCallScreen;
