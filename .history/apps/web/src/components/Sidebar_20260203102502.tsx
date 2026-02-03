'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  GitBranch,
  BarChart3,
  Shield,
  Package,
  AlertTriangle,
  Settings,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Analyze', href: '/analyze', icon: Search },
  { name: 'Resolve', href: '/resolve', icon: GitBranch },
  { name: 'Benchmarks', href: '/benchmarks', icon: BarChart3 },
];

const secondaryNavigation = [
  { name: 'Dependencies', href: '/dependencies', icon: Package },
  { name: 'Vulnerabilities', href: '/vulnerabilities', icon: Shield },
  { name: 'Conflicts', href: '/conflicts', icon: AlertTriangle },
  { name: 'Reports', href: '/reports', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-gray-200 dark:lg:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
      <nav className="flex-1 px-4 py-6">
        {/* Primary navigation */}
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-qadr-100 text-qadr-700 dark:bg-qadr-900/50 dark:text-qadr-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-gray-200 dark:border-gray-700" />

        {/* Secondary navigation */}
        <div className="space-y-1">
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Reports
          </h3>
          <div className="mt-2 space-y-1">
            {secondaryNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-qadr-100 text-qadr-700 dark:bg-qadr-900/50 dark:text-qadr-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Settings link at bottom */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
            pathname === '/settings'
              ? 'bg-qadr-100 text-qadr-700 dark:bg-qadr-900/50 dark:text-qadr-300'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          )}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
