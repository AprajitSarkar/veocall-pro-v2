# VeoCall - React Native Android App Context & API Reference

> Complete documentation for building a React Native Android app based on the VeoCall web implementation.

---

## 📦 Firebase Configuration

### Firebase Project Details
```typescript
// React Native Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDIfUEBaMpusRGTEHMt3ia5bVOz8daEadI",
  authDomain: "msg-app-d3d5e.firebaseapp.com",
  databaseURL: "https://securemsg-app-default-rtdb.firebaseio.com",
  projectId: "securemsg-app",
  storageBucket: "securemsg-app.firebasestorage.app",
  messagingSenderId: "83041331446",
  appId: "1:83041331446:web:224e6541817b10d2ca24d7"
};
```

### Required Firebase Packages (React Native)
```bash
npm install @react-native-firebase/app @react-native-firebase/database
```

### Database Structure
```
Firebase Realtime Database
├── users/
│   └── {username_lowercase}/
│       ├── username: string
│       ├── password: string | null
│       ├── createdAt: number (timestamp)
│       ├── lastSeen: number (timestamp)
│       ├── deviceId: string (device fingerprint)
│       ├── lastIP: string
│       ├── incomingCall/
│       │   ├── caller: string
│       │   ├── roomId: string
│       │   ├── type: 'audio' | 'video'
│       │   └── timestamp: number
│       ├── settings/
│       │   ├── videoQuality: string
│       │   └── uiSettings: object
│       └── history/
│           └── {callId}/
│               ├── username: string
│               ├── roomId: string
│               ├── type: 'audio' | 'video'
│               ├── direction: 'incoming' | 'outgoing'
│               ├── status: 'received' | 'missed' | 'declined'
│               ├── duration: number (seconds)
│               └── timestamp: string (ISO)
│
└── calls/
    └── {roomId}/
        ├── type: 'audio' | 'video'
        ├── createdBy: string
        ├── createdAt: number
        ├── isDirect: boolean
        ├── status: 'active' | 'ended' | 'rejected'
        ├── participantCount: number
        ├── offer/
        │   ├── sdp: string
        │   └── type: 'offer'
        ├── answer/
        │   ├── sdp: string
        │   └── type: 'answer'
        ├── callerCandidates/
        │   └── {candidateId}: RTCIceCandidate
        ├── calleeCandidates/
        │   └── {candidateId}: RTCIceCandidate
        ├── calleeUsername: string
        ├── guestJoined: number (timestamp)
        └── actions/
            ├── video/
            │   └── {username}: boolean
            └── switchCamera/
                ├── target: string
                └── timestamp: number
```

### Database Rules
```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "users": { ".indexOn": ["username"] }
  }
}
```

---

## 📞 WebRTC Configuration

### ICE Servers (STUN)
```typescript
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]
};
```

### Required React Native Packages
```bash
npm install react-native-webrtc
npm install @react-native-firebase/database
```

---

## 🔐 Authentication API

### User Data Model
```typescript
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
  pinnedUsers: string[];
  callPrivacy: 'everyone' | 'none' | 'recent' | 'selected';
  uiSettings: UISettings;
}

interface UISettings {
  buttonStyle: 'filled' | 'tonal' | 'outlined' | 'elevated';
  buttonRadius: 'square' | 'rounded' | 'pill';
  accentColor: 'cyan' | 'blue' | 'purple' | 'green' | 'orange';
  showSignalStrength: boolean;
  showSpeed: boolean;
  showPing: boolean;
  showQuality: boolean;
}
```

### Authentication Methods

#### 1. Login / Register
```typescript
async function login(username: string, password?: string): Promise<{success: boolean; error?: string}> {
  const userId = username.toLowerCase();
  const userRef = ref(database, `users/${userId}`);
  const snapshot = await get(userRef);
  
  if (snapshot.exists()) {
    const userData = snapshot.val();
    if (userData.password) {
      if (!password) return { success: false, error: 'Password required' };
      if (userData.password !== password) return { success: false, error: 'Invalid password' };
    }
    // Update lastSeen, deviceId, lastIP
    await set(ref(database, `users/${userId}/lastSeen`), Date.now());
  } else {
    // Create new user
    await set(userRef, { 
      username, 
      password: password || null, 
      createdAt: Date.now(), 
      lastSeen: Date.now() 
    });
  }
  return { success: true };
}
```

#### 2. Device Recognition (Passwordless Login)
```typescript
async function checkDeviceRecognized(username: string): Promise<boolean> {
  const snapshot = await get(ref(database, `users/${username.toLowerCase()}`));
  if (!snapshot.exists()) return false;
  
  const userData = snapshot.val();
  if (!userData.password) return false;
  
  const currentDeviceId = getDeviceFingerprint();
  if (userData.deviceId === currentDeviceId) return true;
  
  // Also check IP match
  const currentIP = await fetch('https://api.ipify.org?format=json').then(r => r.json());
  if (userData.lastIP === currentIP.ip) return true;
  
  return false;
}
```

#### 3. Check Username Exists
```typescript
async function checkUsernameExists(username: string): Promise<boolean> {
  const snapshot = await get(ref(database, `users/${username.toLowerCase()}`));
  return snapshot.exists();
}
```

