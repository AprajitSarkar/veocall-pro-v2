# VeoCall UI Features & Style Guide

A comprehensive guide to all user interface features, components, and design patterns used in VeoCall.

---

## 🎨 Design System

### Color Palette
| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `hsl(180, 70%, 50%)` | Cyan accent, buttons, highlights |
| `--secondary` | `hsl(220, 15%, 20%)` | Card backgrounds, muted surfaces |
| `--background` | `hsl(220, 20%, 10%)` | Main dark background |
| `--foreground` | `hsl(0, 0%, 95%)` | Primary text |
| `--muted-foreground` | `hsl(220, 10%, 60%)` | Secondary text, hints |
| `--destructive` | `hsl(0, 70%, 50%)` | Red for errors, end call, delete |
| `--success` | `hsl(142, 70%, 45%)` | Green for connected, available |
| `--warning` | `hsl(38, 92%, 50%)` | Orange for alerts |

### Typography
- **Font Family**: System fonts with `Inter` as primary
- **Headings**: Bold, larger sizes (2xl for page titles)
- **Body**: Regular weight, responsive sizing
- **Mono**: `font-mono` for room codes, timers, IDs

### Border Radius
```css
--radius-sm: 0.5rem;   /* Small elements */
--radius-md: 0.75rem;  /* Buttons, inputs */
--radius-lg: 1rem;     /* Cards */
--radius-xl: 1.5rem;   /* Large cards, modals */
--radius-full: 9999px; /* Pills, avatars */
```

---

## 📱 Page Layouts

### Login Page
```
┌─────────────────────────────────┐
│         [VeoCall Logo]          │
│      Animated pulsing glow      │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Username Input            │  │
│  │ [✓ Available / ✗ Taken]   │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Password Input (if taken) │  │
│  └───────────────────────────┘  │
│                                 │
│  [     Continue Button      ]   │
│                                 │
│      Subtle gradient bg         │
└─────────────────────────────────┘
```

**Features**:
- Real-time username availability check (Firebase)
- Password field appears dynamically when username exists
- Animated logo with `shadow-glow` effect
- Gradient primary button

---

### Home Page
```
┌─────────────────────────────────┐
│ Hello, [Username]    [Settings] │
│ Ready to connect?               │
├─────────────────────────────────┤
│ [Create] [Join] [Recent] [Search]│
├─────────────────────────────────┤
│                                 │
│  ┌─────────────┬─────────────┐  │
│  │ Video Call  │ Audio Call  │  │
│  │   [Icon]    │   [Icon]    │  │
│  │  gradient   │  secondary  │  │
│  └─────────────┴─────────────┘  │
│                                 │
│  [Toggle] Direct Persistent Link│
│                                 │
│  Quick Actions Grid             │
│                                 │
├─────────────────────────────────┤
│ [Network Status: Online • 45ms] │
└─────────────────────────────────┘
```

**Features**:
- Tabbed navigation (Create/Join/Recent/Search/Scan)
- **Direct Link Toggle**: Switch for persistent rooms
- Large call buttons with hover scale effect
- Collapsible call history grouped by user
- Real-time user search with Firebase
- QR code scanner integration

---

### Video Call Screen
```
┌─────────────────────────────────┐
│ [●Live] 00:00 │ 45ms │ 3 Peers  │  ← Top Status Bar
├─────────────────────────────────┤
│                                 │
│  ┌─────────┬─────────┐          │
│  │ Peer 1  │ Peer 2  │          │  ← Video Grid
│  │ [video] │ [video] │          │
│  ├─────────┼─────────┤          │
│  │   You   │ Peer 3  │          │
│  │ [video] │ [video] │          │
│  └─────────┴─────────┘          │
│                                 │
│        OR (when waiting)        │
│                                 │
│       [Waiting for others]      │
│       [ Share Link Button ]     │
│       [ Show QR Code ]          │
│                                 │
├─────────────────────────────────┤
│   [🔊] [🎤] ─── [📞 End] ───    │  ← Control Bar
│              Floating, blurred  │
└─────────────────────────────────┘
```

**Features**:
- **Dynamic Grid**: 1 peer = fullscreen, 2+ = grid layout
- **Waiting State**: QR code + link sharing
- **Control Bar**: Mic, Video, End call (floating, auto-hide)
- **Top Bar**: Duration, ping, participant count
- **PiP Support**: Draggable local video thumbnail

---

### Audio Call Screen
```
┌─────────────────────────────────┐
│                                 │
│        ┌─────┐  ┌─────┐         │
│        │ 👤  │  │ 👤  │         │  ← Participant Avatars
│        │Name │  │Name │         │
│        └─────┘  └─────┘         │
│                                 │
│           00:00                 │  ← Timer
│    [● Encrypted P2P Connection] │
│                                 │
├─────────────────────────────────┤
│   [🔊]   [🎤]   [📞 End]        │  ← Controls
└─────────────────────────────────┘
```

**Features**:
- Avatar grid for participants
- Green dot indicator for active speakers
- Hidden audio elements for each peer
- Encrypted connection indicator

