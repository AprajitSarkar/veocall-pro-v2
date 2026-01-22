import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Settings, Video, Phone, Link2, Copy, Check, Users, ChevronDown, QrCode, X, Search, Loader2, Pin, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp, CallHistoryItem } from '@/contexts/AppContext';
import soundService from '@/lib/soundService';
import NetworkStatus from '@/components/ui/NetworkStatus';
import { CallType } from '@/lib/webrtcService';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { QRCodeSVG } from 'qrcode.react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type HomeTab = 'create' | 'join' | 'recent' | 'search' | 'scan';

interface HomePageProps {
    onSettings: () => void;
    onCreateCall: (type: CallType, isDirect?: boolean) => void;
    onJoinRoom: (roomId: string) => void;
    onCallUser?: (username: string, type: CallType) => void;
    initialTab?: HomeTab;
    onTabChange?: (tab: HomeTab) => void;
}

const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
};

const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (days === 1) return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

interface GroupedCalls {
    username: string;
    calls: CallHistoryItem[];
    lastCall: CallHistoryItem;
    totalDuration: number;
}

const HomePage: React.FC<HomePageProps> = ({ onSettings, onCreateCall, onJoinRoom, onCallUser, initialTab = 'create', onTabChange }) => {
    const { user, callHistory, searchUsers, pinnedUsers, pinUser, unpinUser, login, logout, updateUser, getOnlineUsers } = useApp();
    const [activeTab, setActiveTab] = useState<HomeTab>(initialTab);
    const [roomCode, setRoomCode] = useState('');
    const [isDirectLink, setIsDirectLink] = useState(() => localStorage.getItem('veocall_direct_link') === 'true');
    const [copied, setCopied] = useState(false);
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
    const [showQRCode, setShowQRCode] = useState(false);
    const [qrRoomCode, setQrRoomCode] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ username: string; isOnline: boolean }[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Edit Name persistence
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');

    // Track online status of recent users
    const [onlineUsersMap, setOnlineUsersMap] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Poll online status every 30s
        const fetchStatus = async () => {
            const status = await getOnlineUsers();
            setOnlineUsersMap(status);
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, [getOnlineUsers]);

    const handleSaveName = async () => {
        if (tempName.trim().length < 2) return;
        if (tempName === user?.username) { setIsEditingName(false); return; }
        await login(tempName.trim()); // Re-login with new name
        setIsEditingName(false);
    };

    // Swipe Refs
    const touchStart = useRef<number>(0);
    const touchEnd = useRef<number>(0);

    // Save Direct Link Preference
    const toggleDirectLink = (checked: boolean) => {
        setIsDirectLink(checked);
        localStorage.setItem('veocall_direct_link', checked.toString());
    };

    useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

    const handleTabChange = (value: string) => {
        soundService.initialize();
        const tab = value as HomeTab;
        setActiveTab(tab);
        onTabChange?.(tab);
    };

    // Swipe Logic
    const handleTouchStart = (e: React.TouchEvent) => {
        soundService.initialize();
        touchStart.current = e.targetTouches[0].clientX;
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        touchEnd.current = e.targetTouches[0].clientX;
    };
    const handleTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;
        const distance = touchStart.current - touchEnd.current;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;

        const tabs: HomeTab[] = ['create', 'join', 'recent', 'search'];
        const currentIndex = tabs.indexOf(activeTab);

        if (isLeftSwipe && currentIndex < tabs.length - 1) {
            handleTabChange(tabs[currentIndex + 1]);
        } else if (isRightSwipe && currentIndex > 0) {
            handleTabChange(tabs[currentIndex - 1]);
        }

        // Reset
        touchStart.current = 0;
        touchEnd.current = 0;
    };

    const groupedCalls = useMemo((): GroupedCalls[] => {
        const groups: Map<string, CallHistoryItem[]> = new Map();
        callHistory.forEach(call => {
            const displayName = call.username === user?.username ? 'Participant' : call.username;
            const existing = groups.get(displayName) || [];
            existing.push({ ...call, username: displayName });
            groups.set(displayName, existing);
        });
        return Array.from(groups.entries())
            .map(([username, calls]) => ({
                username,
                calls: calls.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
                lastCall: calls[0],
                totalDuration: calls.reduce((sum, c) => sum + c.duration, 0)
            }))
            .sort((a, b) => b.lastCall.timestamp.getTime() - a.lastCall.timestamp.getTime());
    }, [callHistory, user?.username]);

    useEffect(() => {
        if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                const results = await searchUsers(searchQuery.trim());
                setSearchResults(results);
            } catch (e) { console.error(e); } finally { setIsSearching(false); }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, searchUsers]);

    const toggleExpanded = (username: string) => {
        const newExpanded = new Set(expandedUsers);
        if (newExpanded.has(username)) newExpanded.delete(username);
        else newExpanded.add(username);
        setExpandedUsers(newExpanded);
    };

    const handleCreateCall = (type: CallType, isDirect?: boolean) => {
        soundService.initialize();
        onCreateCall(type, isDirect);
    };

    const handleJoinRoom = () => {
        soundService.initialize();
        if (roomCode.trim().length >= 4) onJoinRoom(roomCode.trim().toUpperCase());
    };

    return (
        <div
            className="min-h-screen flex flex-col pb-20 touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <header className="p-6 pb-4 animate-slide-down">
                <div className="flex items-center justify-between mb-6">
                    <div className="min-w-0 flex-1 mr-4">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold whitespace-nowrap">Hello, </h1>
                            {isEditingName ? (
                                <Input
                                    value={tempName}
                                    onChange={e => setTempName(e.target.value)}
                                    onBlur={handleSaveName}
                                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                                    className="h-8 text-2xl font-bold w-full max-w-[200px] px-1 py-0 border-none bg-transparent focus-visible:ring-0 text-primary border-b border-primary rounded-none"
                                    autoFocus
                                />
                            ) : (
                                <span
                                    className="text-2xl font-bold text-gradient selectable cursor-pointer hover:opacity-80 border-b border-transparent hover:border-primary/50 transition-all truncate block max-w-full"
                                    onClick={() => { setTempName(user?.username || ''); setIsEditingName(true); }}
                                    title={user?.username}
                                >
                                    {user?.username}
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground truncate">Ready to connect?</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onSettings} className="w-12 h-12 rounded-xl bg-card border border-border flex-shrink-0">
                        <Settings className="w-6 h-6" />
                    </Button>
                </div>
            </header>

            <div className="flex-1 px-6">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="animate-fade-in">
                    <TabsList className="w-full h-auto bg-card border border-border p-1 flex flex-wrap mb-6">
                        <TabsTrigger value="create" className="flex-1 min-w-[60px] h-10">Create</TabsTrigger>
                        <TabsTrigger value="join" className="flex-1 min-w-[60px] h-10">Join</TabsTrigger>
                        <TabsTrigger value="recent" className="flex-1 min-w-[60px] h-10">Recent</TabsTrigger>
                        <TabsTrigger value="search" className="flex-1 min-w-[60px] h-10">Search</TabsTrigger>
                    </TabsList>

                    <TabsContent value="create" className="space-y-6 animate-slide-up">
                        <div className="flex items-center justify-between bg-secondary/30 p-4 rounded-xl border border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/20 rounded-lg"><Link2 className="w-5 h-5 text-primary" /></div>
                                <div>
                                    <p className="font-medium text-sm">Direct Persistent Link</p>
                                    <p className="text-xs text-muted-foreground">Link never expires</p>
                                </div>
                            </div>
                            <Switch checked={isDirectLink} onCheckedChange={toggleDirectLink} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button size="lg" onClick={() => handleCreateCall('video', isDirectLink)} className="h-32 rounded-3xl flex flex-col gap-4 gradient-primary shadow-glow">
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"><Video className="w-6 h-6 text-white" /></div>
                                <span className="font-semibold text-lg">New Video Call</span>
                            </Button>
                            <Button size="lg" onClick={() => handleCreateCall('audio', isDirectLink)} variant="secondary" className="h-32 rounded-3xl flex flex-col gap-4 border border-border">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><Phone className="w-6 h-6 text-primary" /></div>
                                <span className="font-semibold text-lg">New Audio Call</span>
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="join" className="space-y-6 animate-slide-up">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Room Code</Label>
                                <Input
                                    value={roomCode}
                                    onChange={e => setRoomCode(e.target.value.toUpperCase())}
                                    placeholder="Ex: A1B2C3"
                                    className="text-center font-mono tracking-widest text-xl h-14 uppercase"
                                />
                            </div>
                            <Button className="w-full h-12 gradient-primary" onClick={handleJoinRoom} disabled={roomCode.length < 4}>
                                Join Room
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="recent" className="space-y-4 animate-slide-up">
                        {groupedCalls.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">No recent calls</div>
                        ) : (
                            groupedCalls.map(({ username, calls, lastCall }) => (
                                <div key={username} className="bg-card rounded-xl border border-border overflow-hidden">
                                    <Collapsible>
                                        <div className="flex items-center p-3 gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">{username[0].toUpperCase()}</div>
                                                {onlineUsersMap[username] && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold truncate" title={username}>{username}</h3>
                                                    {onlineUsersMap[username] && (
                                                        <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">Online</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                                                    {lastCall.direction === 'incoming' ? (
                                                        <ArrowDownLeft className={`w-3 h-3 ${lastCall.status === 'missed' ? 'text-destructive' : 'text-blue-500'}`} />
                                                    ) : (
                                                        <ArrowUpRight className="w-3 h-3 text-green-500" />
                                                    )}
                                                    <span>{formatTimestamp(lastCall.timestamp)}</span>
                                                    <span>•</span>
                                                    <span>{lastCall.type}</span>
                                                </div>
                                            </div>
                                            {onCallUser && (
                                                <div className="flex gap-1 mr-2">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); soundService.initialize(); onCallUser(username, 'audio'); }}>
                                                        <Phone className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); soundService.initialize(); onCallUser(username, 'video'); }}>
                                                        <Video className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                            <CollapsibleTrigger asChild><Button variant="ghost" size="sm"><ChevronDown className="w-4 h-4" /></Button></CollapsibleTrigger>
                                        </div>
                                        <CollapsibleContent className="bg-secondary/30 border-t border-border">
                                            {calls.map(call => (
                                                <div key={call.id} className="flex items-center justify-between p-3 text-sm border-b border-border/50 last:border-0 hover:bg-white/5 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        {call.direction === 'incoming' ? (
                                                            <ArrowDownLeft className={`w-4 h-4 ${call.status === 'missed' ? 'text-destructive' : 'text-blue-500'}`} />
                                                        ) : (
                                                            <ArrowUpRight className="w-4 h-4 text-green-500" />
                                                        )}
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{formatTimestamp(call.timestamp)}</span>
                                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{call.type} • {call.status}</span>
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-xs opacity-70">{formatDuration(call.duration)}</span>
                                                </div>
                                            ))}
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="search" className="space-y-6 animate-slide-up">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search users..." className="pl-10 h-12" />
                        </div>
                        {isSearching && <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}

                        {/* Pinned Users Section */}
                        {pinnedUsers.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Pin className="w-4 h-4" /> Pinned
                                </h4>
                                {pinnedUsers.map(pinned => (
                                    <div key={pinned} className="flex items-center justify-between p-3 bg-card rounded-xl border border-primary/30">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                                                {pinned[0].toUpperCase()}
                                            </div>
                                            <span className="font-medium">{pinned}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {onCallUser && (
                                                <>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => { soundService.initialize(); onCallUser(pinned, 'audio'); }}>
                                                        <Phone className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => { soundService.initialize(); onCallUser(pinned, 'video'); }}>
                                                        <Video className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => unpinUser(pinned)}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Search Results */}
                        {searchResults.map(result => (
                            <div key={result.username} className="flex items-center justify-between p-3 bg-card rounded-xl border border-border">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">
                                            {result.username[0].toUpperCase()}
                                        </div>
                                        {result.isOnline && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1 mr-2 px-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate block max-w-full" title={result.username}>{result.username}</span>
                                            {result.isOnline && <span className="text-xs text-green-500 flex-shrink-0">Online</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {!pinnedUsers.includes(result.username) && (
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => pinUser(result.username)} title="Pin User">
                                            <Pin className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {onCallUser && (
                                        <>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => onCallUser(result.username, 'audio')}>
                                                <Phone className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => onCallUser(result.username, 'video')}>
                                                <Video className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                    </TabsContent>
                </Tabs>
            </div>

            {
                showQRCode && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowQRCode(false)}>
                        <div className="bg-[#1a1a1a] border border-white/10 p-8 rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="bg-white p-2 rounded-xl">
                                <QRCodeSVG value={`${window.location.origin}/video/${qrRoomCode}`} size={220} />
                            </div>
                            <p className="text-center font-bold mt-6 text-2xl tracking-widest text-white">{qrRoomCode}</p>
                            <p className="text-center text-sm text-gray-400 mt-2">Scan to join</p>
                        </div>
                    </div>
                )
            }

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border z-10">
                <NetworkStatus />
            </div>
        </div >
    );
};

export default HomePage;
