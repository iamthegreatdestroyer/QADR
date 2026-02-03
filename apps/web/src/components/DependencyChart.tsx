'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const data = [
  { name: 'Production', dependencies: 45, devDependencies: 0, peer: 2 },
  { name: 'Development', dependencies: 0, devDependencies: 78, peer: 0 },
  { name: 'Optional', dependencies: 5, devDependencies: 3, peer: 0 },
  { name: 'Peer', dependencies: 0, devDependencies: 0, peer: 9 },
];

const colors = {
  dependencies: '#8b5cf6',
  devDependencies: '#a78bfa',
  peer: '#c4b5fd',
};

export function DependencyChart() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="name"
            className="text-sm"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis
            className="text-sm"
            tick={{ fill: 'currentColor' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg, #fff)',
              borderColor: 'var(--tooltip-border, #e5e7eb)',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="dependencies" name="Production" fill={colors.dependencies} radius={[4, 4, 0, 0]} />
          <Bar dataKey="devDependencies" name="Development" fill={colors.devDependencies} radius={[4, 4, 0, 0]} />
          <Bar dataKey="peer" name="Peer" fill={colors.peer} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded" style={{ backgroundColor: colors.dependencies }} />
          <span className="text-sm text-gray-600 dark:text-gray-400">Production</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded" style={{ backgroundColor: colors.devDependencies }} />
          <span className="text-sm text-gray-600 dark:text-gray-400">Development</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded" style={{ backgroundColor: colors.peer }} />
          <span className="text-sm text-gray-600 dark:text-gray-400">Peer</span>
        </div>
      </div>
    </div>
  );
}
