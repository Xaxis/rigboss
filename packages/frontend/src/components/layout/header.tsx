import React from 'react';
import { Menu, Radio, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui';
import { useRadioConnected } from '@/stores/radio';
import { getWebSocketService } from '@/services/websocket';
import { cn } from '@/lib/utils';

export function Header() {
  const { toggleSidebar } = useUIStore();
  const radioConnected = useRadioConnected();
  const [wsConnected, setWsConnected] = React.useState(false);

  React.useEffect(() => {
    const wsService = getWebSocketService();
    
    const unsubscribe = wsService.subscribe('connection_state', (state) => {
      setWsConnected(state.connected);
    });

    // Check initial state
    setWsConnected(wsService.isConnected());

    return unsubscribe;
  }, []);

  return (
    <header className="border-b border-border bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Radio className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">RigBoss</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-3">
            {/* WebSocket Status */}
            <div className={cn(
              'flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium',
              wsConnected 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            )}>
              {wsConnected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">
                {wsConnected ? 'Connected' : 'Offline'}
              </span>
            </div>

            {/* Radio Status */}
            <div className={cn(
              'flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium',
              radioConnected 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            )}>
              <Radio className="h-3 w-3" />
              <span className="hidden sm:inline">
                {radioConnected ? 'Radio' : 'No Radio'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
