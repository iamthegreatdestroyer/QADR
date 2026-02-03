# QADR Web Dashboard

Interactive web dashboard for visualizing and managing dependency resolution
with the QADR quantum-annealing algorithm.

## Features

- 📊 **Real-time Dashboard** - Overview of dependency health, vulnerabilities,
  and updates
- 🔍 **Dependency Analysis** - Detailed analysis of your package.json
- 🔄 **Resolution Interface** - Run QADR resolution and view results
- 📈 **Benchmarking** - Compare QADR vs npm performance
- 🛡️ **Vulnerability Tracking** - Monitor and fix security issues
- 📱 **Responsive Design** - Works on desktop and mobile

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:3000
```

### Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── analyze/       # Dependency analysis
│   │   │   ├── resolve/       # QADR resolution
│   │   │   ├── benchmark/     # Performance comparison
│   │   │   ├── vulnerabilities/ # Security data
│   │   │   └── dependencies/  # Package info
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Dashboard page
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── Header.tsx         # App header
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── DashboardContent.tsx
│   │   ├── StatsCards.tsx
│   │   ├── DependencyChart.tsx
│   │   ├── VulnerabilityList.tsx
│   │   ├── RecentActivity.tsx
│   │   └── QuickActions.tsx
│   ├── lib/                   # Utilities
│   │   ├── utils.ts           # Helper functions
│   │   └── api.ts             # API client
│   └── test/
│       └── setup.ts           # Test configuration
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

## API Routes

### POST /api/analyze

Analyze dependencies in a package.json manifest.

```typescript
// Request
{
  "dependencies": { "lodash": "^4.17.21" },
  "devDependencies": { "typescript": "^5.3.3" }
}

// Response
{
  "dependencies": [...],
  "vulnerabilities": [...],
  "stats": {
    "total": 10,
    "production": 5,
    "development": 5,
    "outdated": 2,
    "vulnerabilities": { "critical": 0, "high": 1, "medium": 0, "low": 0 }
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### POST /api/resolve

Resolve dependencies using QADR algorithm.

```typescript
// Request
{
  "dependencies": { "react": "^18.2.0" },
  "devDependencies": { "typescript": "^5.3.3" }
}

// Response
{
  "resolved": [
    { "name": "react", "version": "^18.2.0", "resolved": "18.2.0" }
  ],
  "conflicts": [],
  "duration": 150,
  "algorithm": "quantum-annealing"
}
```

### POST /api/benchmark

Run performance comparison between QADR and npm.

```typescript
// Response
{
  "qadr": { "duration": 150, "memory": 50 },
  "npm": { "duration": 1200, "memory": 150 },
  "speedup": 8.0,
  "memoryReduction": 66.7
}
```

## Components

### Header

Navigation header with logo, links, dark mode toggle, and mobile menu.

### Sidebar

Left navigation with primary and secondary navigation sections.

### StatsCards

Overview cards showing total dependencies, vulnerabilities, outdated packages,
and up-to-date count.

### DependencyChart

Bar chart visualization of dependencies by type (production, development, peer).

### VulnerabilityList

List of detected vulnerabilities with severity badges and fix buttons.

### RecentActivity

Timeline of recent actions like resolutions, updates, and vulnerability
detections.

### QuickActions

Buttons for common actions: Resolve, Analyze, Refresh, Export.

## Styling

Uses TailwindCSS with a custom QADR color palette:

```typescript
colors: {
  qadr: {
    50: '#f5f3ff',
    100: '#ede9fe',
    // ... purple gradient to 950
  }
}
```

Custom utility classes:

- `.card`, `.card-header`, `.card-body` - Card components
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost` -
  Buttons
- `.badge`, `.badge-critical`, `.badge-high`, `.badge-medium`, `.badge-low` -
  Severity badges
- `.table`, `.input` - Form elements

## Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage
```

Uses Vitest with React Testing Library and jsdom for component testing.

## Configuration

### Environment Variables

- `NEXT_PUBLIC_API_URL` - API base URL (optional, defaults to same origin)

## License

MIT © QADR Contributors