#### 4. Search Users
```typescript
async function searchUsers(query: string): Promise<{username: string; isOnline: boolean}[]> {
  if (!query || query.length < 2) return [];
  const snapshot = await get(ref(database, 'users'));
  if (!snapshot.exists()) return [];
  
  const users = snapshot.val();
  const now = Date.now();
  const TWO_MINUTES = 2 * 60 * 1000;
  
  return Object.keys(users)
    .filter(u => u.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10)
    .map(username => ({
      username,
      isOnline: users[username].lastSeen ? (now - users[username].lastSeen < TWO_MINUTES) : false
    }));
}
```

#### 5. Update Last Seen (Heartbeat)
```typescript
// Call every 30 seconds while app is active
async function updateLastSeen(username: string) {
  await set(ref(database, `users/${username.toLowerCase()}/lastSeen`), Date.now());
}
```

---

## 📱 Screen Navigation Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        SCREEN FLOW DIAGRAM                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [Loading] ──┬── (No User) ──▶ [Login Page]                       │
│              │                      │                             │
│              │                      ▼                             │
│              └── (Has User) ──▶ [Home Page] ◀──────────────────┐  │
│                                     │                          │  │
│              ┌──────────────────────┼──────────────────────┐   │  │
│              ▼                      ▼                      ▼   │  │
│        [Settings]            [Create/Join]         [Incoming]  │  │
│              │                      │               Call UI    │  │
│              │                      │                   │      │  │
│              └──────────────────────┼───────────────────┘      │  │
│                                     ▼                          │  │
│                              [Joining...]                      │  │
│                                     │                          │  │
│              ┌──────────────────────┴──────────────────────┐   │  │
│              ▼                                             ▼   │  │
│        [Video Call]                                 [Audio Call]│  │
│              │                                             │   │  │
│              └──────────────────────┬──────────────────────┘   │  │
│                                     ▼                          │  │
│                              [Call Ended] ─────────────────────┘  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Screen Types
```typescript
type Screen = 'loading' | 'login' | 'home' | 'settings' | 'video-call' | 'audio-call' | 'joining' | 'call-ended';
type CallStatus = 'ringing' | 'incoming' | 'active';
type HomeTab = 'create' | 'join' | 'recent' | 'search' | 'scan';
```

---

## 📄 Page-by-Page Feature Breakdown

### 1. Login Page

#### UI Elements
| Element | Description | React Native Component |
|---------|-------------|------------------------|
| VeoCall Logo | Animated bouncing logo with glow | `Animated.View` + `Image` |
| Username Input | Min 3 chars validation | `TextInput` |
| Username Status | Available ✓ / Taken ✗ | `Text` with icon |
| Password Input | Shown if username is protected | `TextInput secureTextEntry` |
| Show/Hide Password | Toggle visibility | `TouchableOpacity` + icon |
| Join Button | Gradient primary button | `TouchableOpacity` + `LinearGradient` |
| Terms Checkbox | Accept T&C | `CheckBox` + `Text` |
| Privacy/Terms Links | Opens modal/page | `TouchableOpacity` |

#### Button Actions
| Button | Action | API Call |
|--------|--------|----------|
| **Join** | Validate username → Check if exists → Show password field OR login | `checkUsernameExists()` → `login()` |
| **Login with Device** | Auto-login if device/IP recognized | `checkDeviceRecognized()` → `loginWithDevice()` |

#### Real-time Validation
```typescript
// Debounced username check (500ms delay)
useEffect(() => {
  if (username.length >= 3) {
    const timer = setTimeout(async () => {
      const exists = await checkUsernameExists(username);
      setUsernameStatus(exists ? 'taken' : 'available');
    }, 500);
    return () => clearTimeout(timer);
  }
}, [username]);
```

---

### 2. Home Page

#### Tabs
| Tab | Content | Icon |
|-----|---------|------|
| Create | Video/Audio call creation buttons | `Plus` |
| Join | Room ID input + join button | `Link` |
| Recent | Call history list | `Clock` |
| Search | User search with results | `Search` |
| Scan | QR code scanner | `QrCode` |

#### Create Tab - UI Elements
| Element | Description | Action |
|---------|-------------|--------|
| Video Call Button | Large gradient button with Video icon | `onCreateCall('video', isDirect)` |
| Audio Call Button | Secondary styled button with Phone icon | `onCreateCall('audio', isDirect)` |
| Direct Link Toggle | Switch to create persistent room links | Toggle `isDirect` state |

#### Join Tab - UI Elements
| Element | Description | Action |
|---------|-------------|--------|
| Room ID Input | 6-char uppercase code | Validate format |
| Join Button | Primary gradient | `onJoinRoom(roomId)` |

#### Recent Tab - Call History
```typescript
interface CallHistoryItem {
  id: string;
  username: string;
  roomId?: string;
  type: 'audio' | 'video';
  direction: 'incoming' | 'outgoing';
  status: 'received' | 'missed' | 'declined';
  duration: number; // seconds
  timestamp: Date;
  isGroup?: boolean;
  participants?: string[];
}
```

| Element | Description | Action |
|---------|-------------|--------|
| Call Card | Shows username, duration, timestamp | Expandable on tap |
| Direction Icon | ↗️ Outgoing / ↙️ Incoming | Display only |
| Call Type Icon | 📹 Video / 📞 Audio | Display only |
| Missed Badge | Red styling | `status === 'missed'` |
| Audio Call Button | Call same user (audio) | `onCallUser(username, 'audio')` |
| Video Call Button | Call same user (video) | `onCallUser(username, 'video')` |
| Pin User | Save to pinned list | `pinUser(username)` |

