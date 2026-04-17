# Railway Deployment Guide — Predictive Maintenance Platform

## Architecture on Railway

Deploy **3 separate Railway services** from the same repository:

| Service | Type | Build | Port |
|---------|------|-------|------|
| **api** | Web Service | Dockerfile (root) | 8000 |
| **simulation** | Web Service | simulation-server/Dockerfile | 3000 |
| **frontend** | Static Site / Web Service | predictive-maintenance-frontend/Dockerfile | 80 |

Plus a **PostgreSQL** database (Railway plugin).

---

## Step-by-step Setup

### 1. Create a Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd /path/to/ai-predictive-maintenance-agent
railway init
```

### 2. Provision PostgreSQL

In the Railway dashboard:
1. Click **"+ New"** → **Database** → **PostgreSQL**
2. Railway auto-generates `DATABASE_URL` as a service variable
3. The URL format is: `postgresql://user:pass@host:port/dbname`

### 3. Deploy the Backend API

```bash
# Link to the api service
railway link

# Set environment variables
railway variables set \
  DATABASE_URL='${{Postgres.DATABASE_URL}}' \
  SECRET_KEY='$(openssl rand -hex 32)' \
  SIMULATION_SERVER_URL='https://<simulation-service>.up.railway.app' \
  CORS_ORIGINS='["https://<frontend>.up.railway.app"]' \
  ENVIRONMENT=production \
  NOTIFICATION_EMAIL_ENABLED=false \
  NOTIFICATION_SLACK_ENABLED=false
```

**Railway Settings for API service:**
- **Root Directory:** `/` (uses root Dockerfile)
- **Build Command:** Auto-detected from Dockerfile
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Port:** `8000`
- **Health Check:** `/health`

### 4. Deploy the Simulation Server

Create a second service in the same project:
- **Root Directory:** `simulation-server`
- **Build Command:** Auto-detected from Dockerfile
- **Start Command:** `node server.js`
- **Port:** `3000`

### 5. Deploy the Frontend

Create a third service:
- **Root Directory:** `predictive-maintenance-frontend`
- **Build Command:** `npm install --legacy-peer-deps && npm run build`
- **Start Command:** Serve from nginx (Dockerfile) or use Railway static site

**Important:** Update `VITE_API_URL` at build time:
```bash
railway variables set VITE_API_URL='https://<api-service>.up.railway.app'
```

### 6. Run Alembic Migrations

After the first deploy, run migrations:
```bash
railway run alembic upgrade head
```

Or add to the Dockerfile as a startup script.

---

## Environment Variables Reference

### Backend API (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://user:pass@host:5432/db` |
| `SECRET_KEY` | JWT signing key (32+ chars) | `$(openssl rand -hex 32)` |
| `SIMULATION_SERVER_URL` | Internal URL to simulation service | `http://simulation.railway.internal:3000` |
| `CORS_ORIGINS` | JSON array of allowed origins | `["https://frontend.up.railway.app"]` |
| `ENVIRONMENT` | `production` | `production` |

### Backend API (Optional — Notifications)

| Variable | Description | Default |
|----------|-------------|---------|
| `NOTIFICATION_EMAIL_ENABLED` | Enable email alerts | `false` |
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | |
| `SMTP_PASSWORD` | SMTP password / app password | |
| `SMTP_FROM_EMAIL` | Sender address | |
| `NOTIFICATION_EMAIL_RECIPIENTS` | JSON array of emails | `[]` |
| `NOTIFICATION_SLACK_ENABLED` | Enable Slack alerts | `false` |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL | |

---

## Railway-specific Configuration

### Internal Networking

Railway services in the same project can communicate via **private networking**:
```
http://<service-name>.railway.internal:<port>
```

Set `SIMULATION_SERVER_URL` to:
```
http://simulation.railway.internal:3000
```

### Database URL Conversion

Railway provides a PostgreSQL URL like:
```
postgresql://user:pass@host:port/dbname
```

The backend uses async SQLAlchemy, so convert to:
```
postgresql+asyncpg://user:pass@host:port/dbname
```

This is handled automatically — see the `railway.toml` for the start command that patches the URL.

### Persistent Storage

Railway containers are ephemeral. For ML models and uploaded data:
- Store models in the database (serialize to BLOB) or use Railway Volumes
- Alternatively, use S3-compatible storage (Railway doesn't provide persistent disk by default)

---

## Quick Deploy Checklist

- [ ] Create Railway project
- [ ] Add PostgreSQL plugin
- [ ] Deploy API service (root Dockerfile)
- [ ] Deploy Simulation service (simulation-server/)
- [ ] Deploy Frontend service (predictive-maintenance-frontend/)
- [ ] Set all environment variables
- [ ] Run `railway run alembic upgrade head`
- [ ] Verify health endpoints: `/health`, `/docs`
- [ ] Test login with default credentials
- [ ] Configure SMTP / Slack if needed
