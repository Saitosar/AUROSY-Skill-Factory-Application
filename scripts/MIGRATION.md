# Monorepo Migration Guide

## Overview

Two repositories are being merged into one:

| Old Repo | New Location | Description |
|----------|-------------|-------------|
| `AUROSY-Skill-Factory-Application` | `app/` | React SPA, landing, admin |
| `AUROSY-Skill-Factory-Platform` | `platform/` | ML, RL training, MuJoCo |

The new unified repo: **`AUROSY-Skill-Factory`**

## What Changes for Developers

### Path Changes
| Before | After |
|--------|-------|
| `web/frontend/src/` | `app/web/frontend/src/` |
| `docs/` | `app/docs/` |
| `packages/skill_foundry/` | `platform/packages/skill_foundry/` |
| `models/g1_browser/` | `platform/models/g1_browser/` |
| `docker/` | `platform/docker/` |

### Commit Messages
| Before | After |
|--------|-------|
| `Landing: add hero` | `app/Landing: add hero` |
| `RL: add reward` | `platform/RL: add reward` |

### Deploy Script
| Before | After |
|--------|-------|
| `./deploy.sh frontend` (from app root) | `./deploy.sh frontend` (from monorepo root) |

### AI Agent Instructions
| Before | After |
|--------|-------|
| Each repo has own `.cursorrules` etc. | Monorepo root has unified rules for all agents |
| `.github/copilot-instructions.md` is app-only | Covers both `app/` and `platform/` |

## Migration Steps

### Automated (recommended)
```bash
cd /path/to/parent/  # where both repos are cloned
bash AUROSY-Skill-Factory-Application/scripts/merge-repos.sh
```

### Manual
1. Create new repo `AUROSY-Skill-Factory`
2. Move Application files into `app/`
3. Move Platform files into `platform/`
4. Copy root files from `scripts/monorepo-root/`
5. Push to GitHub

## After Migration

1. Clone the new monorepo:
   ```bash
   git clone https://github.com/Saitosar/AUROSY-Skill-Factory.git
   cd AUROSY-Skill-Factory
   ```

2. Frontend development:
   ```bash
   cd app/web/frontend
   npm install
   npm run dev
   ```

3. Platform development:
   ```bash
   cd platform
   python -m venv venv && source venv/bin/activate
   pip install -e "packages/skill_foundry[rl]"
   ```

4. Deploy:
   ```bash
   ./deploy.sh frontend
   ```

## Files Preserved

All AI agent instruction files are pre-built in `scripts/monorepo-root/` and will be automatically placed at the monorepo root during migration:

```
scripts/monorepo-root/
├── .github/
│   ├── copilot-instructions.md    ← Full monorepo instructions
│   └── PULL_REQUEST_TEMPLATE.md   ← PR template with module checkboxes
├── .cursorrules                   ← Cursor AI
├── .clinerules                    ← Cline
├── .windsurfrules                 ← Windsurf
├── .gitignore                     ← Merged gitignore (app + platform)
├── CONTRIBUTING.md                ← Monorepo workflow
├── deploy.sh                      ← Unified deploy script
└── README.md                      ← Monorepo README
```

## Old Repos (after migration)

After verifying the monorepo works:
1. Archive old repos on GitHub (Settings → Danger Zone → Archive)
2. Update any CI/CD references
3. Update SSH deploy paths if needed