#### Search Tab - UI Elements
| Element | Description | Action |
|---------|-------------|--------|
| Search Input | Realtime search (min 2 chars) | `searchUsers(query)` |
| User Card | Shows username + online status | Tap to call |
| Online Indicator | Green dot if online | `isOnline` from search |
| Audio Button | Make audio call | `onCallUser(username, 'audio')` |
| Video Button | Make video call | `onCallUser(username, 'video')` |

#### Bottom Bar - Network Status
| Element | Description | Values |
|---------|-------------|--------|
| Signal Icon | Tower icon | Display only |
| Status Text | Connection status | `'Online'` / `'Offline'` |
| Ping Value | Latency in ms | Color coded |
| Quality Badge | Network quality | `'Good'` / `'Fair'` / `'Poor'` |

---

### 3. Settings Page

#### Profile Section
| Setting | Type | Storage |
|---------|------|---------|
| Edit Username | Text Input + Save | Firebase `users/{id}/username` |
| Email | Text Input + Save | Firebase + Local |

#### Security Section
| Setting | Type | Action |
|---------|------|--------|
| Set Password | Input + Button | `setPassword(password)` |
| Change Password | Input + Button | `setPassword(newPass)` |
| Remove Password | Button | `removePassword()` |

#### Video Quality Section
| Setting | Options | Storage |
|---------|---------|---------|
| Video Quality | Auto / 4K / 1080p / 720p / 480p | Local + Firebase |
| Frame Rate | Auto / 60fps / 30fps / 24fps | Local |

#### Audio Quality Section
| Setting | Options |
|---------|---------|
| Audio Quality | High / Medium / Low |

#### Privacy Section
| Setting | Options | Description |
|---------|---------|-------------|
| Audio Call Privacy | Everyone / Recent / Selected | Who can call (audio) |
| Video Call Privacy | Everyone / Recent / Selected | Who can call (video) |

#### UI Customization Section
| Setting | Options | Preview |
|---------|---------|---------|
| Button Style | Filled / Tonal / Outlined / Elevated | Live preview |
| Button Corners | Square / Rounded / Pill | Live preview |
| Accent Color | Cyan / Blue / Purple / Green / Orange | Theme change |

#### Danger Zone
| Action | Type | Confirmation |
|--------|------|--------------|
| Delete Account | Destructive Button | Alert Dialog |

---

### 4. Video Call Screen

#### Permission States
| State | UI | Navigation |
|-------|----|----|
| Requesting | Spinner + camera icon | Wait |
| Denied | Error message + close button | Back to Home |
| Granted | Proceed to call | Show video UI |

#### Main Video Elements
| Element | Description | Behavior |
|---------|-------------|----------|
| Remote Video (Full) | Other participant's video | Main display |
| Local Video (PiP) | Your camera preview | Draggable, corner positioned |
| Waiting State | Shows when alone in room | QR + Share link |

#### PiP (Picture-in-Picture) Features
| Feature | Description | Implementation |
|---------|-------------|----------------|
| Drag | Move anywhere on screen | `PanResponder` / `react-native-gesture-handler` |
| Double-tap Enlarge | Slightly enlarges PiP | Animated scale 1.0 → 1.2 |
| Double-tap Swap | Swap main/PiP videos | Within 2s of enlarge |
| Auto-reset | Returns to normal after 2s | `setTimeout` |
| Swap Indicator | "Tap again to swap" text | Conditional render |

#### Top Status Bar
| Element | Position | Data |
|---------|----------|------|
| Live Indicator | Left | Red dot + "Live" |
| Duration Timer | Center | `00:00` format |
| Ping Display | Center-Left | Latency in ms |
| Participant Count | Right | Number of peers |

#### Control Bar (Bottom, Auto-hide)
| Button | Icon | Action | State |
|--------|------|--------|-------|
| PiP Mode | ⬜ Minimize | Enter system PiP | - |
| Mute | 🎤 / 🔇 | `toggleMute()` | `isMuted` |
| End Call | 📞 Red | `onEnd()` | - |
| Video Toggle | 📹 / ❌ | `toggleVideo()` | `isVideoOff` |
| Switch Camera | 🔄 | `switchCamera()` | - |
| Hide UI | 👁️ | Toggle auto-hide | `uiHidden` |
| Audio Output | 🔊 | Open drawer | - |
| Camera Settings | ⚙️ | Open drawer | - |

#### Auto-hide Behavior
```typescript
// UI hides after 3 seconds of inactivity
useEffect(() => {
  const timer = setTimeout(() => setShowUI(false), 3000);
  return () => clearTimeout(timer);
}, [lastInteraction]);

// Show on tap, double-tap to toggle manually
const handleTap = () => setShowUI(true);
const handleDoubleTap = () => setShowUI(prev => !prev);
```

#### Connection Overlay
| State | Display |
|-------|---------|
| Connecting | "Connecting..." + spinner |
| Reconnecting | "Reconnecting..." + timeout warning |
| Disconnected | "Other user disconnected" + 2min timer |

---

### 5. Audio Call Screen

#### UI Elements
| Element | Description |
|---------|-------------|
| Avatar Grid | Circle avatars for each participant |
| Caller Name | Bold username display |
| Status Text | Ringing... / Connecting... / Duration |
| Active Speaker | Green dot indicator |
| Encryption Badge | "Encrypted P2P Connection" |

#### Control Buttons
| Button | Icon | Action |
|--------|------|--------|
| Mute | 🎤 / 🔇 | `toggleMute()` |
| Speaker | 🔊 | Open audio output drawer |
| End Call | 📞 Red | `onEnd()` |

