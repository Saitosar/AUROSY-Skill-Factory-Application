# Contributing to AUROSY Skill Factory

## Development Workflow

All changes follow this strict pipeline:

```
Local Development → GitHub (main) → Deploy to Server
```

**NEVER** edit files directly on the production server.

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- SSH access to `aurosy` server (for deployment)

### Setup
```bash
git clone https://github.com/Saitosar/AUROSY-Skill-Factory-Application.git
cd AUROSY-Skill-Factory-Application/web/frontend
npm install
cp .env.example .env
npm run dev
```

## Before Every Work Session

```bash
# 1. Sync with remote
git pull origin main

# 2. Verify clean state
git status

# 3. Install any new dependencies
cd web/frontend && npm install
```

## Making Changes

### Step 1: Develop Locally
- Edit files in your IDE / AI agent
- Test with `npm run dev` (Vite dev server at localhost:5173)

### Step 2: Verify Build
```bash
cd web/frontend
npm run build       # Must pass without errors
npm run typecheck   # Must pass without type errors
```

### Step 3: Commit
```bash
git add -A
git commit -m "Component: brief description"
```

Commit message format: `Component: description`
- `Landing: add hero animation`
- `AuthPage: fix tab switching`
- `NotificationBell: add clear all button`

### Step 4: Push to GitHub
```bash
git push origin main
```

### Step 5: Deploy
```bash
# Frontend
rsync -av --delete web/frontend/dist/ aurosy:/var/www/aurosy.io/

# Backend (if changed)
cd ../aurosy-backend
rsync -av --exclude '.env' --exclude '.venv' --exclude '__pycache__' . aurosy:/root/aurosy-backend/
ssh aurosy "systemctl restart aurosy-api"
```

## For AI Agents

If you are an AI coding agent (Copilot, Cursor, Claude, etc.):

1. **READ** `.github/copilot-instructions.md` before making any changes
2. **RUN** `git pull origin main` at the start of every session
3. **CHECK** `git status` before committing
4. **BUILD** with `npm run build` before deploying
5. **NEVER** skip the GitHub step — all changes must be committed and pushed
6. **NEVER** SSH into the server to edit files directly
7. **USE** shared components from `src/components/` — don't duplicate
8. **FOLLOW** the design system colors and patterns in `copilot-instructions.md`

## Project Structure

```
AUROSY-Skill-Factory-Application/
├── .github/
│   ├── copilot-instructions.md    ← AI agent instructions (READ FIRST)
│   └── PULL_REQUEST_TEMPLATE.md   ← PR template
├── web/
│   └── frontend/
│       ├── src/
│       │   ├── pages/             ← Page components
│       │   ├── components/        ← Shared components
│       │   ├── contexts/          ← React contexts
│       │   ├── api/               ← API client
│       │   └── styles.css         ← Global styles
│       ├── public/                ← Static assets
│       └── package.json
├── docs/                          ← Documentation
├── CONTRIBUTING.md                ← This file
└── README.md
```

## Code Review Checklist

Before pushing, verify:
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] No hardcoded secrets or API keys
- [ ] Commit message follows format
- [ ] No duplicate components or inline code that should be shared
- [ ] Dark theme design system colors used consistently
