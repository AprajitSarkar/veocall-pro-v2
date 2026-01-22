import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Video, VideoOff, SwitchCamera, Copy, Check, Link2,
  Users, Phone, QrCode, X, Activity, PhoneOff, Loader2, Volume2, Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import webrtcService from '@/lib/webrtcService';
import soundService from '@/lib/soundService';
import { useApp } from '@/contexts/AppContext';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import CallStatusBar from './CallStatusBar';
import ConnectionOverlay from './ConnectionOverlay';
import AudioOutputDrawer from './AudioOutputDrawer';
import CameraSettingsDrawer from './CameraSettingsDrawer';

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'failed' | 'ended';

interface VideoCallScreenProps {
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

const VideoCallScreen: React.FC<VideoCallScreenProps> = ({ roomId, isInitiator, isDirectCall, onEnd }) => {
  const { networkStats } = useApp();
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [showUI, setShowUI] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [copied, setCopied] = useState(false);
  const [peers, setPeers] = useState<Map<string, PeerState>>(new Map());
  const [showQRCode, setShowQRCode] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [showCallEnded, setShowCallEnded] = useState(false);
  const [showAudioDrawer, setShowAudioDrawer] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [cameraConfig, setCameraConfig] = useState({ hd: false, fps60: false });
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // Layout State
  const [isSwapped, setIsSwapped] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Double Tap Detection
  const lastTapTime = useRef<number>(0);

  // Immersive Mode
  const hideTimeout = useRef<NodeJS.Timeout>();

  // Previous connection state for detecting changes
  const prevConnectionState = useRef<ConnectionState>('connecting');

  // Fullscreen on Mount
  useEffect(() => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.log("Error attempting to enable fullscreen:", err);
        });
      }
    } catch (e) { console.error(e); }
    return () => {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(err => console.error(err));
        }
      } catch (e) { console.error(e); }
    };
  }, []);

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

    // Stop all sounds when disconnected, failed, or ended
    if (connectionState === 'disconnected' || connectionState === 'failed' || connectionState === 'ended') {
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

  // Initialize WebRTC callbacks

  // Initialize WebRTC callbacks
  useEffect(() => {
    setLocalStream(webrtcService.getLocalStreamRef());
    const remote = webrtcService.getRemoteStreamRef();
    if (remote) {
      setPeers(prev => new Map(prev).set('remote-peer', { id: 'remote-peer', username: webrtcService.getRemoteUsername(), stream: remote }));
      setConnectionState('connected');
    }

    webrtcService.setCallbacks({
      onLocalStream: (stream) => setLocalStream(stream),
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
        // If all peers left, show disconnected
        if (peers.size <= 1) {
          if (!isClosing) setConnectionState('disconnected');
        }
      },
      onCallEnded: () => {
        // Prevent red screen, assume End Call flow
        soundService.stopAll();
        if (!isClosing) onEnd();
      },
      onPeerVideoToggle: (enabled) => {
        setRemoteVideoEnabled(enabled);
      },
      onPeerDisconnected: () => {
        if (!isClosing) setConnectionState('disconnected');
      }
    });

    // Monitor Remote Video Track Mute State
    const checkVideoTrack = () => {
      const remoteStream = webrtcService.getRemoteStreamRef();
      if (remoteStream) {
        const videoTrack = remoteStream.getVideoTracks()[0];
        if (videoTrack) {
          setRemoteVideoEnabled(videoTrack.enabled && !videoTrack.muted);
          videoTrack.onmute = () => setRemoteVideoEnabled(false);
          videoTrack.onunmute = () => setRemoteVideoEnabled(true);
        } else {
          setRemoteVideoEnabled(false);
        }
      }
    };
    const interval = setInterval(checkVideoTrack, 1000);
    checkVideoTrack();
    return () => clearInterval(interval);
  }, [onEnd, peers.size, isClosing]);

  // Duration timer
  useEffect(() => {
    if (connectionState !== 'connected') return;
    const interval = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(interval);
  }, [connectionState]);

  // Immersive Mode Logic
  const resetInteraction = useCallback(() => {
    setShowUI(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setShowUI(false), 3000);
  }, []);

  const toggleUI = useCallback((e: React.MouseEvent) => {
    if (showUI) {
      setShowUI(false);
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    } else {
      resetInteraction();
    }
  }, [showUI, resetInteraction]);

  const handleMouseMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') {
      resetInteraction();
    }
  };

  useEffect(() => {
    resetInteraction();
    return () => { if (hideTimeout.current) clearTimeout(hideTimeout.current); }
  }, [resetInteraction]);

  // Load saved camera settings
  useEffect(() => {
    const savedHd = localStorage.getItem('veocall_hd') === 'true';
    const savedFps = localStorage.getItem('veocall_fps60') === 'true';

    if (savedHd || savedFps) {
      setCameraConfig({ hd: savedHd, fps60: savedFps });
      // Apply with slight delay to ensure stream readiness or just trigger
      webrtcService.setVideoQuality(savedHd, savedFps).catch(console.error);
    }
  }, []);

  // Gestures
  const handleSwipe = (event: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100 && Math.abs(info.velocity.x) > 500) {
      webrtcService.switchCamera();
      resetInteraction();
    }
  };

  // Double Tap Handler for PiP
  const handlePipDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
      setIsSwapped(!isSwapped);
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
    }
  };

  const copyInviteLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/video/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleMute = () => {
    const muted = webrtcService.toggleMute();
    setIsMuted(muted);
    resetInteraction();
  };

  const toggleVideo = () => {
    const off = webrtcService.toggleVideo();
    setIsVideoOn(!off);
    resetInteraction();
  };

  const switchCamera = () => {
    webrtcService.switchCamera();
    resetInteraction();
  };

  const handleCameraSettingsChange = async (newSettings: { hd: boolean, fps60: boolean }) => {
    setCameraConfig(newSettings);
    await webrtcService.setVideoQuality(newSettings.hd, newSettings.fps60);
    localStorage.setItem('veocall_hd', String(newSettings.hd));
    localStorage.setItem('veocall_fps60', String(newSettings.fps60));
    resetInteraction();
  };

  const handleRemoteCameraSwitch = async () => {
    await webrtcService.requestRemoteCameraSwitch();
    setShowSettingsDrawer(false); // Close drawer after request
    // Maybe show a toast/notification?
  };

  const toggleSystemPiP = async () => {
    try {
      // Find remote video (usually the one not mirrored)
      // Note: If swapped, remote might be in PiP or Fullscreen.
      // We prefer remote video for System PiP.
      const videos = Array.from(document.querySelectorAll('video'));
      const remoteVideo = videos.find(v => !v.classList.contains('mirror-mode'));

      if (remoteVideo && document.pictureInPictureElement !== remoteVideo) {
        await remoteVideo.requestPictureInPicture();
      } else if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      setShowSettingsDrawer(false);
    } catch (e) {
      console.error("PiP failed", e);
    }
  };

  const peerList = Array.from(peers.values());
  const hasPeers = peerList.length > 0;

  // Determine Streams
  let mainStream: MediaStream | null = null;
  let pipStream: MediaStream | null = null;
  let mainUsername = "You";
  let pipUsername = "You";
  let mainIsLocal = true;
  let pipIsLocal = true;

  if (!hasPeers) {
    mainStream = localStream;
    mainIsLocal = true;
  } else {
    if (!isSwapped) {
      mainStream = peerList[0].stream;
      mainUsername = peerList[0].username;
      mainIsLocal = false;
      pipStream = localStream;
      pipUsername = "You";
      pipIsLocal = true;
    } else {
      mainStream = localStream;
      mainUsername = "You";
      mainIsLocal = true;
      pipStream = peerList[0].stream;
      pipUsername = peerList[0].username;
      pipIsLocal = false;
    }
  }

  // Ping Badge Component
  const PingBadge = ({ isLocal, size = 'normal' }: { isLocal: boolean, size?: 'normal' | 'small' }) => (
    <div className={cn(
      "flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full shadow-lg",
      size === 'small' ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-1 text-xs"
    )}>
      <Activity className={cn("text-pink-500", size === 'small' ? "w-2 h-2" : "w-3 h-3")} />
      <span className="font-mono font-medium text-white/90">
        {networkStats.ping}ms
      </span>
    </div>
  );

  // CALL ENDED SCREEN
  if (showCallEnded) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-900 to-black z-50 flex flex-col items-center justify-center text-white relative p-6">
        {/* Duration at Top */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-12 left-0 right-0 text-center"
        >
          <p className="text-sm font-medium text-white/50 uppercase tracking-widest mb-1">Call Duration</p>
          <p className="text-4xl font-mono font-bold text-white/90">
            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mb-8"
        >
          <PhoneOff className="w-12 h-12 text-red-500" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold mb-8"
        >
          Call Ended
        </motion.h1>

        <Button onClick={onEnd} variant="secondary" className="rounded-full px-8 py-6 text-lg">
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 overflow-hidden touch-none"
      onPointerMove={handleMouseMove}
      onClick={toggleUI}
    >
      <ConnectionOverlay />
      <CallStatusBar
        show={showUI}
        duration={duration}
        ping={networkStats.ping}
        quality="HD"
      />

      {/* CONNECTION STATE OVERLAYS */}
      <AnimatePresence>
        {connectionState === 'connecting' && !hasPeers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="text-center text-white pointer-events-auto">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-xl font-semibold mb-6">Connecting...</p>
              <p className="text-sm text-white/50 mb-4">Share the link to invite someone</p>
              <div
                className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl cursor-pointer hover:bg-black/80 transition-all border border-white/10 shadow-lg mx-auto max-w-xs"
                onClick={copyInviteLink}
              >
                <Link2 className="w-5 h-5 text-primary" />
                <span className="font-mono text-lg tracking-wider">{roomId}</span>
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 opacity-70" />}
              </div>
              <Button variant="ghost" className="mt-4 text-white/50 hover:text-white" onClick={(e) => { e.stopPropagation(); setShowQRCode(true); }}>
                <QrCode className="w-4 h-4 mr-2" /> Show QR Code
              </Button>
            </div>
          </motion.div>
        )}

        {connectionState === 'disconnected' && !isClosing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center text-white p-8 rounded-2xl bg-black/50 border border-white/10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                <PhoneOff className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-xl font-semibold mb-2">Reconnecting...</p>
              <p className="text-white/50 text-sm mb-6">Call will auto-end in 5 minutes if not restored</p>
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={onEnd} className="rounded-full">
                  End Call
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT LAYER */}
      <motion.div
        className="absolute inset-0 z-0 bg-zinc-900"
        onPanEnd={handleSwipe}
      >
        {/* Fullscreen Video */}
        {mainStream && (
          <>
            <video
              key={mainStream.id}
              autoPlay playsInline muted={mainIsLocal}
              className={cn("w-full h-full object-contain bg-black", mainIsLocal && "mirror-mode")}
              ref={el => { if (el && el.srcObject !== mainStream) el.srcObject = mainStream; }}
            />
            {/* Remote Video Placeholder (in Main if remote is here) */}
            {!mainIsLocal && !remoteVideoEnabled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10">
                <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mb-4 animate-pulse">
                  <div className="text-3xl font-bold text-white/50">
                    <Users className="w-12 h-12" />
                  </div>
                </div>
                <p className="text-white/50 text-lg font-medium">Camera Off</p>
              </div>
            )}
            {/* Fullscreen Ping Badge - Top Left */}
            <div className="absolute top-4 left-4 z-20">
              <PingBadge isLocal={mainIsLocal} />
            </div>
            {/* Fullscreen Username - Bottom Left */}
            <div className={cn("absolute bottom-24 left-4 z-20 transition-opacity duration-300", showUI ? "opacity-100" : "opacity-0")}>
              <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-lg">
                {mainUsername}
              </div>
            </div>
          </>
        )}

        {/* Waiting Overlay */}
        {!hasPeers && connectionState !== 'connecting' && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-4 text-center z-10 animate-fade-in">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6 animate-pulse" onClick={(e) => e.stopPropagation()}>
              <Users className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-2 drop-shadow-md">Waiting for others...</h2>
            <div
              className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl cursor-pointer hover:bg-black/80 transition-all border border-white/10 shadow-lg mt-8"
              onClick={copyInviteLink}
            >
              <Link2 className="w-5 h-5 text-primary" />
              <span className="font-mono text-lg tracking-wider">{roomId}</span>
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 opacity-70" />}
            </div>
            <Button variant="ghost" className="mt-4 text-white/50 hover:text-white" onClick={(e) => { e.stopPropagation(); setShowQRCode(true); }}>
              <QrCode className="w-4 h-4 mr-2" /> Show QR
            </Button>
          </div>
        )}
      </motion.div>

      {/* PiP LAYER */}
      <AnimatePresence>
        {hasPeers && pipStream && (
          <motion.div
            drag
            dragConstraints={containerRef}
            dragMomentum={false}
            dragElastic={0.1}
            initial={{ x: window.innerWidth - 140, y: window.innerHeight - 240, scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileTap={{ scale: 0.95 }}
            className="absolute w-[100px] h-[150px] md:w-[140px] md:h-[210px] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-40 bg-zinc-800 touch-none cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            onClick={handlePipDoubleTap}
          >
            <video
              key={pipStream.id}
              autoPlay playsInline muted={pipIsLocal}
              className={cn("w-full h-full object-cover", pipIsLocal && "mirror-mode")}
              ref={el => { if (el && el.srcObject !== pipStream) el.srcObject = pipStream; }}
            />
            {/* Remote Video Placeholder (in PiP if remote is here) */}
            {!pipIsLocal && !remoteVideoEnabled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-800 z-10">
                <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center mb-1">
                  <div className="text-sm font-bold text-white/50">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )}
            {/* PiP Ping Badge - Toggle with UI */}
            <div className={cn("absolute top-1 left-1 z-10 transition-opacity duration-300", showUI ? "opacity-100" : "opacity-0")}>
              <PingBadge isLocal={pipIsLocal} size="small" />
            </div>
            {/* PiP Username - Toggle with UI */}
            <div className={cn("absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[9px] font-bold text-white/90 uppercase tracking-wider transition-opacity duration-300", showUI ? "opacity-100" : "opacity-0")}>
              {pipUsername}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM CONTROLS */}
      <motion.div
        animate={{ y: showUI ? 0 : 120 }}
        transition={{ type: 'spring', damping: 20 }}
        className="absolute bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none"
      >
        <div
          className="pointer-events-auto bg-black/40 backdrop-blur-2xl rounded-full p-2 px-4 md:px-6 flex items-center gap-3 md:gap-6 shadow-2xl border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg hover:scale-110 transition-transform"
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
          </Button>

          <Button
            variant={!isVideoOn ? "destructive" : "secondary"}
            size="icon"
            className="w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg hover:scale-110 transition-transform"
            onClick={toggleVideo}
          >
            {!isVideoOn ? <VideoOff className="w-5 h-5 md:w-6 md:h-6" /> : <Video className="w-5 h-5 md:w-6 md:h-6" />}
          </Button>

          {/* Switch Camera Button */}
          <Button
            variant="secondary"
            size="icon"
            className="w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg hover:scale-110 transition-transform"
            onClick={switchCamera}
          >
            <SwitchCamera className="w-5 h-5 md:w-6 md:h-6" />
          </Button>

          {/* Audio Output Button */}
          <Button
            variant="secondary"
            size="icon"
            className="w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg hover:scale-110 transition-transform"
            onClick={() => { setShowAudioDrawer(true); resetInteraction(); }}
          >
            <Volume2 className="w-5 h-5 md:w-6 md:h-6" />
          </Button>

          {/* Settings Button */}
          <Button
            variant="secondary"
            size="icon"
            className="w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg hover:scale-110 transition-transform"
            onClick={() => { setShowSettingsDrawer(true); resetInteraction(); }}
          >
            <Settings2 className="w-5 h-5 md:w-6 md:h-6" />
          </Button>

          <div className="w-px h-8 bg-white/20 mx-1" />

          <Button
            variant="destructive"
            size="icon"
            className="w-14 h-14 md:w-16 md:h-16 rounded-full shadow-xl hover:scale-110 transition-transform bg-gradient-to-tr from-red-600 to-red-500"
            onClick={() => { setIsClosing(true); onEnd(); }}
          >
            <Phone className="w-6 h-6 md:w-8 md:h-8 rotate-[135deg]" />
          </Button>
        </div>
      </motion.div>

      {/* QR Modal */}
      <AnimatePresence>
        {showQRCode && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-6"
            onClick={(e) => { e.stopPropagation(); setShowQRCode(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-black tracking-tight">Scan to Join</h3>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5" onClick={() => setShowQRCode(false)}><X className="w-6 h-6 text-black" /></Button>
              </div>
              <div className="flex justify-center p-4 bg-gray-50 rounded-2xl mb-4 border border-gray-100"><QRCodeSVG value={window.location.href} size={220} /></div>
              <p className="text-center font-mono mt-2 text-xl font-bold text-black/80 tracking-widest">{roomId}</p>
              <p className="text-center text-xs text-gray-400 mt-4 uppercase font-semibold tracking-wider">Share this code</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AudioOutputDrawer
        isOpen={showAudioDrawer}
        onClose={() => setShowAudioDrawer(false)}
      />

      <CameraSettingsDrawer
        isOpen={showSettingsDrawer}
        onClose={() => setShowSettingsDrawer(false)}
        currentSettings={cameraConfig}
        onSettingsChange={handleCameraSettingsChange}
        onTogglePiP={toggleSystemPiP}
        onRequestRemoteSwitch={handleRemoteCameraSwitch}
      />
    </div>
  );
};

export default VideoCallScreen;
