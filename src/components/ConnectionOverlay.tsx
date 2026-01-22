import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, ServerOff, CheckCircle } from 'lucide-react';
import { database } from '@/lib/firebaseConfig';
import { ref, onValue } from 'firebase/database';

const ConnectionOverlay: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isServerConnected, setIsServerConnected] = useState(true);
    const [showRestored, setShowRestored] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            if (isServerConnected) {
                setShowRestored(true);
                setTimeout(() => setShowRestored(false), 3000);
            }
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Firebase Connection
        const connectedRef = ref(database, '.info/connected');
        const unsub = onValue(connectedRef, (snap) => {
            const connected = snap.val() === true;
            setIsServerConnected(connected);
            if (connected && !isServerConnected) { // If just reconnected
                setShowRestored(true);
                setTimeout(() => setShowRestored(false), 3000);
            }
        });

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            unsub();
        }
    }, [isServerConnected]);

    return (
        <div className="pointer-events-none z-[80]">
            <AnimatePresence>
                {/* 1. YOU ARE OFFLINE */}
                {!isOnline && (
                    <motion.div
                        initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                        className="fixed top-0 left-0 right-0 bg-red-600 z-[90] overflow-hidden"
                    >
                        <div className="w-full text-center text-white text-xs font-bold py-1 uppercase tracking-widest shadow-lg">
                            You are offline
                        </div>
                    </motion.div>
                )}

                {/* 2. SERVER OFFLINE */}
                {isOnline && !isServerConnected && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="fixed top-0 left-0 right-0 z-[85] flex flex-col items-center pt-16 pointer-events-none"
                    >
                        <div className="bg-red-500/90 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3 text-white shadow-xl">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span className="text-sm font-medium">Connecting to server...</span>
                        </div>
                    </motion.div>
                )}

                {/* 3. RESTORED */}
                {showRestored && (
                    <motion.div
                        initial={{ y: -50, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[85]"
                    >
                        <div className="bg-green-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-bold">Service Online</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ConnectionOverlay;
