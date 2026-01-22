import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";

interface PageProps {
    onBack: () => void;
}

export const PrivacyPolicy: React.FC<PageProps> = ({ onBack }) => (
    <div className="flex flex-col h-full bg-background animate-slide-up">
        <header className="flex items-center gap-4 p-4 border-b border-border">
            <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-6 h-6" /></Button>
            <h1 className="text-xl font-bold">Privacy Policy</h1>
        </header>
        <ScrollArea className="flex-1 p-6">
            <div className="prose dark:prose-invert max-w-none space-y-4 text-sm text-muted-foreground">
                <p>Visible ON can call you. One call I can visit the video call you. One can audio call you.</p>
                <p>We use Google AdMob service and other 3rd party ad services.</p>
                <div className="bg-secondary/20 p-4 rounded-xl border border-secondary">
                    <h3 className="text-foreground font-semibold mb-2">Permissions</h3>
                    <p>The app needs Microphone and Camera permissions solely for video and audio calls.</p>
                </div>
                <div className="bg-secondary/20 p-4 rounded-xl border border-secondary">
                    <h3 className="text-foreground font-semibold mb-2">Data Privacy</h3>
                    <p>No data is stored in the database. Everything is encrypted peer-to-peer. There is no need for a server during the call. This is fully safe.</p>
                    <p>Only the username is stored in the database and the user can delete it anytime. No personal data signed in the database.</p>
                </div>
                <p>Contact: cozmo@duck.com</p>
            </div>
        </ScrollArea>
    </div>
);

export const TermsAndConditions: React.FC<PageProps> = ({ onBack }) => (
    <div className="flex flex-col h-full bg-background animate-slide-up">
        <header className="flex items-center gap-4 p-4 border-b border-border">
            <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-6 h-6" /></Button>
            <h1 className="text-xl font-bold">Terms & Conditions</h1>
        </header>
        <ScrollArea className="flex-1 p-6">
            <div className="prose dark:prose-invert max-w-none space-y-4 text-sm text-muted-foreground">
                <p>By using VeoCall, you agree to these terms.</p>
                <p>You agree to allowing the app to use your microphone and camera for calls.</p>
                <p>You understand that calls are peer-to-peer and encrypted.</p>
                <p>We are not responsible for content shared during calls.</p>
            </div>
        </ScrollArea>
    </div>
);

export const HowItWorks: React.FC<PageProps> = ({ onBack }) => (
    <div className="flex flex-col h-full bg-background animate-slide-up">
        <header className="flex items-center gap-4 p-4 border-b border-border">
            <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-6 h-6" /></Button>
            <h1 className="text-xl font-bold">How App Works</h1>
        </header>
        <ScrollArea className="flex-1 p-6">
            <div className="prose dark:prose-invert max-w-none space-y-6 text-sm text-muted-foreground">
                <section>
                    <h3 className="text-foreground font-bold text-lg mb-2">1. Request</h3>
                    <p>When you request or want to call someone, the request is sent to the server.</p>
                </section>
                <section>
                    <h3 className="text-foreground font-bold text-lg mb-2">2. Routing</h3>
                    <p>The server requests the database to find the person you want to call.</p>
                </section>
                <section>
                    <h3 className="text-foreground font-bold text-lg mb-2">3. Signaling</h3>
                    <p>After tracing the request by the person, it will go back to the server, then to the person who started the call. The server facilitates a "handshake" to connect both users.</p>
                </section>
                <section>
                    <h3 className="text-foreground font-bold text-lg mb-2">4. Connection</h3>
                    <p>After accepting the offer, the call starts. Everything is encrypted peer-to-peer. There is no need for a server during the call. This is fully safe.</p>
                </section>
                <section>
                    <h3 className="text-foreground font-bold text-lg mb-2">5. No Data Saved</h3>
                    <p>After leaving the call, nothing is saved in the database.</p>
                </section>
            </div>
        </ScrollArea>
    </div>
);

export const ContactUs: React.FC<PageProps> = ({ onBack }) => (
    <div className="flex flex-col h-full bg-background animate-slide-up">
        <header className="flex items-center gap-4 p-4 border-b border-border">
            <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-6 h-6" /></Button>
            <h1 className="text-xl font-bold">Contact Us</h1>
        </header>
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
                <Mail className="w-10 h-10 text-primary" />
            </div>
            <div>
                <h2 className="text-2xl font-bold mb-2">Get in Touch</h2>
                <p className="text-muted-foreground">Have questions or feedback?</p>
            </div>
            <div className="bg-secondary/30 p-4 rounded-xl border border-border w-full max-w-sm">
                <p className="text-sm text-muted-foreground mb-1">Email Support</p>
                <a href="mailto:cozmo@duck.com" className="text-xl font-medium text-primary hover:underline">cozmo@duck.com</a>
            </div>
        </div>
    </div>
);