#### Call States
| State | Visual | Sound |
|-------|--------|-------|
| Ringing | Bouncing dots animation | `playDialing()` |
| Connecting | Spinner | - |
| Connected | Timer starts, status slides up | `playConnected()` |

---

### 6. Incoming Call Screen

#### UI Elements
| Element | Description |
|---------|-------------|
| Overlay | 90% opacity black + blur |
| Avatar | Large pulsing avatar with glow |
| Pulse Rings | Animated expanding rings |
| Caller Name | Bold name display |
| Call Type | "Audio Call" or "Video Call" |

#### Action Buttons
| Button | Color | Icon | Action |
|--------|-------|------|--------|
| Reject | Red | ✕ PhoneOff | `onReject()` |
| Accept | Green Gradient | ✓ Phone/Video | `onAccept()` |

#### Sound & Vibration
```typescript
useEffect(() => {
  soundService.playRingtone(); // Loop ring + vibrate
  return () => soundService.stopRingtone();
}, []);
```

---

### 7. Call Ended Screen

#### UI Elements
| Element | Data |
|---------|------|
| Duration | Formatted `Xm Xs` |
| Remote Username | Who you called/received |
| Home Button | Return to Home |

---

## 🔊 Sound Service API

### Sound Methods
```typescript
interface SoundService {
  initialize(): void;                    // Must call on first user interaction
  playRingtone(): void;                  // Incoming call (loop + vibrate)
  stopRingtone(): void;                  
  playDialing(): void;                   // Outgoing call waiting (ringback)
  stopDialing(): void;
  playConnected(): void;                 // Call connected success sound
  playCallEnded(): void;                 // Call ended sound
  playNotification(): void;              // Generic notification
  stopAll(): void;                       // Stop all sounds
  dispose(): void;                       // Cleanup
}
```

### Vibration Patterns
```typescript
// Ringtone vibration: 500ms on, 200ms off, 500ms on
navigator.vibrate([500, 200, 500]);

// Connected vibration: Short 100ms
navigator.vibrate(100);
```

### React Native Sound Implementation
```bash
npm install react-native-sound
npm install react-native-vibration
```

---

## 📞 WebRTC Service API

### Call Types
```typescript
type CallType = 'audio' | 'video';

interface CallState {
  type: CallType;
  roomId: string;
  isInitiator: boolean;
  status: 'ringing' | 'active' | 'ended';
  isDirect: boolean;
}
```

### WebRTC Callbacks
```typescript
interface WebRTCCallbacks {
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream, peerId: string, username?: string) => void;
  onCallEnded?: () => void;
  onPeerLeft?: (peerId: string) => void;
  onPeerDisconnected?: () => void;
  onPeerVideoToggle?: (enabled: boolean) => void;
  onUserJoined?: (username: string) => void;
}
```

### Core Methods

#### Create Room (Initiator)
```typescript
async function createRoom(
  type: CallType, 
  username: string, 
  isDirect: boolean = false, 
  existingRoomId?: string
): Promise<string> {
  // 1. Generate room ID (6 chars or DIRECT-XXXXXX)
  // 2. Get local media (audio/video)
  // 3. Create RTCPeerConnection
  // 4. Create offer and store in Firebase
  // 5. Listen for answer, ICE candidates, guest join
  // 6. Start 3-min timeout for no-join
  // Returns: roomId
}
```

#### Join Room (Joiner)
```typescript
async function joinRoom(roomId: string, username: string): Promise<CallType> {
  // 1. Check room exists
  // 2. Check participant limit (2 for direct calls)
  // 3. Get local media
  // 4. Create RTCPeerConnection
  // 5. Signal guest joined
  // 6. Listen for offer, create answer
  // 7. Exchange ICE candidates
  // Returns: callType
}
```

#### End Call
```typescript
async function endCall(keepRoom: boolean = false): Promise<void> {
  // 1. Stop all media tracks
  // 2. Close peer connection
  // 3. Set call status to 'ended' in Firebase
  // 4. Delete room data (unless keepRoom)
  // 5. Clear session storage
}
```

#### Toggle Mute
```typescript
function toggleMute(): boolean {
  const audioTrack = localStream.getAudioTracks()[0];
  audioTrack.enabled = !audioTrack.enabled;
  return !audioTrack.enabled; // Returns isMuted
}
```

#### Toggle Video
```typescript
function toggleVideo(): boolean {
  const videoTrack = localStream.getVideoTracks()[0];
  videoTrack.enabled = !videoTrack.enabled;
  // Signal change to Firebase
  set(ref(database, `calls/${roomId}/actions/video/${username}`), videoTrack.enabled);
  return videoTrack.enabled;
}
```

#### Switch Camera
```typescript
async function switchCamera(): Promise<void> {
  const currentFacing = videoTrack.getSettings().facingMode;
  const newFacing = currentFacing === 'user' ? 'environment' : 'user';
  const newStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: newFacing }
  });
  // Replace track in peer connection
}
```

#### Request Remote Camera Switch
```typescript
async function requestRemoteCameraSwitch(): Promise<void> {
  await set(ref(database, `calls/${roomId}/actions/switchCamera`), {
    target: remoteUsername,
    timestamp: Date.now()
  });
}
```

### Direct Calling API

#### Initiate Call to User
```typescript
async function initiateCall(targetUsername: string, roomId: string, type: CallType): Promise<void> {
  await set(ref(database, `users/${targetUsername}/incomingCall`), {
    caller: myUsername,
    roomId,
    type,
    timestamp: Date.now()
  });
}
```

