import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  FileText,
  BarChart2,
  Settings,
  LogOut,
  Bot,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext.js';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.js';
import { Avatar, AvatarFallback } from '@/components/ui/avatar.js';
import { Separator } from '@/components/ui/separator.js';
import { useState } from 'react';

interface SidebarProps {
  className?: string;
}

const navItems = [
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
];

const adminNavItems = [
  { to: '/admin', icon: BarChart2, label: 'Dashboard' },
  { to: '/admin/documents', icon: FileText, label: 'Documents' },
];

export function Sidebar({ className }: SidebarProps) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNewChat = () => {
    navigate('/chat');
  };

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">AI Support</span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary mx-auto">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn('h-7 w-7 shrink-0', collapsed && 'mx-auto')}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={handleNewChat}
          variant="outline"
          className={cn('w-full gap-2', collapsed && 'px-0')}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span>New Chat</span>}
        </Button>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center px-2'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <Separator className="my-2" />
            {!collapsed && (
              <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Admin
              </p>
            )}
            {adminNavItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    collapsed && 'justify-center px-2'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <Separator />

      {/* User section */}
      <div className={cn('p-3 flex items-center gap-3', collapsed && 'justify-center')}>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs">
            {user?.email?.charAt(0).toUpperCase() ?? 'U'}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
