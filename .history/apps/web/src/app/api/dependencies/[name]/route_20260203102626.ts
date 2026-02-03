import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/dependencies/[name]
 * Get dependency details by name
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  const { name } = params;
  const decodedName = decodeURIComponent(name);
  
  try {
    // Fetch from npm registry
    const response = await fetch(`https://registry.npmjs.org/${decodedName}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Package not found' },
          { status: 404 }
        );
      }
      throw new Error(`npm registry returned ${response.status}`);
    }

    const data = await response.json();
    const latestVersion = data['dist-tags']?.latest || '';
    const versions = Object.keys(data.versions || {});

    const result = {
      name: data.name,
      description: data.description,
      latestVersion,
      versions: versions.slice(-10).reverse(), // Last 10 versions
      license: data.license,
      repository: data.repository?.url,
      homepage: data.homepage,
      keywords: data.keywords || [],
      maintainers: data.maintainers?.map((m: { name: string; email?: string }) => m.name) || [],
      dependencies: Object.keys(data.versions?.[latestVersion]?.dependencies || {}),
      devDependencies: Object.keys(data.versions?.[latestVersion]?.devDependencies || {}),
      peerDependencies: Object.keys(data.versions?.[latestVersion]?.peerDependencies || {}),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch package:', error);
    return NextResponse.json(
      { error: 'Failed to fetch package details' },
      { status: 500 }
    );
  }
}