#### Listen for Incoming Calls
```typescript
function listenForIncomingCalls(username: string, callback: (call: IncomingCall | null) => void): void {
  const callRef = ref(database, `users/${username}/incomingCall`);
  onValue(callRef, (snapshot) => {
    if (snapshot.exists()) {
      const call = snapshot.val();
      // Check if call is fresh (< 30 seconds old)
      if (Date.now() - call.timestamp < 30000) {
        callback(call);
      } else {
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}
```

#### Clear Incoming Call
```typescript
async function clearIncomingCall(username: string): Promise<void> {
  await remove(ref(database, `users/${username}/incomingCall`));
}
```

#### Reject Call
```typescript
async function rejectIncomingCall(roomId: string): Promise<void> {
  await set(ref(database, `calls/${roomId}/status`), 'rejected');
}
```

---

## 🎨 UI Theme & Design System

### Color Palette
```typescript
const colors = {
  primary: 'hsl(180, 70%, 50%)',        // Cyan accent
  secondary: 'hsl(220, 15%, 20%)',      // Card backgrounds
  background: 'hsl(220, 20%, 10%)',     // Main dark background
  foreground: 'hsl(0, 0%, 95%)',        // Primary text
  mutedForeground: 'hsl(220, 10%, 60%)', // Secondary text
  destructive: 'hsl(0, 70%, 50%)',      // Red for errors/end call
  success: 'hsl(142, 70%, 45%)',        // Green for connected
  warning: 'hsl(38, 92%, 50%)',         // Orange for alerts
  border: 'hsl(220, 10%, 25%)',         // Subtle borders
};
```

### Accent Color Options
```typescript
const accentColors = {
  cyan: '#00d4ff',
  blue: '#3b82f6',
  purple: '#a855f7',
  green: '#22c55e',
  orange: '#f97316',
};
```

### Border Radius Values
```typescript
const radius = {
  sm: 8,    // Small elements
  md: 12,   // Buttons, inputs
  lg: 16,   // Cards
  xl: 24,   // Large cards, modals
  full: 9999, // Pills, avatars
};
```

### Button Styles
```typescript
const buttonStyles = {
  filled: { backgroundColor: primary, borderWidth: 0 },
  tonal: { backgroundColor: `${primary}33`, borderWidth: 0 },
  outlined: { backgroundColor: 'transparent', borderWidth: 1, borderColor: primary },
  elevated: { backgroundColor: secondary, elevation: 4, shadowColor: '#000' },
};
```

---

## 📊 Network Status Component

### Network Stats Interface
```typescript
interface NetworkStats {
  ping: number;           // Latency in ms
  downloadSpeed: number;  // MB/s
  uploadSpeed: number;    // MB/s
  signalBars: number;     // 1-5
  quality: 'HD' | 'SD' | 'LD';
}
```

### Signal Bars Logic
| Ping Range | Bars | Color |
|------------|------|-------|
| < 50ms | 5 | Green |
| 50-100ms | 4 | Green |
| 100-150ms | 3 | Yellow |
| 150-300ms | 2 | Yellow |
| > 300ms | 1 | Red |

---

## 💾 Local Storage Keys

```typescript
const STORAGE_KEYS = {
  USER: 'veocall_user',           // User object JSON
  HISTORY: 'veocall_history',     // Call history array JSON
  PINNED: 'veocall_pinned',       // Pinned users array JSON
  DIRECT_LINK: 'veocall_direct_link', // boolean string
  SESSION: 'veocall_session',     // Active call session (sessionStorage)
};
```

---

## 📲 React Native Specific Notes

### Required Permissions (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

### Recommended Packages
```bash
# Firebase
npm install @react-native-firebase/app @react-native-firebase/database

# WebRTC
npm install react-native-webrtc

# Navigation
npm install @react-navigation/native @react-navigation/stack

# Gestures & Animations
npm install react-native-gesture-handler react-native-reanimated

# Storage
npm install @react-native-async-storage/async-storage

# QR Code
npm install react-native-qrcode-svg react-native-camera

# Sound & Vibration
npm install react-native-sound

# UI Components
npm install react-native-linear-gradient react-native-vector-icons
```

### WebRTC Setup for React Native
```typescript
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
} from 'react-native-webrtc';

// Get user media
const stream = await mediaDevices.getUserMedia({
  audio: true,
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
});
```

---

## ⏱️ Timeouts & Intervals

| Timeout | Duration | Purpose |
|---------|----------|---------|
| Host No-Join | 3 minutes | Auto-end if guest doesn't join |
| Peer Disconnect | 3 minutes | Auto-end if peer disconnects |
| Calling Timeout | 60 seconds | Alert if target doesn't answer |
| Incoming Call Stale | 30 seconds | Ignore old incoming calls |
| Session Stale | 3 minutes | Clear old session on app open |
| lastSeen Update | 30 seconds | Heartbeat interval |
| UI Auto-hide | 3 seconds | Hide controls during call |

---

## 🔄 Session Recovery

### Session Storage Structure
```typescript
interface CallSession {
  roomId: string;
  type: 'audio' | 'video';
  isInitiator: boolean;
  myUsername: string;
  remoteUsername?: string;
  timestamp: number;
}
```

### Reconnection Flow
1. On app start, check for saved session in AsyncStorage
2. If session exists and < 3 minutes old:
   - For initiator: Re-create room with same ID (ICE restart)
   - For joiner: Re-join room
