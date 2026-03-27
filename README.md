# Resume Builder

Self-hosted resume builder with AI-powered tailoring. Import your LinkedIn profile, tailor resumes to specific job ads, generate Word and PDF documents, and track your job applications.

## Features

- **LinkedIn import** — upload your LinkedIn data export to auto-populate work history
- **AI gap analysis** — paste a job description, get a scored match against your experience
- **Branching interview** — AI asks targeted questions to surface experience you may have missed
- **Word + PDF export** — three professional templates (Classic, Modern, Minimal)
- **Live preview** — see the document as you edit
- **Cover letters** — AI-generated, tone-selectable, grounded in your real experience
- **Job tracker** — pipeline from Saved → Applied → Interview → Offer
- **Multi-provider AI** — Claude, OpenAI, or Ollama (self-hosted)

> **Truthfulness guarantee:** The AI will never fabricate experience. It only reframes and highlights what you've actually done.

---

## Deployment

### Option 1 — Unraid (recommended)

Requires the **Compose Manager** plugin on Unraid.

1. In Unraid, go to **Plugins → Compose Manager → Add Stack**
2. Name it `resume-builder`
3. Paste the contents of `docker-compose.yml` into the compose editor
4. Add your environment variables (see below) in the `.env` section
5. Click **Deploy**

Unraid will pull the images from GitHub Container Registry automatically.

**Minimum required env vars:**
```
GITHUB_OWNER=your-github-username
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
SECRET_KEY=<run: openssl rand -hex 32>
```

### Option 2 — Any Docker host (VPS, NAS, etc.)

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/resume-builder.git
cd resume-builder

# Configure
cp .env.example .env
nano .env   # set GITHUB_OWNER, ANTHROPIC_API_KEY, SECRET_KEY

# Pull and start
docker-compose pull
docker-compose up -d
```

App runs at `http://YOUR_SERVER_IP:3000`

### Option 3 — Build from source

```bash
docker-compose -f docker-compose.yml -f docker-compose.build.yml up --build
```

---

## Local development (Windows)

```powershell
# First time — copies .env.example, then exits so you can fill in your API key
.\dev.ps1

# Edit .env, then run again
.\dev.ps1

# Skip reinstalling deps on subsequent runs
.\dev.ps1 -SkipInstall
```

This opens 3 terminal windows: API (port 8000), Celery worker, and Vite frontend (port 5173).

**Requires:** Python 3.12+, Node.js 20+, Docker Desktop (for Redis only).

---

## AI Provider Setup

| Provider | Env vars needed |
|---|---|
| **Claude** (recommended) | `AI_PROVIDER=claude`, `ANTHROPIC_API_KEY=sk-ant-...` |
| **OpenAI** | `AI_PROVIDER=openai`, `OPENAI_API_KEY=sk-...` |
| **Ollama** (self-hosted) | `AI_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://your-ollama:11434` |

---

## Updating

```bash
# Pull latest images
docker-compose pull

# Restart with new images
docker-compose up -d
```

On Unraid via Compose Manager: click **Pull** then **Up** on your stack.

---

## Publishing a release

Push a git tag to trigger a versioned build:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will build and push `ghcr.io/YOUR_USERNAME/resume-builder-api:v1.0.0` and `...frontend:v1.0.0`.

---

## Making the packages public (required for Unraid to pull without auth)

After your first push, go to:
**GitHub → Packages → resume-builder-api → Package settings → Change visibility → Public**
Repeat for `resume-builder-frontend`.

---

## Data

All data is stored in the `resume_data` Docker volume, mounted at `/data` inside containers:
- `/data/resume_builder.db` — SQLite database
- `/data/files/` — generated Word and PDF documents

On Unraid this maps to `/mnt/user/appdata/resume-builder` by default.
