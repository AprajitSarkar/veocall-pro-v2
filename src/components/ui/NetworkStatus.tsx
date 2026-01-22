import React from 'react';
import { Wifi, WifiOff, Signal } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

interface NetworkStatusProps {
  variant?: 'full' | 'compact' | 'call';
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({ variant = 'full' }) => {
  const { networkStatus, networkStats } = useApp();
  const ping = networkStats.ping;

  const getPingColor = () => {
    if (ping < 50) return 'text-success';
    if (ping < 100) return 'text-success';
    if (ping < 150) return 'text-warning';
    if (ping < 250) return 'text-warning';
    return 'text-destructive';
  };

  const getSignalBars = () => {
    if (ping < 50) return 5;
    if (ping < 100) return 4;
    if (ping < 150) return 3;
    if (ping < 300) return 2;
    return 1;
  };

  const renderSignalBars = () => {
    const bars = getSignalBars();
    return (
      <div className="flex items-end gap-0.5 h-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              'w-1 rounded-sm transition-colors duration-300',
              i <= bars ? getPingColor().replace('text-', 'bg-') : 'bg-muted'
            )}
            style={{ height: `${i * 3 + 2}px` }}
          />
        ))}
      </div>
    );
  };

  if (networkStatus === 'offline') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-destructive/20 text-destructive rounded-lg animate-slide-down">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">You are offline</span>
      </div>
    );
  }

  if (networkStatus === 'server-down') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-destructive/20 text-destructive rounded-lg animate-slide-down">
        <Signal className="w-4 h-4" />
        <span className="text-sm font-medium">Server is offline</span>
      </div>
    );
  }

  if (variant === 'call') {
    return (
      <div className="flex items-center gap-4 text-foreground/80">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", getPingColor().replace('text-', 'bg-'))} />
          <span className={cn('text-sm font-mono', getPingColor())}>
            {ping}ms
          </span>
        </div>
        {renderSignalBars()}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <Wifi className={cn('w-4 h-4', getPingColor())} />
        <span className={cn('text-xs font-mono', getPingColor())}>{ping}ms</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-card rounded-lg border border-border">
      <div className="flex items-center gap-3">
        <Signal className="w-5 h-5 text-primary" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-success">Server is online</span>
          <span className="text-xs text-muted-foreground">Connection established</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", getPingColor().replace('text-', 'bg-'))} />
          <span className={cn('text-sm font-mono', getPingColor())}>{ping}ms</span>
        </div>
        {renderSignalBars()}
      </div>
    </div>
  );
};

export default NetworkStatus;