3. If session is stale (> 3 minutes):
   - Delete session
   - Delete room from Firebase
   - Return to home

---

## 📋 Feature Implementation Status

| Feature | Web Status | RN Priority |
|---------|------------|-------------|
| Login/Register | ✅ | P0 |
| Create Room | ✅ | P0 |
| Join Room | ✅ | P0 |
| Video Call | ✅ | P0 |
| Audio Call | ✅ | P0 |
| End Call | ✅ | P0 |
| Mute/Unmute | ✅ | P0 |
| Video Toggle | ✅ | P0 |
| Switch Camera | ✅ | P0 |
| Direct Calling | ✅ | P1 |
| Incoming Call Screen | ✅ | P1 |
| Call History | ✅ | P1 |
| User Search | ✅ | P1 |
| QR Code Scan | ✅ | P2 |
| Settings | ✅ | P2 |
| Push Notifications | ❌ | P2 |
| Background Calls | ❌ | P2 |

---

## 📱 Mobile Feature Implementation Details

### 1. Audio Output Switching (Speaker ↔ Earpiece/Headphone)

**Feature Description:**
During a voice or video call, users can toggle the audio output between the main loudspeaker, the phone's private earpiece, or connected headphones (wired/Bluetooth).

**Android Native Implementation:**
```java
// AudioRoutingPlugin.java
import android.media.AudioManager;

public class AudioRoutingPlugin {
    private AudioManager audioManager;
    
    public void setSpeaker(boolean enabled) {
        audioManager.setSpeakerphoneOn(enabled);
        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
    }
    
    public void setEarpiece() {
        audioManager.setSpeakerphoneOn(false);
        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
    }
    
    public String[] getAvailableDevices() {
        // Return list of audio output devices
    }
}
```

**React Native Bridge:**
```typescript
// nativePlugins.ts
import { NativeModules } from 'react-native';
const { AudioRoutingPlugin } = NativeModules;

export const setAudioOutput = async (device: 'speaker' | 'earpiece' | 'bluetooth') => {
  return AudioRoutingPlugin.setOutput(device);
};

export const getAudioDevices = async (): Promise<string[]> => {
  return AudioRoutingPlugin.getAvailableDevices();
};
```

---

### 2. Incoming Call Notification & Lock Screen

**Feature Description:**
When the phone is locked or the app is in the background, an incoming call wakes the screen and displays a full-screen interactive UI.

**Android Implementation:**
```java
// IncomingCallActivity.java
public class IncomingCallActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Show on lock screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        
        // Dismiss keyguard
        KeyguardManager keyguardManager = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
        if (keyguardManager != null) {
            keyguardManager.requestDismissKeyguard(this, null);
        }
    }
}
```

**AndroidManifest.xml:**
```xml
<activity
    android:name=".IncomingCallActivity"
    android:showWhenLocked="true"
    android:turnScreenOn="true"
    android:excludeFromRecents="true"
    android:launchMode="singleInstance" />
```

---

### 3. Ongoing Call Notification (Foreground Service)

**Feature Description:**
Persistent notification during active calls prevents the OS from killing the app.

**Android Implementation:**
```java
// CallForegroundService.java
public class CallForegroundService extends Service {
    private static final int NOTIFICATION_ID = 1001;
    private PowerManager.WakeLock wakeLock;
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, buildNotification());
        acquireWakeLock();
        return START_STICKY;
    }
    
    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("VeoCall")
            .setContentText("Call in progress")
            .setSmallIcon(R.drawable.ic_call)
            .setOngoing(true)
            .addAction(R.drawable.ic_mute, "Mute", mutePendingIntent)
            .addAction(R.drawable.ic_hangup, "End", hangupPendingIntent)
            .build();
    }
    
    private void acquireWakeLock() {
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "VeoCall::CallWakeLock");
        wakeLock.acquire(30*60*1000L); // 30 minutes max
    }
}
```

**AndroidManifest.xml:**
```xml
<service
    android:name=".CallForegroundService"
    android:foregroundServiceType="camera|microphone"
    android:exported="false" />
```

---

### 4. Background Mic & Camera Access

**AndroidManifest.xml Permissions:**
```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_CAMERA" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

---

### 5. Session Recovery (Rejoin Call)

**Implementation:**
```typescript
// On app launch
useEffect(() => {
  const checkActiveSession = async () => {
    const session = await AsyncStorage.getItem('veocall_session');
    if (session) {
      const { roomId, timestamp, isInitiator } = JSON.parse(session);
      const isStale = Date.now() - timestamp > 3 * 60 * 1000;
      
      if (!isStale) {
        // Auto-rejoin
        if (isInitiator) {
          await webrtcService.createRoom(type, username, isDirect, roomId);
        } else {
          await webrtcService.joinRoom(roomId, username);
        }
        navigateToCall();
      } else {
        // Clear stale session
        await AsyncStorage.removeItem('veocall_session');
        await deleteRoomFromFirebase(roomId);
      }
    }
  };
  checkActiveSession();
}, []);
```

---

### 6. Device Fingerprinting & Security

```typescript
// Device fingerprint generation
const getDeviceFingerprint = (): string => {
  const data = [
    DeviceInfo.getUniqueId(),
    DeviceInfo.getModel(),
    DeviceInfo.getSystemVersion(),
    DeviceInfo.getBrand(),
    Localization.getLocales()[0].languageCode,
  ].join('|');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
};
```

---

## 🎯 First-Time Permission Stepper

### Overview
A beautiful animated stepper component for onboarding users through required permissions (Camera, Microphone, Notifications).

### Required Package
```bash
npm install react-native-reanimated
```

### Stepper Component Props
```typescript
interface StepperProps {
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onFinalStepCompleted?: () => void;
  backButtonText?: string;
  nextButtonText?: string;
  children: React.ReactNode[];
}

