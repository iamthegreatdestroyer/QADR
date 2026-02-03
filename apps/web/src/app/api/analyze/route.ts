import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/analyze
 * Analyze dependencies in a package.json manifest
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    if (!body.dependencies && !body.devDependencies) {
      return NextResponse.json(
        { error: 'Invalid manifest: missing dependencies' },
        { status: 400 }
      );
    }

    // Mock analysis result for demo
    const dependencies = Object.entries(body.dependencies || {}).map(([name, version]) => ({
      name,
      version: version as string,
      type: 'production' as const,
      latestVersion: version as string,
      hasUpdate: Math.random() > 0.8,
    }));

    const devDependencies = Object.entries(body.devDependencies || {}).map(([name, version]) => ({
      name,
      version: version as string,
      type: 'development' as const,
      latestVersion: version as string,
      hasUpdate: Math.random() > 0.7,
    }));

    const allDeps = [...dependencies, ...devDependencies];
    const outdated = allDeps.filter((d) => d.hasUpdate).length;

    // Generate mock vulnerabilities
    const vulnerabilities = [
      {
        id: 'GHSA-1234-abcd-5678',
        package: 'lodash',
        severity: 'critical' as const,
        title: 'Prototype Pollution in lodash',
        description: 'Versions of lodash prior to 4.17.21 are vulnerable to Prototype Pollution.',
        version: '4.17.15',
        fixedIn: '4.17.21',
        url: 'https://github.com/advisories/GHSA-1234-abcd-5678',
      },
    ].filter(() => allDeps.some((d) => d.name === 'lodash'));

    const result = {
      dependencies: allDeps,
      vulnerabilities,
      stats: {
        total: allDeps.length,
        production: dependencies.length,
        development: devDependencies.length,
        optional: 0,
        peer: 0,
        outdated,
        vulnerabilities: {
          critical: vulnerabilities.filter((v) => v.severity === 'critical').length,
          high: vulnerabilities.filter((v) => v.severity === 'high').length,
          medium: vulnerabilities.filter((v) => v.severity === 'medium').length,
          low: vulnerabilities.filter((v) => v.severity === 'low').length,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze dependencies' },
      { status: 500 }
    );
  }
}
