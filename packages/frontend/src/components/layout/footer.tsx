import React from 'react';
import { Heart, Github, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRadioConnected } from '@/stores/radio';
import { cn } from '@/lib/utils';

export function Footer() {
  const radioConnected = useRadioConnected();
  const [uptime, setUptime] = React.useState('0s');

  React.useEffect(() => {
    const startTime = Date.now();
    
    const updateUptime = () => {
      const elapsed = Date.now() - startTime;
      const seconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        setUptime(`${hours}h ${minutes % 60}m`);
      } else if (minutes > 0) {
        setUptime(`${minutes}m ${seconds % 60}s`);
      } else {
        setUptime(`${seconds}s`);
      }
    };

    const interval = setInterval(updateUptime, 1000);
    updateUptime();

    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="border-t border-border bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className={cn(
            'flex items-center gap-2 text-xs',
            radioConnected ? 'text-green-600' : 'text-red-600'
          )}>
            <div className={cn(
              'w-2 h-2 rounded-full',
              radioConnected ? 'bg-green-500' : 'bg-red-500'
            )} />
            <span className="font-medium">
              {radioConnected ? 'Radio Connected' : 'Radio Disconnected'}
            </span>
          </div>

          {/* Uptime */}
          <div className="text-xs text-muted-foreground">
            Uptime: <span className="font-medium">{uptime}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Built with love */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Built with</span>
            <Heart className="h-3 w-3 text-red-500" />
            <span>for the ham radio community</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => window.open('https://github.com/rigboss/rigboss', '_blank')}
            >
              <Github className="h-4 w-4" />
            </Button>
            
            <div className="text-xs text-muted-foreground">
              v0.1.0
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
