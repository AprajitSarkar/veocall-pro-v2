import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebaseConfig';
import { ref, set, get, remove } from 'firebase/database';

interface UISettings {
    buttonStyle: 'filled' | 'tonal' | 'outlined' | 'elevated';
    buttonRadius: 'square' | 'rounded' | 'pill';
    accentColor: 'cyan' | 'blue' | 'purple' | 'green' | 'orange';
    showSignalStrength: boolean;
    showSpeed: boolean;
    showPing: boolean;
    showQuality: boolean;
}

export interface CallHistoryItem {
    id: string;
    username: string;
    roomId?: string;
    type: 'audio' | 'video';
    direction: 'incoming' | 'outgoing';
    status: 'received' | 'missed' | 'declined';
    duration: number;
    timestamp: Date;
    isGroup?: boolean;
    participants?: string[];
}

interface User {
    username: string;
    email?: string;
    hasPassword: boolean;
    videoQuality: 'auto' | '4k' | '1080p' | '720p' | '480p';
    frameRate: 'auto' | '60' | '30' | '24';
    audioQuality: 'high' | 'medium' | 'low';
    dataSaving: boolean;
    showUsername: boolean;
    audioPrivacy: 'everyone' | 'recent' | 'selected';
    videoPrivacy: 'everyone' | 'contacts' | 'none';
    allowedUsers: string[];
    uiSettings: UISettings;
    pinnedUsers: string[];
    callPrivacy: 'everyone' | 'none' | 'recent' | 'selected';
}

export interface NetworkStats {
    ping: number;
    downloadSpeed: number;
    uploadSpeed: number;
    signalBars: number;
    quality: 'HD' | 'SD' | 'LD';
}

