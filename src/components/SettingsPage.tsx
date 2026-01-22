import React, { useState } from 'react';
import {
  ArrowLeft, User, Lock, Video, Mic, Zap, Eye, Users, Mail,
  Save, Trash2, Check, Palette, AlertTriangle, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import NetworkStatus from '@/components/ui/NetworkStatus';
import { cn } from '@/lib/utils';
import { PrivacyPolicy, TermsAndConditions, HowItWorks, ContactUs } from './StaticPages';
import {
  Shield, Info, PhoneIncoming
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SettingsPageProps {
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const { user, updateUser, setPassword, removePassword, deleteAccount } = useApp();
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [activePage, setActivePage] = useState<'privacy' | 'terms' | 'contact' | 'how' | null>(null);

  if (activePage === 'privacy') return <PrivacyPolicy onBack={() => setActivePage(null)} />;
  if (activePage === 'terms') return <TermsAndConditions onBack={() => setActivePage(null)} />;
  if (activePage === 'contact') return <ContactUs onBack={() => setActivePage(null)} />;
  if (activePage === 'how') return <HowItWorks onBack={() => setActivePage(null)} />;

  const handleSaveUsername = () => {
    if (username.length >= 3) {
      updateUser({ username });
      showSavedMessage();
    }
  };

  const handleSaveEmail = () => {
    if (email) {
      updateUser({ email });
      showSavedMessage();
    }
  };

  const handleSetPassword = () => {
    if (newPassword.length >= 4) {
      setPassword(newPassword);
      setNewPassword('');
      showSavedMessage();
    }
  };

  const handleRemovePassword = () => {
    removePassword();
    showSavedMessage();
  };

  const handleDeleteAccount = async () => {
    await deleteAccount();
    // AppContext will trigger logout logic
  };

  const showSavedMessage = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const updateUISettings = (key: string, value: string) => {
    if (user?.uiSettings) {
      updateUser({
        uiSettings: {
          ...user.uiSettings,
          [key]: value,
        },
      });
      showSavedMessage();
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border p-4 animate-slide-down">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="w-10 h-10 rounded-xl hover:bg-secondary active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Settings</h1>
          {showSaved && (
            <div className="ml-auto flex items-center gap-2 text-success animate-fade-in">
              <Check className="w-4 h-4" />
              <span className="text-sm">Saved</span>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Profile Section */}
        <SettingsSection title="Profile" icon={User}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <div className="flex gap-2">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 bg-secondary border-border rounded-xl"
                  readOnly // Username should be immutable usually, but keeping editable as per current logic
                />
                <Button onClick={handleSaveUsername} className="rounded-xl">
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Security Section */}
        <SettingsSection title="Security" icon={Lock}>
          <div className="space-y-4">
            {user?.hasPassword ? (
              <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
                <div>
                  <p className="font-medium">Password Protected</p>
                  <p className="text-sm text-muted-foreground">Your account is secured</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemovePassword}
                  className="gap-2 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Set Password</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 4 characters"
                    className="flex-1 bg-secondary border-border rounded-xl"
                  />
                  <Button onClick={handleSetPassword} className="rounded-xl">
                    <Lock className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* Call Privacy Section */}
        <SettingsSection title="Call Privacy" icon={Shield}>
          <div className="space-y-4">
            <Label>Who can call you?</Label>
            <RadioGroup
              value={user?.callPrivacy || 'everyone'}
              onValueChange={(val: any) => {
                updateUser({ callPrivacy: val });
                showSavedMessage();
              }}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="everyone" id="p-everyone" />
                <Label htmlFor="p-everyone">Everyone</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recent" id="p-recent" />
                <Label htmlFor="p-recent">Recent Calls Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="p-selected" />
                <Label htmlFor="p-selected">Selected Users Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="p-none" />
                <Label htmlFor="p-none">No One</Label>
              </div>
            </RadioGroup>

            {user?.callPrivacy === 'selected' && (
              <div className="mt-4 pt-4 border-t border-border">
                <Label className="mb-2 block">Allowed Users</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Enter username"
                    id="allowed-user-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value.trim();
                        if (val && !user?.allowedUsers?.includes(val)) {
                          updateUser({ allowedUsers: [...(user?.allowedUsers || []), val] });
                          e.currentTarget.value = '';
                          showSavedMessage();
                        }
                      }
                    }}
                  />
                  <Button onClick={() => {
                    const el = document.getElementById('allowed-user-input') as HTMLInputElement;
                    const val = el.value.trim();
                    if (val && !user?.allowedUsers?.includes(val)) {
                      updateUser({ allowedUsers: [...(user?.allowedUsers || []), val] });
                      el.value = '';
                      showSavedMessage();
                    }
                  }}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user?.allowedUsers?.map(u => (
                    <div key={u} className="bg-secondary px-2 py-1 rounded-md flex items-center gap-2 text-sm">
                      <span>{u}</span>
                      <button onClick={() => {
                        updateUser({ allowedUsers: user.allowedUsers.filter(x => x !== u) });
                        showSavedMessage();
                      }}><X className="w-3 h-3 text-muted-foreground hover:text-destructive" /></button>
                    </div>
                  ))}
                  {(!user?.allowedUsers || user.allowedUsers.length === 0) && (
                    <span className="text-xs text-muted-foreground">No users allowed yet.</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* Info Section */}
        <SettingsSection title="Information" icon={Info}>
          <div className="space-y-1">
            <Button variant="ghost" className="w-full justify-start h-auto py-3 px-2" onClick={() => setActivePage('how')}>
              How App Works
            </Button>
            <Button variant="ghost" className="w-full justify-start h-auto py-3 px-2" onClick={() => setActivePage('privacy')}>
              Privacy Policy
            </Button>
            <Button variant="ghost" className="w-full justify-start h-auto py-3 px-2" onClick={() => setActivePage('terms')}>
              Terms & Conditions
            </Button>
            <Button variant="ghost" className="w-full justify-start h-auto py-3 px-2" onClick={() => setActivePage('contact')}>
              Contact Us
            </Button>
          </div>
        </SettingsSection>

        {/* Danger Zone */}
        <div className="bg-destructive/10 rounded-xl border border-destructive/20 overflow-hidden animate-slide-up mt-8">
          <div className="flex items-center gap-3 p-4 border-b border-destructive/20 bg-destructive/5">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h2 className="font-semibold text-destructive">Danger Zone</h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Deleting your account is permanent. All your data including call history and settings will be wiped.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

      </div >

      {/* Bottom Network Status */}
      < div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border" >
        <NetworkStatus />
      </div >
    </div >
  );
};

interface SettingsSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, icon: Icon, children }) => (
  <div className="bg-card rounded-xl border border-border overflow-hidden animate-slide-up">
    <div className="flex items-center gap-3 p-4 border-b border-border bg-secondary/30">
      <Icon className="w-5 h-5 text-primary" />
      <h2 className="font-semibold">{title}</h2>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

interface SettingsSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

const SettingsSelect: React.FC<SettingsSelectProps> = ({ label, value, onChange, options }) => (
  <div className="flex items-center justify-between">
    <Label>{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-36 bg-secondary border-border rounded-xl">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

interface SettingsToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

const SettingsToggle: React.FC<SettingsToggleProps> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between">
    <div>
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default SettingsPage;
