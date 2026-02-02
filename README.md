# MTA VSCode Extension (Release-0.2 Build)

This repository contains the build configuration and scripts to create Migration Toolkit for Applications (MTA) branded VSCode extensions based on the `release-0.2` branch of `konveyor/editor-extensions`.

## Overview

This implements a "pointer build" strategy where:
- We track a specific commit from `konveyor/editor-extensions` release-0.2 branch
- We apply MTA branding during the build process via prebuild hooks
- We produce `mta-vscode-extension` VSIX files ready for distribution

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Pull upstream and prepare workspace**:
   ```bash
   npm run pull-upstream
   ```

3. **Build the MTA extension**:
   ```bash
   cd .upstream-workspace
   npm ci
   npm run build
   npm run dist
   npm run package
   ```

The resulting `.vsix` file will be in `.upstream-workspace/dist/`.

## Configuration

### mta-build.yaml

The main configuration file that defines:
- Which upstream commit to build from
- MTA branding settings (version, publisher, URLs)
- Asset mappings

### Updating Upstream Reference

To update to a newer commit from release-0.2:

```bash
./scripts/update-upstream.sh release-0.2
```

To use a specific tag:

```bash
./scripts/update-upstream.sh v0.2.1
```

## Development Workflow

### Local Development

1. Pull upstream: `npm run pull-upstream`
2. Enter workspace: `cd .upstream-workspace`
3. Install deps: `npm ci`
4. Start dev mode: `npm run dev`

### Making Changes

- **Branding changes**: Edit `scripts/apply-branding.js`
- **Assets**: Add files to `assets/branding/` directory
- **Upstream version**: Use `./scripts/update-upstream.sh`

### Testing

Test the full build process:

```bash
npm run pull-upstream
cd .upstream-workspace
npm ci
npm run build
npm run package
```

Install the resulting `.vsix` in VSCode to verify branding.

## CI/CD

The `.github/workflows/ci.yml` workflow:

1. **Triggers**: On push to `release-0.2` branch, PRs, or manual dispatch
2. **Process**: Pull upstream → Apply branding → Build → Package → Test
3. **Artifacts**: Uploads `.vsix` files
4. **Publishing**:
   - Development builds → `development-builds` release
   - Tagged releases → Full GitHub releases

## Directory Structure

```
migtools-release02/
├── mta-build.yaml           # Main configuration
├── package.json             # Build orchestrator
├── scripts/
│   ├── pull-upstream.js     # Fetch and prepare upstream code
│   ├── apply-branding.js    # Apply MTA branding transformations
│   └── update-upstream.sh   # Update upstream reference
├── assets/
│   ├── branding/            # MTA-specific assets
│   │   ├── sidebar-icons/   # VSCode activity bar icons
│   │   ├── avatars/         # Webview avatar images
│   │   └── README.md        # Extension marketplace description
│   └── README.md            # Asset documentation
├── .github/workflows/
│   └── ci.yml               # Build and release automation
└── .upstream-workspace/     # Generated workspace (gitignored)
```

## Asset Requirements

For full branding, provide these assets:

- `assets/branding/sidebar-icons/icon.png` - VSCode activity bar icon
- `assets/branding/avatars/avatar.svg` - Webview UI avatar
- `assets/branding/README.md` - Extension marketplace description

If assets are missing, the build will continue with warnings.

## Troubleshooting

### Clean Start

```bash
npm run clean
npm run pull-upstream
```

### Workspace Issues

```bash
rm -rf .upstream-workspace
npm run pull-upstream
```

### Build Failures

Check that you have the correct Node.js version:
```bash
node --version  # Should be 18+
```

## Architecture Notes

This release-0.2 build targets the **single-extension** architecture of the upstream release-0.2 branch, which has:

- Single extension at `vscode/package.json`
- Simpler build process (no multi-extension complexity)
- Different dependency versions than main branch

This is in contrast to the `main` branch which uses a multi-extension architecture.

## Contributing

1. Fork this repository
2. Create a feature branch
3. Test changes with `npm run pull-upstream && cd .upstream-workspace && npm ci && npm run build`
4. Submit a pull request

## License

Apache 2.0 - see [LICENSE](LICENSE) file for details.