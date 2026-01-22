import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, X, Check, Gauge, Zap, Layers, PictureInPicture, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface CameraSettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    currentSettings: { hd: boolean; fps60: boolean };
    onSettingsChange: (settings: { hd: boolean; fps60: boolean }) => void;
    onTogglePiP: () => void;
    onRequestRemoteSwitch: () => void;
}

const CameraSettingsDrawer: React.FC<CameraSettingsDrawerProps> = ({
    isOpen, onClose, currentSettings, onSettingsChange, onTogglePiP, onRequestRemoteSwitch
}) => {

    // Local state for immediate feedback
    const [settings, setSettings] = useState(currentSettings);

    useEffect(() => {
        setSettings(currentSettings);
    }, [currentSettings]);

    const handleToggle = (key: 'hd' | 'fps60') => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);
        onSettingsChange(newSettings);
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
                        className="fixed bottom-0 left-0 right-0 bg-zinc-900 rounded-t-3xl z-[85] shadow-2xl border-t border-white/10 max-h-[70vh]"
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-white/20 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
                            <h2 className="text-lg font-bold text-white">Camera & Display</h2>
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-white/50 hover:text-white">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Settings List */}
                        <div className="p-6 space-y-6">

                            {/* Quality Settings */}
                            <div className="space-y-4">
                                <h3 className="text-xs uppercase text-white/40 font-semibold tracking-wider mb-2">Video Quality</h3>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                                            <Gauge className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">Full HD Quality</p>
                                            <p className="text-xs text-white/50">Maximize resolution (1080p)</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.hd}
                                        onCheckedChange={() => handleToggle('hd')}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">60 FPS Mode</p>
                                            <p className="text-xs text-white/50">Smoother motion (High CPU)</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.fps60}
                                        onCheckedChange={() => handleToggle('fps60')}
                                    />
                                </div>
                            </div>

                            {/* Display Settings */}
                            <div className="space-y-4">
                                <h3 className="text-xs uppercase text-white/40 font-semibold tracking-wider mb-2">Display Mode</h3>

                                <div
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                                    onClick={onTogglePiP}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                                            <PictureInPicture className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">System PiP Mode</p>
                                            <p className="text-xs text-white/50">Keep video playing over other apps</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-white/60">
                                        Open
                                    </Button>
                                </div>
                            </div>

                            {/* Remote Control */}
                            <div className="space-y-4">
                                <h3 className="text-xs uppercase text-white/40 font-semibold tracking-wider mb-2">Remote Control</h3>

                                <div
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                                    onClick={onRequestRemoteSwitch}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                                            <SwitchCamera className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">Switch Remote Camera</p>
                                            <p className="text-xs text-white/50">Flip the other person's camera</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-white/60">
                                        Flip
                                    </Button>
                                </div>
                            </div>


                        </div>

                        {/* Safe Area Padding */}
                        <div className="h-8" />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CameraSettingsDrawer;
