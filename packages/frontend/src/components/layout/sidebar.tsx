import React from 'react';
import { 
  Radio, 
  BarChart3, 
  Volume2, 
  BookOpen, 
  FileText, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore, useSidebarOpen, useActivePanel } from '@/stores/ui';
import { cn } from '@/lib/utils';
import type { Panel } from '@/types';

const navigationItems = [
  {
    id: 'radio' as Panel,
    label: 'Radio Control',
    description: 'Frequency, mode, power',
    icon: Radio,
  },
  {
    id: 'spectrum' as Panel,
    label: 'Spectrum',
    description: 'Analyzer & FFT',
    icon: BarChart3,
  },
  {
    id: 'audio' as Panel,
    label: 'Audio',
    description: 'Input/output control',
    icon: Volume2,
  },
  {
    id: 'memory' as Panel,
    label: 'Memory',
    description: 'Channel management',
    icon: BookOpen,
  },
  {
    id: 'log' as Panel,
    label: 'Log',
    description: 'QSO logging',
    icon: FileText,
  },
  {
    id: 'settings' as Panel,
    label: 'Settings',
    description: 'App configuration',
    icon: Settings,
  },
];

export function Sidebar() {
  const { setActivePanel, setSidebarOpen } = useUIStore();
  const sidebarOpen = useSidebarOpen();
  const activePanel = useActivePanel();

  const handleNavClick = (panelId: Panel) => {
    setActivePanel(panelId);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-background border-r border-border transition-all duration-300 ease-in-out flex-shrink-0',
          // Mobile behavior - fixed overlay when open, hidden when closed
          'fixed left-0 top-0 bottom-0 z-50 lg:relative lg:top-auto lg:bottom-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          // Desktop width behavior
          'w-64',
          // Desktop collapsed state
          !sidebarOpen && 'lg:w-16'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header - only show on mobile when open */}
          {sidebarOpen && (
            <div className="flex items-center justify-between p-4 border-b border-border lg:hidden">
              <h2 className="text-lg font-semibold">Navigation</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Navigation items */}
          <nav className={cn(
            "flex-1 space-y-2 overflow-y-auto",
            sidebarOpen ? "p-4" : "p-2 lg:p-2"
          )}>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePanel === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={!sidebarOpen ? `${item.label} - ${item.description}` : undefined}
                  className={cn(
                    'w-full flex items-center rounded-lg text-left transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    isActive && 'bg-primary text-primary-foreground hover:bg-primary/90',
                    // Collapsed state styling
                    sidebarOpen ? 'gap-3 px-3 py-3' : 'justify-center px-2 py-3 lg:px-2'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.label}</div>
                      <div className={cn(
                        'text-xs truncate',
                        isActive 
                          ? 'text-primary-foreground/80' 
                          : 'text-muted-foreground'
                      )}>
                        {item.description}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar footer - only show when expanded */}
          {sidebarOpen && (
            <div className="border-t border-border">
              <div className="flex items-center justify-center px-4 py-3 min-h-[56px]">
                <div className="text-xs text-muted-foreground">
                  RigBoss v0.1.0
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop toggle button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 hidden lg:flex h-6 w-6 rounded-full border border-border bg-background shadow-md hover:bg-accent z-10"
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
      </aside>
    </>
  );
}