---

### Settings Page
```
┌─────────────────────────────────┐
│ ← Settings           [✓ Saved]  │
├─────────────────────────────────┤
│ ┌───────────────────────────┐   │
│ │ 👤 Profile                │   │
│ │   Username: [editable]    │   │
│ └───────────────────────────┘   │
│                                 │
│ ┌───────────────────────────┐   │
│ │ 🔒 Security               │   │
│ │   Password: [Set/Remove]  │   │
│ └───────────────────────────┘   │
│                                 │
│ ┌───────────────────────────┐   │
│ │ 🎨 UI Customization       │   │
│ │   Button Style: [Select]  │   │
│ │   Accent Color: [Select]  │   │
│ └───────────────────────────┘   │
│                                 │
│ ┌───────────────────────────┐   │
│ │ ⚠️ DANGER ZONE            │   │  ← Red themed section
│ │   [Delete Account]        │   │
│ └───────────────────────────┘   │
├─────────────────────────────────┤
│ [Network Status]                │
└─────────────────────────────────┘
```

**Features**:
- Collapsible setting sections with icons
- Real-time save feedback ("Saved" toast)
- **Danger Zone**: Red-themed delete account section
- Alert dialog confirmation for destructive actions

---

## 🧩 Component Library

### Buttons
| Variant | Style | Usage |
|---------|-------|-------|
| `default` | Gradient cyan/purple | Primary actions |
| `secondary` | Dark gray | Secondary actions |
| `destructive` | Red | End call, delete |
| `outline` | Border only | Tertiary actions |
| `ghost` | Transparent | Icons, subtle |
| `tonal` | Muted primary | Soft emphasis |

### Inputs
- Height: `h-12` (48px)
- Background: `bg-secondary`
- Border: `border-border` (subtle)
- Focus: `ring-primary` glow

### Cards
```tsx
<div className="bg-card rounded-xl border border-border p-4 shadow-lg">
  {/* Content */}
</div>
```

### Modals / Dialogs
- Backdrop: `bg-black/80` blur
- Content: `bg-card rounded-2xl`
- Animation: `animate-scale-in`

### Switches / Toggles
- Track: `bg-secondary` → `bg-primary` when on
- Thumb: White circle

---

## ✨ Animations

### CSS Animations
```css
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
.animate-slide-up { animation: slideUp 0.4s ease-out; }
.animate-slide-down { animation: slideDown 0.3s ease-out; }
.animate-scale-in { animation: scaleIn 0.2s ease-out; }
.animate-pulse-glow { animation: pulseGlow 2s infinite; }
.animate-bounce-subtle { animation: bounceSubtle 2s infinite; }
```

### Transitions
- **Hover**: `transition-all duration-300`
- **Scale on hover**: `hover:scale-105`
- **Opacity**: `hover:opacity-90`

### Loading States
- `<Loader2 className="animate-spin" />` for spinners
- Skeleton placeholders for content loading

---

## 📐 Responsive Design

### Breakpoints
| Size | Width | Grid Columns |
|------|-------|--------------|
| Mobile | < 640px | 1-2 |
| Tablet | 640-1024px | 2-3 |
| Desktop | > 1024px | 3-4 |

### Video Grid Responsive
```tsx
const gridClass = 
  peers <= 1 ? "grid-cols-1" :
  peers === 2 ? "grid-cols-1 md:grid-cols-2" :
  peers <= 4 ? "grid-cols-2" :
  "grid-cols-2 md:grid-cols-3";
```

---

## � Feedback & Notifications

### Toast Messages
- Success: Green with check icon
- Error: Red with X icon
- Position: Top-right

### Status Indicators
| State | Visual |
|-------|--------|
| Online | Green dot, pulsing |
| Connecting | Yellow/Orange, animated |
| Offline | Red dot |
| Muted | Strikethrough icon |

### Network Status Bar
- Bottom fixed bar with blur backdrop
- Shows: Signal bars, ping, quality (HD/SD/LD)

---

## 🎯 Accessibility

- **Focus States**: Visible ring on keyboard navigation
- **Color Contrast**: WCAG AA compliant
- **Screen Reader**: Proper `aria-labels` on interactive elements
- **Reduced Motion**: Respects `prefers-reduced-motion`

---

## 🖼️ Assets

### Favicon
- Location: `/public/veocall_favicon.png`
- Design: "V" logo with cyan gradient

### Meta Tags (SEO)
```html
<meta name="description" content="VeoCall - Secure P2P Video & Audio Calling">
<meta property="og:title" content="VeoCall">
<meta property="og:image" content="/veocall_favicon.png">
```

---

## 📦 Third-Party Integrations

| Library | Purpose |
|---------|---------|
| `lucide-react` | Icons (Video, Mic, Phone, etc.) |
| `qrcode.react` | QR Code generation |
| `jsqr` | QR Code scanning |
| `shadcn/ui` | UI component primitives |
| `tailwindcss` | Utility-first styling |

---

_Last Updated: January 2026_
