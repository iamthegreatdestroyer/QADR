import { NextRequest, NextResponse } from 'next/server';

// Mock vulnerability database
const vulnerabilities: Record<string, {
  id: string;
  package: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  version: string;
  fixedIn: string;
  url: string;
  cwe: string[];
  references: string[];
}> = {
  'GHSA-1234-abcd-5678': {
    id: 'GHSA-1234-abcd-5678',
    package: 'lodash',
    severity: 'critical',
    title: 'Prototype Pollution in lodash',
    description: 'Versions of lodash prior to 4.17.21 are vulnerable to Prototype Pollution via the set and zipObjectDeep functions.',
    version: '< 4.17.21',
    fixedIn: '4.17.21',
    url: 'https://github.com/advisories/GHSA-1234-abcd-5678',
    cwe: ['CWE-1321'],
    references: [
      'https://nvd.nist.gov/vuln/detail/CVE-2021-23337',
      'https://snyk.io/vuln/SNYK-JS-LODASH-1040724',
    ],
  },
  'GHSA-5678-efgh-1234': {
    id: 'GHSA-5678-efgh-1234',
    package: 'axios',
    severity: 'high',
    title: 'Server-Side Request Forgery in axios',
    description: 'axios before 0.21.2 allows a server-side request forgery (SSRF) attack.',
    version: '< 0.21.2',
    fixedIn: '0.21.2',
    url: 'https://github.com/advisories/GHSA-5678-efgh-1234',
    cwe: ['CWE-918'],
    references: [
      'https://nvd.nist.gov/vuln/detail/CVE-2021-3749',
    ],
  },
};

/**
 * GET /api/vulnerabilities/[id]
 * Get vulnerability details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  const vulnerability = vulnerabilities[id];
  
  if (!vulnerability) {
    return NextResponse.json(
      { error: 'Vulnerability not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(vulnerability);
}
