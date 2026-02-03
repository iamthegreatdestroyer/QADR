/**
 * Manifest Parser
 *
 * Parse package.json and locate dependencies.
 *
 * @module @qadr/vscode/utils/manifest
 */

import * as vscode from 'vscode';
import type { PackageLocation, DependencyType } from '../types';

/**
 * Section names in package.json.
 */
const DEPENDENCY_SECTIONS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

type DependencySection = typeof DEPENDENCY_SECTIONS[number];

/**
 * Parse a package.json document and extract dependency locations.
 */
export function parseManifest(document: vscode.TextDocument): PackageLocation[] {
  const locations: PackageLocation[] = [];
  const text = document.getText();
  
  try {
    const manifest = JSON.parse(text);
    
    for (const sectionName of DEPENDENCY_SECTIONS) {
      const section = manifest[sectionName];
      if (!section || typeof section !== 'object') continue;
      
      for (const [name, version] of Object.entries(section)) {
        const location = findPackageLocation(
          text,
          sectionName,
          name,
          version as string
        );
        
        if (location) {
          locations.push(location);
        }
      }
    }
  } catch {
    // Invalid JSON, return empty
  }
  
  return locations;
}

/**
 * Find the location of a package in the manifest text.
 */
function findPackageLocation(
  text: string,
  section: DependencySection,
  name: string,
  version: string
): PackageLocation | undefined {
  // Find the section
  const sectionPattern = new RegExp(`"${section}"\\s*:\\s*\\{`, 'g');
  const sectionMatch = sectionPattern.exec(text);
  
  if (!sectionMatch) return undefined;
  
  // Find the package within the section
  const afterSection = text.slice(sectionMatch.index);
  const packagePattern = new RegExp(`"${escapeRegex(name)}"\\s*:\\s*"([^"]*)"`, 'g');
  const packageMatch = packagePattern.exec(afterSection);
  
  if (!packageMatch) return undefined;
  
  // Calculate line and character
  const absoluteIndex = sectionMatch.index + packageMatch.index;
  const beforeMatch = text.slice(0, absoluteIndex);
  const lines = beforeMatch.split('\n');
  const line = lines.length - 1;
  const lastLine = lines[lines.length - 1] ?? '';
  const character = lastLine.length;
  
  return {
    name,
    version,
    line,
    character,
    section: mapSection(section),
  };
}

/**
 * Map section name to dependency type.
 */
function mapSection(section: DependencySection): PackageLocation['section'] {
  switch (section) {
    case 'dependencies':
      return 'dependencies';
    case 'devDependencies':
      return 'devDependencies';
    case 'optionalDependencies':
      return 'optionalDependencies';
    case 'peerDependencies':
      return 'peerDependencies';
  }
}

/**
 * Get dependency type from section.
 */
export function getDependencyType(section: PackageLocation['section']): DependencyType {
  switch (section) {
    case 'dependencies':
      return 'production';
    case 'devDependencies':
      return 'development';
    case 'optionalDependencies':
      return 'optional';
    case 'peerDependencies':
      return 'peer';
  }
}

/**
 * Find a package location at a specific position.
 */
export function findPackageAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): PackageLocation | undefined {
  const locations = parseManifest(document);
  
  for (const location of locations) {
    const range = new vscode.Range(
      location.line,
      location.character,
      location.line,
      location.character + `"${location.name}"`.length
    );
    
    if (range.contains(position)) {
      return location;
    }
  }
  
  return undefined;
}

/**
 * Get the range for a package name in the document.
 */
export function getPackageRange(
  document: vscode.TextDocument,
  packageName: string
): vscode.Range | undefined {
  const locations = parseManifest(document);
  const location = locations.find(l => l.name === packageName);
  
  if (!location) return undefined;
  
  // Find the full line with the package
  const line = document.lineAt(location.line);
  const nameStart = line.text.indexOf(`"${packageName}"`);
  
  if (nameStart === -1) return undefined;
  
  // Find the end of the version string
  const versionMatch = line.text.match(
    new RegExp(`"${escapeRegex(packageName)}"\\s*:\\s*"[^"]*"`)
  );
  
  if (!versionMatch || versionMatch.index === undefined) return undefined;
  
  return new vscode.Range(
    location.line,
    versionMatch.index,
    location.line,
    versionMatch.index + versionMatch[0].length
  );
}

/**
 * Escape special regex characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
