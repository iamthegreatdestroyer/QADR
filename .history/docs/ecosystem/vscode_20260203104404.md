# VS Code Extension

The QADR VS Code extension provides real-time dependency analysis directly in
your editor.

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "QADR"
4. Click **Install**

Or install from the command line:

```bash
code --install-extension iamthegreatdestroyer.qadr
```

## Features

### Inline Diagnostics

The extension analyzes your `package.json` and shows:

- 🔴 **Errors**: Critical vulnerabilities, invalid versions
- 🟡 **Warnings**: High/medium vulnerabilities, very outdated packages
- 🔵 **Info**: Low vulnerabilities, available updates

![Inline Diagnostics](./images/vscode-diagnostics.png)

### Hover Information

Hover over any dependency to see:

- Current version and latest available
- Package description
- Download statistics
- Vulnerability information
- Quick actions

### Quick Fixes

Click the lightbulb or press `Ctrl+.` to see:

- **Update to latest** - Update to the newest version
- **Update to safe version** - Update to patch vulnerabilities
- **Remove dependency** - Remove unused dependencies

### Dependency Tree View

The sidebar shows your complete dependency tree:

```
QADR: Dependencies
├── 📦 react@18.2.0
│   └── 📦 react-dom@18.2.0
├── 📦 lodash@4.17.21 ⚠️ (1 vulnerability)
├── 📦 typescript@5.3.3 (dev)
└── 📦 eslint@8.56.0 (dev)
```

### Command Palette

Press `Ctrl+Shift+P` and type "QADR" to see all commands:

- **QADR: Resolve Dependencies** - Run full resolution
- **QADR: Analyze Dependencies** - Analyze current project
- **QADR: Audit Security** - Check for vulnerabilities
- **QADR: Show Dependency Graph** - Visual graph view
- **QADR: Update All** - Update all dependencies
- **QADR: Clear Cache** - Clear QADR cache

## Configuration

Configure the extension in VS Code settings:

```json
{
  "qadr.enable": true,
  "qadr.autoAnalyze": true,
  "qadr.analysisDelay": 1000,
  "qadr.showInlineHints": true,
  "qadr.vulnerabilityThreshold": "medium",
  "qadr.registry": "https://registry.npmjs.org",
  "qadr.cache.enabled": true,
  "qadr.telemetry": false
}
```

### Settings Reference

| Setting                       | Description                | Default                        |
| ----------------------------- | -------------------------- | ------------------------------ |
| `qadr.enable`                 | Enable the extension       | `true`                         |
| `qadr.autoAnalyze`            | Analyze on file save       | `true`                         |
| `qadr.analysisDelay`          | Delay before analysis (ms) | `1000`                         |
| `qadr.showInlineHints`        | Show inline decorations    | `true`                         |
| `qadr.vulnerabilityThreshold` | Minimum severity to show   | `"medium"`                     |
| `qadr.registry`               | npm registry URL           | `"https://registry.npmjs.org"` |
| `qadr.cache.enabled`          | Enable caching             | `true`                         |
| `qadr.telemetry`              | Send anonymous usage data  | `false`                        |

## Keyboard Shortcuts

| Shortcut       | Command              |
| -------------- | -------------------- |
| `Ctrl+Shift+Q` | Open QADR panel      |
| `Ctrl+Alt+R`   | Resolve dependencies |
| `Ctrl+Alt+A`   | Analyze dependencies |

## Workspace Recommendations

For team consistency, add to `.vscode/extensions.json`:

```json
{
  "recommendations": ["iamthegreatdestroyer.qadr"]
}
```

And shared settings in `.vscode/settings.json`:

```json
{
  "qadr.vulnerabilityThreshold": "high",
  "qadr.autoAnalyze": true
}
```

## Troubleshooting

### Extension Not Working

1. Check that you have a `package.json` in your workspace
2. Ensure Node.js 18+ is installed
3. Try **QADR: Clear Cache**
4. Reload VS Code window

### Slow Analysis

1. Reduce `analysisDelay` setting
2. Enable caching
3. Check network connectivity to registry

### Missing Vulnerabilities

1. Update to latest extension version
2. Run **QADR: Audit Security** manually
3. Check if package is in vulnerability database

## Status Bar

The status bar shows QADR status:

- ✓ **QADR** - All good
- ⚠️ **QADR (3)** - 3 issues found
- ⟳ **QADR** - Analyzing...
- ✗ **QADR** - Error (click for details)

Click the status bar item to open the QADR panel.