interface AppContextType {
    user: User | null;
    isLoggedIn: boolean;
    isInitialized: boolean;
    networkStatus: 'online' | 'offline' | 'server-down';
    networkStats: NetworkStats;
    callHistory: CallHistoryItem[];
    currentParticipant: string | null;
    login: (username: string, password?: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
    setPassword: (password: string) => void;
    removePassword: () => void;
    deleteAccount: () => Promise<void>;
    addCallToHistory: (call: Omit<CallHistoryItem, 'id' | 'timestamp'>) => void;
    setCurrentParticipant: (name: string | null) => void;
    checkUsernameExists: (username: string) => Promise<boolean>;
    searchUsers: (query: string) => Promise<{ username: string; isOnline: boolean }[]>;
    pinnedUsers: string[];
    pinUser: (username: string) => void;
    unpinUser: (username: string) => void;
    requestNotificationPermission: () => Promise<boolean>;
    showCallNotification: (caller: string, type: 'audio' | 'video') => void;
    checkDeviceRecognized: (username: string) => Promise<boolean>;
    getOnlineUsers: () => Promise<Record<string, boolean>>;
    loginWithDevice: (username: string) => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultUISettings: UISettings = {
    buttonStyle: 'filled',
    buttonRadius: 'rounded',
    accentColor: 'cyan',
    showSignalStrength: true,
    showSpeed: true,
    showPing: true,
    showQuality: true,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'server-down'>('online');
    const [networkStats, setNetworkStats] = useState<NetworkStats>({
        ping: 45, downloadSpeed: 2.5, uploadSpeed: 1.2, signalBars: 4, quality: 'HD',
    });
    const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
    const [currentParticipant, setCurrentParticipant] = useState<string | null>(null);
    const [pinnedUsers, setPinnedUsers] = useState<string[]>([]);

    // Device fingerprint helper
    const getDeviceFingerprint = useCallback((): string => {
        const nav = navigator;
        const screen = window.screen;
        const data = [
            nav.userAgent,
            nav.language,
            screen.width + 'x' + screen.height,
            screen.colorDepth,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            nav.hardwareConcurrency || 0
        ].join('|');
        // Simple hash
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            hash = ((hash << 5) - hash) + data.charCodeAt(i);
            hash |= 0;
        }
        return hash.toString(16);
    }, []);

    useEffect(() => {
        const savedUser = localStorage.getItem('veocall_user');
        if (savedUser) {
            try {
                const parsed = JSON.parse(savedUser);
                parsed.uiSettings = { ...defaultUISettings, ...parsed.uiSettings };
                setUser(parsed);
            } catch (e) { console.error('Failed to parse saved user', e); }
        }
        const savedHistory = localStorage.getItem('veocall_history');
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                // Prune to 10 entries
                const pruned = parsed.slice(0, 10);
                setCallHistory(pruned.map((item: any) => ({ ...item, timestamp: new Date(item.timestamp) })));
            } catch (e) { console.error('Failed to parse call history', e); }
        }
        // Load pinned users
        const savedPinned = localStorage.getItem('veocall_pinned');
        if (savedPinned) {
            try { setPinnedUsers(JSON.parse(savedPinned)); } catch (e) { /* ignore */ }
        }
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (user?.username) {
            const syncData = async () => {
                try {
                    const snap = await get(ref(database, `users/${user.username.toLowerCase()}`));
                    if (snap.exists()) {
                        const data = snap.val();
                        if (data.history) {
                            const historyList: CallHistoryItem[] = Object.values(data.history);
                            historyList.sort((a, b) => new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime());
                            setCallHistory(historyList.map(h => ({ ...h, timestamp: new Date(h.timestamp as any) })));
                            localStorage.setItem('veocall_history', JSON.stringify(historyList));
                        }
                    }
                } catch (e) { console.error("Sync error", e); }
            };
            syncData();
        }
    }, [user?.username]);

    useEffect(() => {
        const handleOnline = () => setNetworkStatus('online');
        const handleOffline = () => setNetworkStatus('offline');
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        if (!navigator.onLine) setNetworkStatus('offline');
        const statsInterval = setInterval(() => {
            setNetworkStats({ ping: 30 + Math.floor(Math.random() * 50), downloadSpeed: 2.0, uploadSpeed: 1.0, signalBars: 4, quality: 'HD' });
        }, 2000);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(statsInterval);
        };
    }, []);

    const checkUsernameExists = useCallback(async (username: string): Promise<boolean> => {
        try {
            const snapshot = await get(ref(database, `users/${username.toLowerCase()}`));
            return snapshot.exists();
        } catch { return false; }
    }, []);

    const searchUsers = useCallback(async (queryStr: string): Promise<{ username: string; isOnline: boolean }[]> => {
        if (!queryStr || queryStr.length < 2) return [];
        try {
            const snapshot = await get(ref(database, 'users'));
            if (!snapshot.exists()) return [];
            const users = snapshot.val();
            const now = Date.now();
            const TWO_MINUTES = 2 * 60 * 1000;

            return Object.keys(users)
                .filter(u => u.toLowerCase().includes(queryStr.toLowerCase()))
                .slice(0, 10)
                .map(username => ({
                    username,
                    isOnline: users[username].lastSeen ? (now - users[username].lastSeen < TWO_MINUTES) : false
                }));
        } catch { return []; }
    }, []);

    const login = useCallback(async (username: string, password?: string): Promise<{ success: boolean; error?: string }> => {
        const userId = username.toLowerCase();
        const userRef = ref(database, `users/${userId}`);
        try {
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                const userData = snapshot.val();
                if (userData.password) {
                    if (!password) return { success: false, error: 'Password required' };
                    if (userData.password !== password) return { success: false, error: 'Invalid password' };
                }
                const updates: any = { lastSeen: Date.now() };
                updates.deviceId = getDeviceFingerprint();

                // Update IP
                try {
                    const ipRes = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipRes.json();
                    updates.lastIP = ipData.ip;
                } catch { /* ignore */ }

                await set(ref(database, `users/${userId}/lastSeen`), updates.lastSeen);
                await set(ref(database, `users/${userId}/deviceId`), updates.deviceId);
                if (updates.lastIP) await set(ref(database, `users/${userId}/lastIP`), updates.lastIP);

            } else {
                await set(userRef, { username, password: password || null, createdAt: Date.now(), lastSeen: Date.now() });
            }
            const newUser: User = {
                username,
                hasPassword: !!password || (snapshot.exists() && !!snapshot.val().password),
                videoQuality: 'auto', frameRate: 'auto', audioQuality: 'high',
                dataSaving: false, showUsername: true,
                audioPrivacy: 'everyone', videoPrivacy: 'everyone',
                allowedUsers: [], pinnedUsers: [],
                callPrivacy: 'everyone',
                uiSettings: defaultUISettings,
            };
            setUser(newUser);
            localStorage.setItem('veocall_user', JSON.stringify(newUser));
            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false, error: 'Network error' };
        }
    }, [getDeviceFingerprint]);

    const logout = useCallback(() => {
        setUser(null);
        setCallHistory([]);
        localStorage.removeItem('veocall_user');
        localStorage.removeItem('veocall_history');
    }, []);

    const updateUser = useCallback((updates: Partial<User>) => {
        setUser(prev => {
            if (!prev) return prev;
            const updatedUser = { ...prev, ...updates };
            localStorage.setItem('veocall_user', JSON.stringify(updatedUser));
            if (updatedUser.username) {
                set(ref(database, `users/${updatedUser.username.toLowerCase()}/settings`), {
                    videoQuality: updatedUser.videoQuality, uiSettings: updatedUser.uiSettings
                });
            }
            return updatedUser;
        });
    }, []);

    const setPassword = useCallback(async (password: string) => {
        if (user && password) {
            updateUser({ hasPassword: true });
            const userId = user.username.toLowerCase();
            await set(ref(database, `users/${userId}/password`), password);

            // Save device fingerprint
            const nav = navigator;
            const screen = window.screen;
            const data = [nav.userAgent, nav.language, screen.width + 'x' + screen.height, screen.colorDepth, Intl.DateTimeFormat().resolvedOptions().timeZone, nav.hardwareConcurrency || 0].join('|');
            let hash = 0;
            for (let i = 0; i < data.length; i++) { hash = ((hash << 5) - hash) + data.charCodeAt(i); hash |= 0; }
            await set(ref(database, `users/${userId}/deviceId`), hash.toString(16));

            // Save IP
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                await set(ref(database, `users/${userId}/lastIP`), ipData.ip);
            } catch { /* ignore */ }
        }
    }, [user, updateUser]);

    const removePassword = useCallback(async () => {
        if (user) {
            updateUser({ hasPassword: false });
            await remove(ref(database, `users/${user.username.toLowerCase()}/password`));
        }
    }, [user, updateUser]);

    const deleteAccount = useCallback(async () => {
        if (user) {
            await remove(ref(database, `users/${user.username.toLowerCase()}`));
            logout();
        }
    }, [user, logout]);

    const addCallToHistory = useCallback((call: Omit<CallHistoryItem, 'id' | 'timestamp'>) => {
        // Filter out "Participant" and empty host-only calls
        if (call.username === 'Participant' || call.username.toLowerCase() === 'participant') return;
        if (call.duration === 0 && call.direction === 'outgoing') return; // Host-only timeout

        const newCall: CallHistoryItem = { ...call, id: Date.now().toString(), timestamp: new Date() };
        setCallHistory(prev => {
            // Limit to 10 entries
            const updatedHistory = [newCall, ...prev.filter(c => c.username !== 'Participant')].slice(0, 10);
            localStorage.setItem('veocall_history', JSON.stringify(updatedHistory));
            if (user?.username) {
                const historyMap: Record<string, any> = {};
                updatedHistory.forEach(item => { historyMap[item.id] = { ...item, timestamp: item.timestamp.toISOString() }; });
                set(ref(database, `users/${user.username.toLowerCase()}/history`), historyMap);
            }
            return updatedHistory;
        });
    }, [user?.username]);

    const pinUser = useCallback((username: string) => {
        setPinnedUsers(prev => {
            if (prev.includes(username)) return prev;
            const updated = [...prev, username];
            localStorage.setItem('veocall_pinned', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const unpinUser = useCallback((username: string) => {
        setPinnedUsers(prev => {
            const updated = prev.filter(u => u !== username);
            localStorage.setItem('veocall_pinned', JSON.stringify(updated));
            return updated;
        });
    }, []);

    // Notification Permission
    const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') return true;
        const result = await Notification.requestPermission();
        return result === 'granted';
    }, []);

    // Show Call Notification
    const showCallNotification = useCallback((caller: string, type: 'audio' | 'video') => {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        try {
            new Notification(`Incoming ${type} call`, {
                body: `${caller} is calling you`,
                icon: '/vite.svg',
                tag: 'incoming-call',
                requireInteraction: true
            });
        } catch (e) { console.error('Notification error', e); }
    }, []);

    // Check if device is recognized for passwordless login
    const checkDeviceRecognized = useCallback(async (username: string): Promise<boolean> => {
        try {
            const snapshot = await get(ref(database, `users/${username.toLowerCase()}`));
            if (!snapshot.exists()) return false;
            const userData = snapshot.val();
            if (!userData.password) return false; // No password = no device check needed

            const currentDevice = getDeviceFingerprint();
            if (userData.deviceId === currentDevice) return true;

            // Check IP (fetch current IP)
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                if (userData.lastIP === ipData.ip) return true;
            } catch { /* ignore IP check failure */ }

            return false;
        } catch { return false; }
    }, [getDeviceFingerprint]);

    // Get online users status
    const getOnlineUsers = useCallback(async (): Promise<Record<string, boolean>> => {
        try {
            const snapshot = await get(ref(database, 'users'));
            if (!snapshot.exists()) return {};
            const users = snapshot.val();
            const now = Date.now();
            const TWO_MINUTES = 2 * 60 * 1000;
            const onlineMap: Record<string, boolean> = {};
            Object.keys(users).forEach(username => {
                onlineMap[username] = users[username].lastSeen ? (now - users[username].lastSeen < TWO_MINUTES) : false;
            });
            return onlineMap;
        } catch { return {}; }
    }, []);

    // Login with recognized device (no password)
    const loginWithDevice = useCallback(async (username: string): Promise<{ success: boolean; error?: string }> => {
        const isRecognized = await checkDeviceRecognized(username);
        if (!isRecognized) return { success: false, error: 'Device not recognized' };

        const userId = username.toLowerCase();
        const userRef = ref(database, `users/${userId}`);
        try {
            const snapshot = await get(userRef);
            if (!snapshot.exists()) return { success: false, error: 'User not found' };

            // Update lastSeen and device info
            await set(ref(database, `users/${userId}/lastSeen`), Date.now());
            await set(ref(database, `users/${userId}/deviceId`), getDeviceFingerprint());
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                await set(ref(database, `users/${userId}/lastIP`), ipData.ip);
            } catch { /* ignore */ }

            const userData = snapshot.val();
            const newUser: User = {
                username: userData.username || username,
                hasPassword: true,
                videoQuality: 'auto', frameRate: 'auto', audioQuality: 'high',
                dataSaving: false, showUsername: true,
                audioPrivacy: 'everyone', videoPrivacy: 'everyone', allowedUsers: [],
                callPrivacy: 'everyone',
                uiSettings: defaultUISettings,
                pinnedUsers: []
            };
            setUser(newUser);
            localStorage.setItem('veocall_user', JSON.stringify(newUser));
            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false, error: 'Network error' };
        }
    }, [checkDeviceRecognized, getDeviceFingerprint]);

    // Update lastSeen periodically
    useEffect(() => {
        if (!user?.username) return;
        const updateLastSeen = () => {
            set(ref(database, `users/${user.username.toLowerCase()}/lastSeen`), Date.now()).catch(() => { });
        };
        updateLastSeen(); // Immediate
        const interval = setInterval(updateLastSeen, 30000); // Every 30s
        return () => clearInterval(interval);
    }, [user?.username]);

    return (
        <AppContext.Provider value={{
            user, isLoggedIn: !!user, isInitialized,
            networkStatus, networkStats, callHistory, currentParticipant,
            login, logout, updateUser, setPassword, removePassword, deleteAccount,
            addCallToHistory, setCurrentParticipant, checkUsernameExists, searchUsers,
            pinnedUsers, pinUser, unpinUser,
            requestNotificationPermission, showCallNotification, checkDeviceRecognized, getOnlineUsers, loginWithDevice
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) throw new Error('useApp must be used within an AppProvider');
    return context;
};
