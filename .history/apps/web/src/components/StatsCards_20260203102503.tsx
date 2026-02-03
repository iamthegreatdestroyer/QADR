'use client';

import { Package, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

const stats = [
  {
    name: 'Total Dependencies',
    value: '142',
    change: '+3',
    changeType: 'neutral' as const,
    icon: Package,
  },
  {
    name: 'Vulnerabilities',
    value: '5',
    change: '-2',
    changeType: 'positive' as const,
    icon: Shield,
  },
  {
    name: 'Outdated',
    value: '18',
    change: '+4',
    changeType: 'negative' as const,
    icon: AlertTriangle,
  },
  {
    name: 'Up to Date',
    value: '119',
    change: '+5',
    changeType: 'positive' as const,
    icon: CheckCircle,
  },
];

export function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.name} className="card">
          <div className="card-body flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-qadr-100 dark:bg-qadr-900/50">
              <stat.icon className="h-6 w-6 text-qadr-600 dark:text-qadr-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {stat.name}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                <span
                  className={`text-sm font-medium ${
                    stat.changeType === 'positive'
                      ? 'text-green-600 dark:text-green-400'
                      : stat.changeType === 'negative'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {stat.change}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
