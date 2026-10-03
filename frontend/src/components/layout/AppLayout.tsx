import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar.js';
import { Toaster } from '@/components/ui/toaster.js';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
