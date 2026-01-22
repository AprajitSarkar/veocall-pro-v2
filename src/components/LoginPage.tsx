import React, { useState, useEffect, useCallback } from 'react';
import { Video, Eye, EyeOff, ArrowRight, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { Checkbox } from "@/components/ui/checkbox";
import soundService from '@/lib/soundService';
import { PrivacyPolicy, TermsAndConditions } from './StaticPages';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const { login, checkUsernameExists, checkDeviceRecognized, loginWithDevice } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [deviceRecognized, setDeviceRecognized] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'available' | 'taken' | 'checking' | null>(null);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [activePage, setActivePage] = useState<'privacy' | 'terms' | null>(null);

  if (activePage === 'privacy') return <PrivacyPolicy onBack={() => setActivePage(null)} />;
  if (activePage === 'terms') return <TermsAndConditions onBack={() => setActivePage(null)} />;

  // Debounced username uniqueness check
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus(null);
      setDeviceRecognized(false);
      return;
    }

    setUsernameStatus('checking');
    setIsCheckingUsername(true);
    setDeviceRecognized(false);

    const timer = setTimeout(async () => {
      try {
        const exists = await checkUsernameExists(username);
        setUsernameStatus(exists ? 'taken' : 'available');
        setRequiresPassword(exists);

        // Check device recognition for password-protected accounts
        if (exists) {
          const recognized = await checkDeviceRecognized(username);
          setDeviceRecognized(recognized);
        }
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameStatus(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, checkUsernameExists, checkDeviceRecognized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    // Block if username taken and no password (for new registration)
    // In production, would also verify password for existing users
    if (usernameStatus === 'taken' && !password) {
      setError('This username is taken. Enter password to login or choose another.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(username, password);
      if (result.success) {
        soundService.initialize();
        onLogin();
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeviceLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await loginWithDevice(username);
      if (result.success) {
        soundService.initialize();
        onLogin();
      } else {
        setError(result.error || 'Device login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getUsernameStatusIcon = () => {
    if (username.length < 3) return null;

    switch (usernameStatus) {
      case 'checking':
        return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
      case 'available':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'taken':
        return <XCircle className="w-5 h-5 text-warning" />;
      default:
        return null;
    }
  };

  const getUsernameStatusText = () => {
    if (username.length < 3) return null;

    switch (usernameStatus) {
      case 'checking':
        return 'Checking...';
      case 'available':
        return 'Username available!';
      case 'taken':
        return 'Username exists - enter password to login';
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative animate-bounce-subtle">
            <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
              <Video className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="absolute -inset-2 rounded-3xl bg-primary/20 animate-pulse-glow -z-10" />
          </div>
          <h1 className="mt-6 text-4xl font-bold text-gradient">VeoCall</h1>
          <p className="mt-2 text-muted-foreground">Professional Video Calling</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-2xl p-6 border border-border shadow-lg animate-slide-up">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Username
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="Enter your username"
                    className="h-12 bg-secondary border-border focus:border-primary focus:ring-primary pr-12"
                    disabled={isLoading}
                    autoComplete="username"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {getUsernameStatusIcon()}
                  </div>
                </div>
                {getUsernameStatusText() && (
                  <p className={cn(
                    "text-xs",
                    usernameStatus === 'available' ? "text-success" :
                      usernameStatus === 'taken' ? "text-warning" : "text-muted-foreground"
                  )}>
                    {getUsernameStatusText()}
                  </p>
                )}
              </div>

              {/* Show password field for existing users or optional for new */}
              {(requiresPassword || usernameStatus === 'taken') && (
                <div className="space-y-2 animate-slide-down">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password {usernameStatus === 'available' && '(optional)'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={usernameStatus === 'taken' ? "Enter your password" : "Set a password (optional)"}
                      className="h-12 bg-secondary border-border focus:border-primary focus:ring-primary pr-12"
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Device Recognized Login Option */}
                  {deviceRecognized && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDeviceLogin}
                      disabled={isLoading}
                      className="w-full h-auto py-2 whitespace-normal text-sm border-green-500 text-green-500 hover:bg-green-500/10"
                    >
                      <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>Device Recognized - Login without password</span>
                    </Button>
                  )}
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive animate-fade-in">{error}</p>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-2 animate-fade-in">
            <Checkbox
              id="policy"
              checked={acceptedPolicy}
              onCheckedChange={(c) => setAcceptedPolicy(c as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="policy"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I accept the{" "}
                <button type="button" onClick={() => setActivePage('privacy')} className="text-primary hover:underline">Privacy Policy</button>
                {" "}and{" "}
                <button type="button" onClick={() => setActivePage('terms')} className="text-primary hover:underline">Terms & Conditions</button>
              </Label>
              <p className="text-xs text-muted-foreground">
                You must accept to continue.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || isCheckingUsername || username.length < 3 || !acceptedPolicy}
            className={cn(
              'w-full h-14 text-lg font-semibold gradient-primary',
              'hover:opacity-90 transition-all duration-300',
              'shadow-glow hover:shadow-lg',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>{usernameStatus === 'taken' ? 'Login' : 'Join VeoCall'}</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          By joining, you agree to our Terms of Service
        </p>
      </div >
    </div >
  );
};

export default LoginPage;
