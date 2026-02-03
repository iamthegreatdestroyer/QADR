'use client';

import { GitBranch, Package, Shield, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils';

const activities = [
  {
    id: 1,
    type: 'resolve' as const,
    message: 'Dependency resolution completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    details: '142 packages resolved in 2.3s',
  },
  {
    id: 2,
    type: 'update' as const,
    message: 'Updated lodash to 4.17.21',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    details: 'Fixed critical vulnerability',
  },
  {
    id: 3,
    type: 'vulnerability' as const,
    message: 'New vulnerability detected',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    details: 'GHSA-1234-abcd-5678 in axios',
  },
  {
    id: 4,
    type: 'success' as const,
    message: 'All dependencies up to date',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    details: 'Last full analysis completed',
  },
];

const typeConfig = {
  resolve: {
    icon: GitBranch,
    className: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
  },
  update: {
    icon: Package,
    className: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
  },
  vulnerability: {
    icon: Shield,
    className: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
  },
  success: {
    icon: CheckCircle,
    className: 'bg-qadr-100 text-qadr-600 dark:bg-qadr-900/50 dark:text-qadr-400',
  },
};

export function RecentActivity() {
  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const config = typeConfig[activity.type];
        const Icon = config.icon;
        
        return (
          <div key={activity.id} className="flex items-start gap-4">
            <div className={`p-2 rounded-lg ${config.className}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {activity.message}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {activity.details}
              </p>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {formatDistanceToNow(activity.timestamp)}
            </span>
          </div>
        );
      })}
      
      {activities.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No recent activity</p>
        </div>
      )}
    </div>
  );
}
