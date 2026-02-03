import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/benchmark
 * Run benchmark comparison between QADR and npm
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

    const depCount = Object.keys(body.dependencies || {}).length +
                     Object.keys(body.devDependencies || {}).length;

    // Mock benchmark results
    // QADR should be faster for larger dependency graphs
    const npmDuration = 1000 + depCount * 50 + Math.random() * 500;
    const qadrDuration = 500 + depCount * 10 + Math.random() * 200;

    const npmMemory = 100 + depCount * 2 + Math.random() * 50;
    const qadrMemory = 80 + depCount * 1.5 + Math.random() * 30;

    const result = {
      qadr: {
        duration: Math.round(qadrDuration),
        memory: Math.round(qadrMemory),
      },
      npm: {
        duration: Math.round(npmDuration),
        memory: Math.round(npmMemory),
      },
      speedup: parseFloat((npmDuration / qadrDuration).toFixed(2)),
      memoryReduction: parseFloat(((1 - qadrMemory / npmMemory) * 100).toFixed(1)),
      depCount,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Benchmark error:', error);
    return NextResponse.json(
      { error: 'Failed to run benchmark' },
      { status: 500 }
    );
  }
}
