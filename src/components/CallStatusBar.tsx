import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Wifi, ArrowDown, ArrowUp, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import Counter from './ui/Counter';

interface CallStatusBarProps {
    show: boolean;
    duration: number;
    ping: number;
    quality?: 'HD' | 'SD' | 'Low';
}

const CallStatusBar: React.FC<CallStatusBarProps> = ({ show, duration, ping, quality = 'HD' }) => {
    const [stats, setStats] = useState({ down: 0, up: 0, signal: 4 });

    useEffect(() => {
        // Mock network fluctuations or read from navigator.connection
        const updateStats = () => {
            const conn = (navigator as any).connection;
            setStats({
                down: conn?.downlink || Math.random() * 10 + 5, // Mbps
                up: (conn?.downlink || 5) / 4, // Estimate upload
                signal: ping < 50 ? 4 : ping < 150 ? 3 : ping < 300 ? 2 : 1
            });
        };
        const interval = setInterval(updateStats, 2000);
        updateStats();
        return () => clearInterval(interval);
    }, [ping]);

    const formatDuration = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    return (
        <motion.div
            initial={{ y: -100 }}
            animate={{ y: show ? 0 : -100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 left-0 right-0 p-2 z-[60] pointer-events-none"
        >
            <div className="flex justify-between items-start">

                {/* Left: Activity */}
                <div className="flex flex-col items-start gap-1">
                    <div className="bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 text-white/90 shadow-sm border border-white/5">
                        <Activity className={cn("w-4 h-4 text-pink-500", ping < 100 ? "animate-pulse" : "")} />
                        <span className="text-xs font-mono font-medium">{ping}ms</span>
                    </div>
                </div>

                {/* Center: Quality & Duration */}
                <div className="bg-black/60 backdrop-blur-xl rounded-full px-4 py-1.5 flex items-center gap-3 text-white shadow-lg border border-white/10">
                    <span className="text-xs font-bold bg-white/20 px-1.5 py-0.5 rounded text-white/90">{quality}</span>
                    <div className="w-px h-3 bg-white/20" />
                    <div className="flex items-center gap-0.5 font-mono text-sm font-semibold tracking-wide">
                        <Counter value={Math.floor(duration / 60)} fontSize={14} padding={0} places={[10, 1]} gap={1} textColor="white" gradientHeight={0} />
                        <span className="mx-0.5 text-white">:</span>
                        <Counter value={duration % 60} fontSize={14} padding={0} places={[10, 1]} gap={1} textColor="white" gradientHeight={0} />
                    </div>
                </div>

                {/* Right: Signal & Speed */}
                <div className="flex flex-col items-end gap-1">
                    <div className="bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-3 text-white/90 shadow-sm border border-white/5">
                        {/* Signal Bars */}
                        <div className="flex items-end gap-[2px] h-3">
                            {[1, 2, 3, 4].map(bar => (
                                <div key={bar} className={cn("w-1 rounded-sm transition-all duration-500",
                                    bar <= stats.signal ? "bg-white" : "bg-white/20",
                                    bar === 1 ? "h-1.5" : bar === 2 ? "h-2" : bar === 3 ? "h-2.5" : "h-3"
                                )} />
                            ))}
                        </div>
                        {/* Speeds */}
                        <div className="flex flex-col text-[9px] leading-tight font-mono text-white/70">
                            <span className="flex items-center gap-0.5"><ArrowDown className="w-2.5 h-2.5" />{stats.down.toFixed(1)}</span>
                            <span className="flex items-center gap-0.5"><ArrowUp className="w-2.5 h-2.5" />{stats.up.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default CallStatusBar;
