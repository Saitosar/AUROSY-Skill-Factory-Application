# AUROSY Skill Factory — AI Agent Instructions (Monorepo)

> **READ THIS FILE FIRST** before making any changes to the codebase.
> This document is automatically loaded by GitHub Copilot and other AI coding agents.

## Project Overview

AUROSY Skill Factory — платформа для создания навыков гуманоидных роботов.
Монорепозиторий с двумя основными модулями.

## Monorepo Structure

```
AUROSY-Skill-Factory/
├── app/                          ← Web Application (React + landing)
│   ├── web/frontend/             ← React 18 + TypeScript + Vite + Tailwind
│   │   └── src/
│   │       ├── pages/            ← Page components
│   │       ├── components/       ← Shared components
│   │       ├── contexts/         ← React contexts (AuthContext)
│   │       ├── api/              ← API client
│   │       └── styles.css        ← Global styles
│   ├── docs/                     ← Frontend documentation
│   ├── deploy.sh                 ← Frontend deploy script
│   └── CONTRIBUTING.md           ← Frontend contributing guide
│
├── platform/                     ← ML Platform (Python + RL training)
│   ├── packages/skill_foundry/   ← Core Python package (9 subpackages)
│   ├── web/backend/              ← Platform FastAPI (jobs, artifacts)
│   ├── models/                   ← MuJoCo robot models (G1)
│   ├── docker/                   ← Docker configs
│   ├── docs/                     ← Platform documentation
│   ├── unitree_mujoco/           ← Unitree MuJoCo (submodule)
│   ├── unitree_sdk2/             ← Unitree SDK2 (submodule)
│   └── unitree_sdk2_python/      ← Unitree SDK2 Python (submodule)
│
├── .github/
│   ├── copilot-instructions.md   ← THIS FILE
│   └── PULL_REQUEST_TEMPLATE.md  ← PR template
├── .cursorrules                  ← Cursor AI rules
├── .clinerules                   ← Cline rules
├── .windsurfrules                ← Windsurf rules
├── CONTRIBUTING.md               ← Monorepo contributing guide
├── deploy.sh                     ← Unified deploy script
└── README.md
```

## Which Module to Edit?

| Task | Module | Path |
|------|--------|------|
| Landing page, UI, auth, admin panel | **app** | `app/web/frontend/src/` |
| API endpoints (auth, users, projects) | **backend** | External: `aurosy-backend/` |
| RL training, rewards, environments | **platform** | `platform/packages/skill_foundry/` |
| MuJoCo simulations, robot models | **platform** | `platform/models/`, `platform/unitree_mujoco/` |
| Platform API (jobs, artifacts) | **platform** | `platform/web/backend/` |
| Docker configs | **platform** | `platform/docker/` |

## Mandatory Workflow

### Before Starting Work
1. **ALWAYS** `git pull origin main` before making changes
2. **ALWAYS** `git status` to ensure clean working tree
3. **ALWAYS** read this file before first session
4. **NEVER** make changes directly on the production server

### Making Changes
1. Make changes locally
2. Verify:
   - Frontend: `cd app/web/frontend && npm run build && npm run typecheck`
   - Platform Python: `cd platform && python -m pytest` (if tests exist)
3. Commit with scope prefix: `git commit -m "app/Landing: add hero section"`
4. Push: `git push origin main`
5. Deploy: `./deploy.sh frontend` or `./deploy.sh backend` or `./deploy.sh all`

### Commit Message Format
```
scope/Component: brief description

Scopes:
  app/         — Web application changes
  platform/    — ML platform changes
  infra/       — DevOps, deploy, CI/CD
  docs/        — Documentation only

Examples:
  app/Landing: add partner logos marquee
  app/AuthPage: unified login + register with tabs
  platform/RL: add reward shaping for balance
  platform/Docker: update Dockerfile base image
  infra/Deploy: add health check to deploy script
  docs: update monorepo structure
```

## App Module — Code Conventions

### TypeScript / React
- Functional components only, with hooks
- `useAuth()` from `contexts/AuthContext` for auth state
- Shared components: `app/web/frontend/src/components/`
- Pages: `app/web/frontend/src/pages/`
- API calls via `apiFetch()` from `app/web/frontend/src/api/client.ts`
- Tailwind CSS for styling (dark theme)

### Design System
- Background: `#0B0F14` (page), `#161a22` (cards), `#1a1f2e` (dropdowns)
- Accent gradient: `linear-gradient(90deg, #a78bfa, #e879f9)` (purple-pink)
- Secondary accent: `#22d3ee` (cyan)
- Borders: `border-white/10`
- Text: `text-white` (primary), `text-gray-400` (secondary)
- Rounded: `rounded-xl` (inputs), `rounded-2xl` (cards)

### Routes
```
/                   — Landing home
/product            — Product page
/pricing            — Pricing page
/company            — Company page
/login              — Auth (Sign In tab)
/register           — Auth (Sign Up tab)
/panel              — Admin panel
/app/pose           — Pose Studio (protected)
/app/authoring      — Authoring (protected)
/app/scenario       — Scenario Builder (protected)
/app/pipeline       — Pipeline (protected)
/app/jobs           — Jobs (protected)
/app/packages       — Packages (protected)
/app/settings       — Settings (protected)
/app/help           — Help (protected)
```

## Platform Module — Code Conventions

### Python
- Python 3.10+ (core), 3.11 (Docker)
- Package: `packages/skill_foundry/` with 9 subpackages
- CLI tools: `skill-foundry-preprocess`, `skill-foundry-train`, etc.
- RL: PyTorch + Stable-Baselines3 + Gymnasium
- Simulation: MuJoCo 3.1+
- Robot: Unitree G1 (29 DOF)

### Key CLI Commands
```bash
skill-foundry-preprocess   # Preprocess motion data
skill-foundry-train        # Train RL policy
skill-foundry-validate     # Validate trained policy
skill-foundry-package      # Export skill bundle
skill-foundry-runtime      # Run skill on robot
```

## Deployment

### Production Server
- Host: `aurosy.io` (164.92.136.76)
- SSH: `ssh aurosy`
- Web root: `/var/www/aurosy.io`
- API: FastAPI → `localhost:8000` (Nginx proxy at `/api`)
- Service: `systemctl restart aurosy-api`

### Deploy Commands
```bash
# Frontend only
./deploy.sh frontend

# Backend only
./deploy.sh backend

# Everything
./deploy.sh all
```

## Common Pitfalls
- Don't duplicate components — check `app/web/frontend/src/components/` first
- Don't mix app/ and platform/ changes in one commit unless related
- Don't skip build verification before deploying
- Don't edit production server directly
- Admin panel has its own NotificationBell — don't touch
- Platform submodules (unitree_*) — check `platform/platform/SUBMODULE_LOCAL_INVENTORY.md`
