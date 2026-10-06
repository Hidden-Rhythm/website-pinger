'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/navigation/Sidebar';
import { TopBar } from '@/components/navigation/TopBar';
import { CommandPalette } from '@/components/navigation/CommandPalette';
import { ToastProvider } from '@/components/ui/Toast';
import { globalScheduler } from '@/lib/monitoring/scheduler';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Start central monitoring scheduler while Pulse is open
    globalScheduler.start();

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // We keep scheduler running or let it pause if navigating away
    };
  }, []);

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-background text-text-primary">
        {/* Desktop Sidebar */}
        <Sidebar className="hidden md:flex flex-shrink-0" />

        {/* Mobile Sidebar Overlay Drawer */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden animate-in fade-in duration-150"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div
              className="w-72 max-w-[85vw] h-full bg-surface shadow-2xl relative animate-in slide-in-from-left duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar
                className="w-full h-full border-r-0"
                onNavigate={() => setIsMobileMenuOpen(false)}
                onClose={() => setIsMobileMenuOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          />
          <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>

        {/* Command Palette Modal */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      </div>
    </ToastProvider>
  );
}
