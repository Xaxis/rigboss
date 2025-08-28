import React from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { Footer } from './footer';
import { ToastContainer } from './toast-container';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Full layout height */}
      <Sidebar />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header />
        
        {/* Main content */}
        <main className="flex-1">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
        
        {/* Footer */}
        <Footer />
      </div>
      
      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}
