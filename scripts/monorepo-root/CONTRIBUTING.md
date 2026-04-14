# Contributing to AUROSY Skill Factory (Monorepo)

## Repository Structure

```
app/        — Web Application (React 18 + TypeScript + Vite + Tailwind)
platform/   — ML Platform (Python + RL training + MuJoCo simulation)
```

## Development Workflow

```
Local Development → GitHub (main) → Deploy to Server
```

**NEVER** edit files directly on the production server.

## Before Every Work Session

```bash
git pull origin main
git status
# Install deps if needed:
cd app/web/frontend && npm install     # for frontend work
cd platform && pip install -e ".[rl]"  # for platform work
```

## Making Changes

### 1. Develop Locally
```bash
# Frontend
cd app/web/frontend && npm run dev

# Platform
cd platform && python run_train.py --config smoke_config.json
```

### 2. Verify
```bash
# Frontend
cd app/web/frontend
npm run build        # Must pass
npm run typecheck    # Must pass

# Platform (if tests exist)
cd platform
python -m pytest
```

### 3. Commit
```bash
git add -A
git commit -m "scope/Component: description"
```

**Commit scopes:**
- `app/` — Web application
- `platform/` — ML platform
- `infra/` — DevOps, deploy
- `docs/` — Documentation

### 4. Push & Deploy
```bash
git push origin main
./deploy.sh frontend   # or backend, or all
```

## For AI Agents

1. **READ** `.github/copilot-instructions.md` before any changes
2. **RUN** `git pull origin main` at session start
3. **IDENTIFY** which module you're changing: `app/` or `platform/`
4. **BUILD** before deploying
5. **COMMIT** with scoped prefix: `app/Component: desc` or `platform/Module: desc`
6. **NEVER** SSH to server to edit files
7. **NEVER** mix unrelated app/ and platform/ changes in one commit