interface StepProps {
  children: React.ReactNode;
}
```

### Usage Example
```tsx
import { Stepper, Step } from './components/Stepper';

<Stepper
  initialStep={1}
  onStepChange={(step) => console.log('Step:', step)}
  onFinalStepCompleted={() => navigation.navigate('Home')}
  backButtonText="Previous"
  nextButtonText="Next"
>
  <Step>
    <Text style={styles.stepTitle}>Welcome to VeoCall!</Text>
    <Text style={styles.stepDesc}>Let's set up your permissions</Text>
  </Step>
  
  <Step>
    <CameraIcon size={64} color="#5227FF" />
    <Text style={styles.stepTitle}>Camera Access</Text>
    <Text style={styles.stepDesc}>Required for video calls</Text>
    <Button onPress={requestCameraPermission}>Enable Camera</Button>
  </Step>
  
  <Step>
    <MicIcon size={64} color="#5227FF" />
    <Text style={styles.stepTitle}>Microphone Access</Text>
    <Text style={styles.stepDesc}>Required for audio/video calls</Text>
    <Button onPress={requestMicPermission}>Enable Microphone</Button>
  </Step>
  
  <Step>
    <BellIcon size={64} color="#5227FF" />
    <Text style={styles.stepTitle}>Notifications</Text>
    <Text style={styles.stepDesc}>Get notified of incoming calls</Text>
    <Button onPress={requestNotificationPermission}>Enable Notifications</Button>
  </Step>
  
  <Step>
    <CheckCircleIcon size={64} color="#22c55e" />
    <Text style={styles.stepTitle}>You're All Set!</Text>
    <Text style={styles.stepDesc}>Start making secure P2P calls</Text>
  </Step>
</Stepper>
```

### Stepper Animation Variants
```typescript
const stepVariants = {
  enter: (direction: number) => ({
    translateX: direction >= 0 ? -screenWidth : screenWidth,
    opacity: 0,
  }),
  center: {
    translateX: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    translateX: direction >= 0 ? screenWidth / 2 : -screenWidth / 2,
    opacity: 0,
  }),
};

// Spring animation config
const springConfig = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};
```

### Step Indicator Component
```tsx
const StepIndicator = ({ step, currentStep, isComplete }) => {
  const status = currentStep === step ? 'active' : 
                 currentStep > step ? 'complete' : 'inactive';
  
  return (
    <Animated.View style={[styles.indicator, statusStyles[status]]}>
      {status === 'complete' ? (
        <CheckIcon size={16} color="#fff" />
      ) : status === 'active' ? (
        <View style={styles.activeDot} />
      ) : (
        <Text style={styles.stepNumber}>{step}</Text>
      )}
    </Animated.View>
  );
};

const StepConnector = ({ isComplete }) => (
  <Animated.View 
    style={[
      styles.connector,
      { backgroundColor: isComplete ? '#5227FF' : '#52525b' }
    ]} 
  />
);
```

### Styles
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 16,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  indicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorActive: {
    backgroundColor: '#5227FF',
  },
  indicatorComplete: {
    backgroundColor: '#5227FF',
  },
  indicatorInactive: {
    backgroundColor: '#222',
  },
  activeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  connector: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    borderRadius: 1,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nextButton: {
    backgroundColor: '#5227FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
});
```

---

## 🌊 Animated Glass Bottom Menu

### Overview
A super-smooth animated bottom navigation with glassmorphism effects.

### Required Packages
```bash
npm install react-native-reanimated react-native-blur @react-native-community/blur
```

### Glass Bottom Menu Component
```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';

interface TabItem {
  key: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
}

const GlassBottomMenu = ({ tabs, activeTab, onTabPress }) => {
  const indicatorX = useSharedValue(0);
  const tabWidth = screenWidth / tabs.length;
  
  useEffect(() => {
    const index = tabs.findIndex(t => t.key === activeTab);
    indicatorX.value = withSpring(index * tabWidth, {
      damping: 15,
      stiffness: 150,
    });
  }, [activeTab]);
  
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));
  
  return (
    <View style={styles.container}>
      {/* Glass Background */}
      <BlurView
        style={styles.blurContainer}
        blurType="dark"
        blurAmount={20}
        reducedTransparencyFallbackColor="#1a1a1a"
      />
      
      {/* Glass Border */}
      <View style={styles.glassBorder} />
      
      {/* Active Indicator */}
      <Animated.View style={[styles.indicator, indicatorStyle]}>
        <View style={styles.indicatorGlow} />
      </Animated.View>
      
      {/* Tab Items */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab, index) => (
          <TabButton
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onPress={() => onTabPress(tab.key)}
          />
        ))}
      </View>
    </View>
  );
};
```

