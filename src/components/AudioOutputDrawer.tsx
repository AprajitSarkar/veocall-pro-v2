import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Smartphone, Speaker, Headphones, X, Check, Bluetooth } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AudioDevice {
    deviceId: string;
    label: string;
    kind: 'earpiece' | 'speaker' | 'headphone' | 'bluetooth' | 'default';
}

interface AudioOutputDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    videoRef?: React.RefObject<HTMLVideoElement>;
}

const AudioOutputDrawer: React.FC<AudioOutputDrawerProps> = ({ isOpen, onClose, videoRef }) => {
    const [devices, setDevices] = useState<AudioDevice[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<string>('default');
    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        const loadDevices = async () => {
            try {
                // Check if setSinkId is supported
                const testAudio = document.createElement('audio');
                if (typeof (testAudio as any).setSinkId !== 'function') {
                    setIsSupported(false);
                    // Fallback devices for UI
                    setDevices([
                        { deviceId: 'default', label: 'Phone Speaker', kind: 'speaker' },
                    ]);
                    return;
                }

                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const audioOutputs = allDevices
                    .filter(d => d.kind === 'audiooutput')
                    .map(d => ({
                        deviceId: d.deviceId,
                        label: d.label || `Audio Output ${d.deviceId.slice(0, 4)}`,
                        kind: categorizeDevice(d.label) as AudioDevice['kind']
                    }));

                if (audioOutputs.length === 0) {
                    setDevices([{ deviceId: 'default', label: 'Default Speaker', kind: 'speaker' }]);
                } else {
                    setDevices(audioOutputs);
                }
            } catch (e) {
                console.error('Failed to enumerate devices:', e);
                setDevices([{ deviceId: 'default', label: 'Phone Speaker', kind: 'speaker' }]);
            }
        };

        if (isOpen) {
            loadDevices();
        }
    }, [isOpen]);

    const categorizeDevice = (label: string): string => {
        const lower = label.toLowerCase();
        if (lower.includes('headphone') || lower.includes('earphone')) return 'headphone';
        if (lower.includes('bluetooth') || lower.includes('airpod') || lower.includes('wireless')) return 'bluetooth';
        if (lower.includes('earpiece') || lower.includes('phone')) return 'earpiece';
        return 'speaker';
    };

    const getIcon = (kind: string) => {
        switch (kind) {
            case 'earpiece': return <Smartphone className="w-5 h-5" />;
            case 'headphone': return <Headphones className="w-5 h-5" />;
            case 'bluetooth': return <Bluetooth className="w-5 h-5" />;
            default: return <Speaker className="w-5 h-5" />;
        }
    };

    const selectDevice = async (deviceId: string) => {
        setSelectedDevice(deviceId);

        if (!isSupported) {
            onClose();
            return;
        }

        try {
            // Try to set on any audio/video elements
            const mediaElements = document.querySelectorAll('audio, video');
            for (const el of mediaElements) {
                if (typeof (el as any).setSinkId === 'function') {
                    await (el as any).setSinkId(deviceId);
                }
            }
        } catch (e) {
            console.error('Failed to set audio output:', e);
        }

        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[80]"
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-zinc-900 rounded-t-3xl z-[85] shadow-2xl border-t border-white/10 max-h-[70vh] overflow-hidden"
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-white/20 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
                            <h2 className="text-lg font-bold text-white">Select Audio Output</h2>
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-white/50 hover:text-white">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Device List */}
                        <div className="p-4 space-y-2 overflow-y-auto max-h-[50vh]">
                            {/* This Phone Section */}
                            <p className="text-xs uppercase text-white/40 font-semibold tracking-wider px-2 mb-2">This Device</p>

                            {devices.map(device => (
                                <motion.div
                                    key={device.deviceId}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => selectDevice(device.deviceId)}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors",
                                        selectedDevice === device.deviceId
                                            ? "bg-primary/20 border border-primary/30"
                                            : "bg-white/5 hover:bg-white/10 border border-transparent"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center",
                                        selectedDevice === device.deviceId ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/70"
                                    )}>
                                        {getIcon(device.kind)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-medium">{device.label}</p>
                                        <p className="text-xs text-white/40 capitalize">{device.kind}</p>
                                    </div>
                                    {selectedDevice === device.deviceId && (
                                        <Check className="w-5 h-5 text-primary" />
                                    )}
                                </motion.div>
                            ))}

                            {!isSupported && (
                                <p className="text-xs text-white/30 text-center mt-4 px-4">
                                    Audio output selection is not fully supported on this browser. The system will use the default audio output.
                                </p>
                            )}
                        </div>

                        {/* Safe Area Padding */}
                        <div className="h-8" />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AudioOutputDrawer;
