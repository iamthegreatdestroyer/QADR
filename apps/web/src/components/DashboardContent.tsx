'use client';

import { useState } from 'react';
import { StatsCards } from './StatsCards';
import { DependencyChart } from './DependencyChart';
import { VulnerabilityList } from './VulnerabilityList';
import { RecentActivity } from './RecentActivity';
import { QuickActions } from './QuickActions';

export function DashboardContent() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Overview of your project&apos;s dependency health
          </p>
        </div>
        <QuickActions onActionStart={() => setIsLoading(true)} onActionEnd={() => setIsLoading(false)} />
      </div>

      {/* Stats cards */}
      <StatsCards />

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dependency chart */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Dependency Overview
            </h2>
          </div>
          <div className="card-body">
            <DependencyChart />
          </div>
        </div>

        {/* Vulnerabilities */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Vulnerabilities
            </h2>
            <a
              href="/vulnerabilities"
              className="text-sm text-qadr-600 hover:text-qadr-700 dark:text-qadr-400 dark:hover:text-qadr-300"
            >
              View all →
            </a>
          </div>
          <div className="card-body">
            <VulnerabilityList />
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h2>
            <a
              href="/reports"
              className="text-sm text-qadr-600 hover:text-qadr-700 dark:text-qadr-400 dark:hover:text-qadr-300"
            >
              View all →
            </a>
          </div>
          <div className="card-body">
            <RecentActivity />
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-qadr-500 border-t-transparent" />
              <span className="text-gray-900 dark:text-white">Processing...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
