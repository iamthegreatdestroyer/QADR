'use client';

import { useState } from 'react';
import { Play, Search, RefreshCw, Download } from 'lucide-react';

interface QuickActionsProps {
  onActionStart?: () => void;
  onActionEnd?: () => void;
}

export function QuickActions({ onActionStart, onActionEnd }: QuickActionsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setIsLoading(action);
    onActionStart?.();
    
    // Simulate action
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setIsLoading(null);
    onActionEnd?.();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => handleAction('resolve')}
        disabled={isLoading !== null}
        className="btn btn-primary"
      >
        {isLoading === 'resolve' ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Play className="h-4 w-4 mr-2" />
        )}
        Resolve
      </button>
      
      <button
        onClick={() => handleAction('analyze')}
        disabled={isLoading !== null}
        className="btn btn-secondary"
      >
        {isLoading === 'analyze' ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Search className="h-4 w-4 mr-2" />
        )}
        Analyze
      </button>
      
      <button
        onClick={() => handleAction('refresh')}
        disabled={isLoading !== null}
        className="btn btn-secondary"
      >
        {isLoading === 'refresh' ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        Refresh
      </button>
      
      <button
        onClick={() => handleAction('export')}
        disabled={isLoading !== null}
        className="btn btn-ghost"
      >
        <Download className="h-4 w-4 mr-2" />
        Export
      </button>
    </div>
  );
}
