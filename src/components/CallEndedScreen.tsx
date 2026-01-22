import React from 'react';
import { Button } from '@/components/ui/button';
import { Home, Clock } from 'lucide-react';

interface CallEndedScreenProps {
    duration: number;
    onHome: () => void;
    remoteUsername?: string;
}

const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
};

const CallEndedScreen: React.FC<CallEndedScreenProps> = ({ duration, onHome, remoteUsername }) => {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mb-6 shadow-2xl border border-white/10">
                <Clock className="w-10 h-10 text-white/80" />
            </div>

            <h1 className="text-3xl font-bold text-white mb-2">Call Ended</h1>
            {remoteUsername && <p className="text-white/50 mb-6">with {remoteUsername}</p>}

            <div className="bg-zinc-900/50 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/5 mb-10">
                <p className="text-white/40 text-sm uppercase tracking-widest font-bold mb-1">Duration</p>
                <p className="text-4xl font-mono font-bold text-white tabular-nums tracking-tight text-glow">
                    {formatDuration(duration)}
                </p>
            </div>

            <Button size="lg" className="rounded-full px-8 h-14 text-lg font-medium shadow-xl hover:scale-105 transition-transform" onClick={onHome}>
                <Home className="w-5 h-5 mr-2" />
                Back to Home
            </Button>
        </div>
    );
};

export default CallEndedScreen;
