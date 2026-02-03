import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'QADR',
  description: 'Quantum-Annealed Dependency Resolution',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#7c3aed' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:site_name', content: 'QADR' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'Config', link: '/config/' },
      {
        text: 'Ecosystem',
        items: [
          { text: 'CLI', link: '/ecosystem/cli' },
          { text: 'VS Code Extension', link: '/ecosystem/vscode' },
          { text: 'Web Dashboard', link: '/ecosystem/web' },
          { text: 'GitHub Action', link: '/ecosystem/github-action' },
        ],
      },
      {
        text: 'Links',
        items: [
          { text: 'GitHub', link: 'https://github.com/iamthegreatdestroyer/QADR' },
          { text: 'npm', link: 'https://www.npmjs.com/package/@qadr/core' },
          { text: 'Changelog', link: 'https://github.com/iamthegreatdestroyer/QADR/releases' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is QADR?', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Why QADR?', link: '/guide/why-qadr' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Quantum Annealing', link: '/guide/quantum-annealing' },
            { text: 'Dependency Resolution', link: '/guide/dependency-resolution' },
            { text: 'Conflict Resolution', link: '/guide/conflict-resolution' },
            { text: 'Vulnerability Scanning', link: '/guide/vulnerability-scanning' },
          ],
        },
        {
          text: 'Guides',
          items: [
            { text: 'Migration from npm/yarn', link: '/guide/migration' },
            { text: 'Monorepo Setup', link: '/guide/monorepo' },
            { text: 'CI/CD Integration', link: '/guide/cicd' },
            { text: 'Performance Tuning', link: '/guide/performance' },
          ],
        },
      ],
      '/api/': [
        {
          text: '@qadr/core',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Resolver', link: '/api/resolver' },
            { text: 'Analyzer', link: '/api/analyzer' },
            { text: 'Cache', link: '/api/cache' },
            { text: 'Registry', link: '/api/registry' },
          ],
        },
        {
          text: '@qadr/semver',
          items: [
            { text: 'Overview', link: '/api/semver' },
            { text: 'parse()', link: '/api/semver-parse' },
            { text: 'satisfies()', link: '/api/semver-satisfies' },
            { text: 'compare()', link: '/api/semver-compare' },
          ],
        },
        {
          text: '@qadr/shared',
          items: [
            { text: 'Types', link: '/api/types' },
            { text: 'Errors', link: '/api/errors' },
            { text: 'Utilities', link: '/api/utilities' },
          ],
        },
      ],
      '/config/': [
        {
          text: 'Configuration',
          items: [
            { text: 'Overview', link: '/config/' },
            { text: 'qadr.config.ts', link: '/config/file' },
            { text: 'Environment Variables', link: '/config/environment' },
            { text: 'CLI Flags', link: '/config/cli' },
          ],
        },
        {
          text: 'Options',
          items: [
            { text: 'Resolver Options', link: '/config/resolver' },
            { text: 'Cache Options', link: '/config/cache' },
            { text: 'Security Options', link: '/config/security' },
            { text: 'Output Options', link: '/config/output' },
          ],
        },
      ],
      '/ecosystem/': [
        {
          text: 'Ecosystem',
          items: [
            { text: 'CLI', link: '/ecosystem/cli' },
            { text: 'VS Code Extension', link: '/ecosystem/vscode' },
            { text: 'Web Dashboard', link: '/ecosystem/web' },
            { text: 'GitHub Action', link: '/ecosystem/github-action' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/iamthegreatdestroyer/QADR' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 QADR Contributors',
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/iamthegreatdestroyer/QADR/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: true,
  },

  sitemap: {
    hostname: 'https://qadr.dev',
  },
});
