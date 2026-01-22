// Firebase Configuration - VeoCall P2P
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDIfUEBaMpusRGTEHMt3ia5bVOz8daEadI",
  authDomain: "msg-app-d3d5e.firebaseapp.com",
  databaseURL: "https://securemsg-app-default-rtdb.firebaseio.com",
  projectId: "securemsg-app",
  storageBucket: "securemsg-app.firebasestorage.app",
  messagingSenderId: "83041331446",
  appId: "1:83041331446:web:224e6541817b10d2ca24d7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

// STUN/TURN servers for WebRTC
export const iceServers: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]
};

export default app;