### Tab Button with Animations
```tsx
const TabButton = ({ tab, isActive, onPress }) => {
  const scale = useSharedValue(1);
  const iconY = useSharedValue(0);
  
  useEffect(() => {
    if (isActive) {
      iconY.value = withSpring(-4, { damping: 12 });
      scale.value = withSpring(1.15, { damping: 10 });
    } else {
      iconY.value = withSpring(0);
      scale.value = withSpring(1);
    }
  }, [isActive]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: iconY.value },
      { scale: scale.value },
    ],
  }));
  
  const Icon = tab.icon;
  
  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <Animated.View style={animatedStyle}>
        <Icon 
          size={24} 
          color={isActive ? '#00d4ff' : '#a3a3a3'} 
        />
      </Animated.View>
      <Animated.Text 
        style={[
          styles.tabLabel,
          { color: isActive ? '#00d4ff' : '#a3a3a3' }
        ]}
      >
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
};
```

### Glass Surface Styles
```typescript
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  glassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: screenWidth / 4, // Adjust based on tab count
    height: 3,
    backgroundColor: '#00d4ff',
    borderRadius: 2,
  },
  indicatorGlow: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 8,
    backgroundColor: '#00d4ff',
    borderRadius: 4,
    opacity: 0.5,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});
```

### Tab Items Configuration
```typescript
const bottomTabs: TabItem[] = [
  { key: 'create', icon: PlusCircle, label: 'Create' },
  { key: 'join', icon: Link, label: 'Join' },
  { key: 'recent', icon: Clock, label: 'Recent' },
  { key: 'search', icon: Search, label: 'Search' },
];
```

---

## 🪟 Glass Surface Component

### Glassmorphism Card Component
```tsx
import { BlurView } from '@react-native-community/blur';

interface GlassSurfaceProps {
  children: React.ReactNode;
  borderRadius?: number;
  blurAmount?: number;
  style?: ViewStyle;
}

const GlassSurface: React.FC<GlassSurfaceProps> = ({
  children,
  borderRadius = 20,
  blurAmount = 12,
  style,
}) => {
  return (
    <View style={[styles.container, { borderRadius }, style]}>
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="dark"
        blurAmount={blurAmount}
        reducedTransparencyFallbackColor="rgba(30, 30, 30, 0.9)"
      />
      
      {/* Inner glow border */}
      <View style={[styles.innerBorder, { borderRadius }]} />
      
      {/* Sheen overlay */}
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.15)',
          'rgba(255, 255, 255, 0.05)',
          'rgba(255, 255, 255, 0)',
          'rgba(255, 255, 255, 0.05)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
      />
      
      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    padding: 16,
  },
});
```

---

## ✨ Advanced Animation Utilities

### Spring Configs
```typescript
export const springConfigs = {
  // Bouncy - for buttons, icons
  bouncy: {
    damping: 10,
    stiffness: 200,
    mass: 0.5,
  },
  // Smooth - for transitions
  smooth: {
    damping: 20,
    stiffness: 150,
    mass: 0.8,
  },
  // Snappy - for quick responses
  snappy: {
    damping: 15,
    stiffness: 300,
    mass: 0.4,
  },
  // Gentle - for subtle animations
  gentle: {
    damping: 25,
    stiffness: 100,
    mass: 1,
  },
};
```

### Animated Pressable
```tsx
const AnimatedPressable = ({ children, onPress, style }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  
  const handlePressIn = () => {
    scale.value = withSpring(0.95, springConfigs.snappy);
    opacity.value = withTiming(0.8, { duration: 100 });
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1, springConfigs.bouncy);
    opacity.value = withTiming(1, { duration: 150 });
  };
  
  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};
```

### Pulse Animation (For Incoming Call)
```tsx
const PulseRing = ({ delay = 0 }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);
  
  useEffect(() => {
    const startAnimation = () => {
      scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(2.5, { duration: 1500 })
        ),
        -1 // Infinite
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 0 }),
          withTiming(0, { duration: 1500 })
        ),
        -1
      );
    };
    
    const timer = setTimeout(startAnimation, delay);
    return () => clearTimeout(timer);
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  
  return (
    <Animated.View style={[styles.pulseRing, animatedStyle]} />
  );
};
```

---

## 📱 Complete App Structure

```
src/
├── App.tsx
├── navigation/
│   ├── RootNavigator.tsx
│   └── types.ts
├── screens/
│   ├── LoadingScreen.tsx
│   ├── PermissionScreen.tsx      # Stepper component
│   ├── LoginScreen.tsx
│   ├── HomeScreen.tsx            # Glass bottom menu
│   ├── SettingsScreen.tsx
│   ├── VideoCallScreen.tsx
│   ├── AudioCallScreen.tsx
│   └── CallEndedScreen.tsx
├── components/
│   ├── Stepper/
│   │   ├── Stepper.tsx
│   │   ├── Step.tsx
│   │   └── StepIndicator.tsx
│   ├── GlassBottomMenu/
│   │   ├── GlassBottomMenu.tsx
│   │   └── TabButton.tsx
│   ├── GlassSurface.tsx
│   ├── AnimatedPressable.tsx
│   ├── IncomingCallOverlay.tsx
│   └── NetworkStatusBar.tsx
├── contexts/
│   └── AppContext.tsx
├── hooks/
│   ├── useMediaPermissions.ts
│   ├── useWebRTC.ts
│   └── useNetworkStatus.ts
├── services/
│   ├── webrtcService.ts
│   ├── soundService.ts
│   └── firebaseService.ts
├── utils/
│   ├── animations.ts             # Spring configs
│   └── deviceFingerprint.ts
├── types/
│   └── index.ts
└── constants/
    ├── colors.ts
    └── config.ts
```

---

*Last Updated: January 2026*
