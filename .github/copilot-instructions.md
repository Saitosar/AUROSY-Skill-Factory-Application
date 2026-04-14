# AUROSY Skill Factory — AI Agent Instructions

> **READ THIS FILE FIRST** before making any changes to the codebase.
> This document is automatically loaded by GitHub Copilot and other AI coding agents.

## Project Overview

AUROSY Skill Factory is a web platform for creating humanoid robot skills.
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL (separate repo: `aurosy-backend`)
- **Deployment**: DigitalOcean server at `aurosy.io`

## Repository Structure

```
web/frontend/          — React SPA (main codebase)
  src/
    pages/             — Page components (Landing, AuthPage, AdminPanel, etc.)
    components/        — Shared components (NotificationBell, etc.)
    contexts/          — React contexts (AuthContext)
    api/               — API client (apiFetch)
    styles.css         — Global styles
docs/                  — Documentation
.github/               — GitHub workflow files
```

## Mandatory Workflow

### Before Starting Work
1. **ALWAYS** run `git pull origin main` before making changes
2. **ALWAYS** check `git status` to ensure clean working tree
3. **ALWAYS** read this file and `CONTRIBUTING.md` before first session
4. **NEVER** make changes directly on the production server

### Making Changes
1. Make changes locally
2. Run `npm run build` in `web/frontend/` to verify build passes
3. Run `npm run typecheck` to catch type errors
4. Commit with a clear English message: `git commit -m "Component: description"`
5. Push to GitHub: `git push origin main`
6. Deploy: `rsync -av --delete web/frontend/dist/ aurosy:/var/www/aurosy.io/`

### Commit Message Format
```
Component: brief description of change

Examples:
  Landing: add partner logos marquee
  AuthPage: unified login + register with tabs
  NotificationBell: shared component for landing + app shell
  Admin: add user management table
  Deploy: update nginx config
```

## Code Conventions

### TypeScript / React
- Functional components only, with hooks
- Use `useAuth()` from `contexts/AuthContext` for auth state
- Shared components go in `src/components/`
- Page components go in `src/pages/`
- API calls via `apiFetch()` from `src/api/client.ts`
- Tailwind CSS for styling (dark theme, bg-[#0B0F14] base)

### Design System
- Background: `#0B0F14` (page), `#161a22` (cards), `#1a1f2e` (dropdowns)
- Accent gradient: `linear-gradient(90deg, #a78bfa, #e879f9)` (purple-pink)
- Secondary accent: `#22d3ee` (cyan)
- Borders: `border-white/10`
- Text: `text-white` (primary), `text-gray-400` (secondary), `text-gray-500` (muted)
- Rounded corners: `rounded-xl` (inputs), `rounded-2xl` (cards)
- Focus: `focus:border-purple-500` (inputs)

### File Naming
- Pages: `PascalCase.tsx` (e.g., `AuthPage.tsx`, `Landing.tsx`)
- Components: `PascalCase.tsx` (e.g., `NotificationBell.tsx`)
- Contexts: `PascalCase.tsx` (e.g., `AuthContext.tsx`)
- Utils: `camelCase.ts`

## Architecture Rules

### Authentication
- Auth state managed by `AuthContext` (user, token, login, register, logout)
- JWT token stored in `localStorage`
- Admin users (`role === 'admin'`) see guest UI on landing pages
- `isRegularUser = user && user.role !== 'admin'` for conditional rendering

### Navigation
- Landing pages: `LandingLayout` wrapper with `LandingNav`
- App pages: `AppShell` wrapper with topbar (protected by `ProtectedRoute`)
- Auth pages: standalone `AuthPage` (no layout wrapper)
- Admin: standalone `AdminPanel`

### Shared Components
- `NotificationBell` — used in both Landing nav and AppShell topbar
- When creating components used across landing + app, use `variant` prop

### Routes
```
/                   — Landing home
/product            — Product page
/pricing            — Pricing page
/company            — Company page
/login              — Auth page (Sign In tab)
/register           — Auth page (Sign Up tab)
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

## Deployment

### Production Server
- Host: `aurosy.io` (164.92.136.76)
- SSH: `ssh aurosy`
- Web root: `/var/www/aurosy.io`
- API: FastAPI on `localhost:8000` (proxied via Nginx at `/api`)
- Service: `systemctl restart aurosy-api`

### Deploy Commands
```bash
# Frontend
cd web/frontend
npm run build
rsync -av --delete dist/ aurosy:/var/www/aurosy.io/

# Backend (separate repo)
cd aurosy-backend
rsync -av --exclude '.env' --exclude '.venv' --exclude '__pycache__' . aurosy:/root/aurosy-backend/
ssh aurosy "systemctl restart aurosy-api"
```

## Common Pitfalls
- Don't duplicate components — check `src/components/` first
- Don't add inline notification/auth code — use shared components
- Don't forget `cursor-pointer` on clickable elements
- Don't use `Task` type in Jira — always use `Story`
- Don't skip `npm run build` before deploying
- Admin panel has its OWN NotificationBell (polls API) — don't touch it
