# AUROSY Skill Factory

Monorepo for the AUROSY Skill Factory platform — a tool for creating humanoid robot skills.

## Structure

| Directory | Description | Tech Stack |
|-----------|-------------|------------|
| `app/` | Web Application (landing, dashboard, admin) | React 18, TypeScript, Vite, Tailwind CSS |
| `platform/` | ML Platform (training, simulation, export) | Python 3.10+, PyTorch, MuJoCo, SB3 |

## Quick Start

### Frontend (Web Application)
```bash
cd app/web/frontend
npm install
npm run dev          # → localhost:5173
```

### Platform (ML Training)
```bash
cd platform
python -m venv venv && source venv/bin/activate
pip install -e "packages/skill_foundry[rl]"
python run_train.py --config smoke_config.json
```

## Development Workflow

```
Local → GitHub → Deploy
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guide.
See [.github/copilot-instructions.md](.github/copilot-instructions.md) for AI agent rules.

## Deployment

```bash
./deploy.sh frontend   # Build & deploy React SPA
./deploy.sh backend    # Deploy FastAPI backend
./deploy.sh all        # Deploy everything
```

## Links

- **Production**: https://aurosy.io
- **API**: https://aurosy.io/api/health
