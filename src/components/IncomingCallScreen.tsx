import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import soundService from '@/lib/soundService';

interface IncomingCallScreenProps {
  callerName: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallScreen: React.FC<IncomingCallScreenProps> = ({
  callerName,
  callType,
  onAccept,
  onReject,
}) => {
  // Play ringtone + vibration on mount
  useEffect(() => {
    soundService.playRingtone();
    return () => {
      soundService.stopRingtone();
    };
  }, []);

  const handleAccept = () => {
    soundService.stopRingtone();
    onAccept();
  };

  const handleReject = () => {
    soundService.stopRingtone();
    onReject();
  };

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-lg z-50 flex flex-col items-center justify-center animate-fade-in">
      {/* Caller Avatar */}
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center animate-pulse-glow">
          <span className="text-5xl font-bold text-foreground">
            {callerName.charAt(0).toUpperCase()}
          </span>
        </div>
        {/* Pulse rings */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse-ring" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
        <div className="absolute inset-0 rounded-full border-2 border-primary/10 animate-pulse-ring" style={{ animationDelay: '1s' }} />
      </div>

      {/* Caller Info */}
      <h2 className="text-2xl font-bold mb-2 animate-slide-up">{callerName}</h2>
      <div className="flex items-center gap-2 text-muted-foreground mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {callType === 'video' ? (
          <>
            <Video className="w-5 h-5 text-primary" />
            <span>Incoming Video Call</span>
          </>
        ) : (
          <>
            <Phone className="w-5 h-5 text-primary" />
            <span>Incoming Audio Call</span>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <Button
          variant="destructive"
          size="icon"
          onClick={handleReject}
          className="w-18 h-18 rounded-full shadow-lg animate-bounce-subtle"
          style={{ width: 72, height: 72 }}
        >
          <PhoneOff className="w-8 h-8" />
        </Button>

        <Button
          size="icon"
          onClick={handleAccept}
          className={cn(
            'rounded-full shadow-glow gradient-primary animate-bounce-subtle',
          )}
          style={{ width: 72, height: 72, animationDelay: '0.3s' }}
        >
          {callType === 'video' ? (
            <Video className="w-8 h-8" />
          ) : (
            <Phone className="w-8 h-8" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default IncomingCallScreen;
