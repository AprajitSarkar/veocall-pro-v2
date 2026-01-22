# VeoCall Flutter UI Context

## Overview

This document defines the complete UI/UX and architecture context for
building the VeoCall real-time video/audio calling application using
Flutter.

Target Platforms: - Android - Windows Desktop - Web

Framework: - Flutter 3.x - flutter_webrtc - Provider / Riverpod state
management

------------------------------------------------------------------------

## Screen Layout Structure

Scaffold └── Stack ├── RemoteVideoView (Full Screen) ├── LocalPiPView
(Floating Window) ├── TopStatusBar (Auto Hide) ├── OfflineBanner
(Animated) ├── BottomControlBar (Auto Hide) └── GestureDetector (Tap
Detection)

------------------------------------------------------------------------

## Remote Video View

-   Fullscreen RTCVideoView
-   ObjectFit.cover
-   Expands automatically when only one participant

------------------------------------------------------------------------

## Local PiP View

Features: - Draggable - Resizable - Double tap swap - Rounded corners -
Shadow - Animated scale

------------------------------------------------------------------------

## Top Status Bar

Left: - Pink rotating indicator - Ping display

Center: - Video quality - Call timer

Right: - Signal bars - Download speed - Upload speed

Auto hide after 3 seconds of inactivity.

------------------------------------------------------------------------

## Offline & Server Status Banner

States: - Internet Offline → Red banner - Server Offline → Red banner
with retry spinner - Server Online → Green banner (auto hide)

------------------------------------------------------------------------

## Bottom Control Bar

Buttons: - Mute - End Call - Camera Toggle - Switch Camera

Glass blur background.

------------------------------------------------------------------------

## Immersive Mode

-   Tap to show UI
-   Idle 3s hides UI
-   Mouse movement restores UI on desktop

------------------------------------------------------------------------

## Mobile Gestures

-   Swipe left/right → Switch camera
-   Tap → Toggle UI

------------------------------------------------------------------------

## Audio Routing

Audio Call: - Earpiece - Speaker

Video Call: - Auto speaker - Manual override

------------------------------------------------------------------------

## Camera Animations

-   Fade when OFF
-   Scale when ON
-   Smooth PiP resize when second user joins

------------------------------------------------------------------------

## Call Flow Animations

-   Ringing screen
-   Connected transition
-   Call ended animation

------------------------------------------------------------------------

## Network Monitoring

Track: - Ping - Download speed - Upload speed - Signal bars - Internet
online - Server online

------------------------------------------------------------------------

## Theme Colors

Primary: #00D4FF Background: #0B0F1A Error: #FF4757 Success: #00FF88

------------------------------------------------------------------------

## Project Structure

lib/ ├── main.dart ├── screens/ ├── widgets/ ├── services/ ├── models/
└── theme/

------------------------------------------------------------------------

## Goal

Build a modern immersive video calling UI with real-time network
awareness and smooth animations across platforms.
