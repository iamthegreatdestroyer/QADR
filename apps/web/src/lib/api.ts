import { z } from 'zod';

// API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// Request options type
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

// API response type
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * Make an API request with error handling
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, signal } = options;

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: data.message || data.error || 'An error occurred',
        status: response.status,
      };
    }

    return {
      data,
      error: null,
      status: response.status,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        data: null,
        error: 'Request was cancelled',
        status: 0,
      };
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : 'An error occurred',
      status: 0,
    };
  }
}

// Schemas for API responses
const DependencySchema = z.object({
  name: z.string(),
  version: z.string(),
  type: z.enum(['production', 'development', 'optional', 'peer']),
  latestVersion: z.string().optional(),
  hasUpdate: z.boolean().optional(),
});

const VulnerabilitySchema = z.object({
  id: z.string(),
  package: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  title: z.string(),
  description: z.string().optional(),
  version: z.string(),
  fixedIn: z.string().optional(),
  url: z.string().optional(),
});

const AnalysisResultSchema = z.object({
  dependencies: z.array(DependencySchema),
  vulnerabilities: z.array(VulnerabilitySchema),
  stats: z.object({
    total: z.number(),
    production: z.number(),
    development: z.number(),
    optional: z.number(),
    peer: z.number(),
    outdated: z.number(),
    vulnerabilities: z.object({
      critical: z.number(),
      high: z.number(),
      medium: z.number(),
      low: z.number(),
    }),
  }),
  timestamp: z.string(),
});

const ResolutionResultSchema = z.object({
  resolved: z.array(z.object({
    name: z.string(),
    version: z.string(),
    resolved: z.string(),
  })),
  conflicts: z.array(z.object({
    package: z.string(),
    requested: z.array(z.string()),
    resolved: z.string().optional(),
  })),
  duration: z.number(),
  algorithm: z.string(),
});

// Type exports
export type Dependency = z.infer<typeof DependencySchema>;
export type Vulnerability = z.infer<typeof VulnerabilitySchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type ResolutionResult = z.infer<typeof ResolutionResultSchema>;

// API client
export const api = {
  /**
   * Analyze dependencies in a manifest
   */
  async analyze(manifest: unknown): Promise<ApiResponse<AnalysisResult>> {
    const response = await request<AnalysisResult>('/api/analyze', {
      method: 'POST',
      body: manifest,
    });

    if (response.data) {
      const parsed = AnalysisResultSchema.safeParse(response.data);
      if (!parsed.success) {
        return {
          data: null,
          error: 'Invalid response format',
          status: response.status,
        };
      }
      return { ...response, data: parsed.data };
    }

    return response;
  },

  /**
   * Resolve dependencies
   */
  async resolve(manifest: unknown): Promise<ApiResponse<ResolutionResult>> {
    const response = await request<ResolutionResult>('/api/resolve', {
      method: 'POST',
      body: manifest,
    });

    if (response.data) {
      const parsed = ResolutionResultSchema.safeParse(response.data);
      if (!parsed.success) {
        return {
          data: null,
          error: 'Invalid response format',
          status: response.status,
        };
      }
      return { ...response, data: parsed.data };
    }

    return response;
  },

  /**
   * Get vulnerability details
   */
  async getVulnerability(id: string): Promise<ApiResponse<Vulnerability>> {
    return request<Vulnerability>(`/api/vulnerabilities/${id}`);
  },

  /**
   * Get dependency details
   */
  async getDependency(name: string): Promise<ApiResponse<Dependency>> {
    return request<Dependency>(`/api/dependencies/${encodeURIComponent(name)}`);
  },

  /**
   * Run benchmark
   */
  async benchmark(manifest: unknown): Promise<ApiResponse<{
    qadr: { duration: number; memory: number };
    npm: { duration: number; memory: number };
    speedup: number;
  }>> {
    return request('/api/benchmark', {
      method: 'POST',
      body: manifest,
    });
  },
};

export { request };
