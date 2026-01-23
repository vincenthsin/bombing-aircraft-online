# Deployment Guide - Docker-based Render Deployment

This guide explains how to deploy the Bombing Aircraft backend to Render using Docker images built and pushed via GitHub Actions.

## Overview

The deployment pipeline:
1. **GitHub Actions** builds a Docker image from `Dockerfile.backend`
2. Image is pushed to **GitHub Container Registry (GHCR)**
3. **Render** pulls the image and deploys it
4. Automated health checks verify the deployment

## Prerequisites

- GitHub repository with the code
- Render account (free tier works)
- GitHub secrets configured (see below)

## Setup Instructions

### 1. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | How to Get It |
|-------------|-------------|---------------|
| `RENDER_API_KEY` | Render API key | [Render Dashboard](https://dashboard.render.com/u/settings#api-keys) → Account Settings → API Keys → Create API Key |
| `RENDER_SERVICE_ID` | Service ID of your backend | See step 2 below |

### 2. Create Render Service

#### Option A: Using render.yaml (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Blueprint**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and create the service
5. After creation, go to the service settings to get the **Service ID**

#### Option B: Manual Creation

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `bombing-aircraft-backend`
   - **Environment**: Docker
   - **Region**: Singapore (or your preferred region)
   - **Branch**: `main` or `master`
   - **Dockerfile Path**: `./Dockerfile.backend`
   - **Docker Context**: `.`
   - **Auto-Deploy**: Disabled (GitHub Actions will handle this)
5. Add environment variables:
   ```
   NODE_ENV=production
   PORT=10000
   CORS_ORIGIN=*
   JWT_SECRET=<auto-generate or set your own>
   DB_PATH=./database.sqlite
   ```
6. Click **Create Web Service**
7. Copy the **Service ID** from the URL or service settings

### 3. Get Service ID

The Service ID can be found in:
- **URL**: `https://dashboard.render.com/web/srv-XXXXXXXXXXXXX` (the `srv-XXXXXXXXXXXXX` part)
- **Service Settings**: Settings → Service ID

### 4. Configure GitHub Container Registry Access

The workflow uses `GITHUB_TOKEN` which is automatically provided by GitHub Actions. No additional configuration needed!

### 5. Trigger Deployment

Push to `main` or `master` branch:

```bash
git add .
git commit -m "Setup Docker deployment"
git push origin main
```

Or manually trigger the workflow:
1. Go to **Actions** tab in GitHub
2. Select **Deploy Backend to Render (Docker)**
3. Click **Run workflow**

## Workflow Steps

The GitHub Actions workflow (`deploy-render-docker.yml`) performs:

1. **Build and Push**:
   - Builds Docker image using `Dockerfile.backend`
   - Tags with `latest` and commit SHA
   - Pushes to `ghcr.io/<your-username>/bombing-aircraft-backend`

2. **Deploy to Render**:
   - Triggers deployment via Render API
   - Waits for deployment to complete (max 10 minutes)
   - Monitors deployment status

3. **Health Check**:
   - Waits for service to be ready
   - Tests `/health` endpoint
   - Verifies API is responding

## Local Testing

Test the Docker build locally before deploying:

```bash
# Build the image
docker build -f Dockerfile.backend -t bombing-aircraft-backend .

# Run the container
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e CORS_ORIGIN=* \
  -e JWT_SECRET=your-test-secret \
  -e DB_PATH=./database.sqlite \
  bombing-aircraft-backend

# Test health endpoint
curl http://localhost:3000/health
```

## Important Notes

### Database Persistence

> **⚠️ WARNING**: Render's free tier does NOT support persistent disks.
> 
> This means:
> - SQLite database is stored in the container filesystem
> - **Data will be lost** on each deployment or restart
> - For production use, consider:
>   - Upgrading to a paid Render plan with disk support
>   - Using a managed database (PostgreSQL, MySQL)
>   - Using an external database service

### Auto-Deploy

Auto-deploy is **disabled** in `render.yaml` because GitHub Actions controls deployments. This gives you:
- Better control over when deployments happen
- Ability to run tests before deploying
- Consistent deployment process

### Image Registry

Images are stored in GitHub Container Registry (GHCR):
- Public by default for public repos
- Private for private repos
- Free for public images
- View at: `https://github.com/<username>?tab=packages`

## Troubleshooting

### Deployment Fails

1. **Check GitHub Actions logs**: Actions tab → Latest workflow run
2. **Check Render logs**: Render Dashboard → Service → Logs
3. **Verify secrets**: Ensure `RENDER_API_KEY` and `RENDER_SERVICE_ID` are correct

### Health Check Fails

1. Ensure your backend has a `/health` endpoint
2. Check if the service is actually running in Render logs
3. Verify environment variables are set correctly

### Image Not Found

1. Check if image was pushed to GHCR: `https://github.com/<username>?tab=packages`
2. Verify Render has access to pull the image
3. For private repos, you may need to configure image pull secrets

### Database Issues

Remember: **Database is ephemeral on free tier**
- Data resets on each deployment
- Consider using Render's PostgreSQL for persistence
- Or upgrade to a paid plan for disk support

## Monitoring

### View Deployment Status

- **GitHub Actions**: Repository → Actions tab
- **Render Dashboard**: Service → Events tab
- **Logs**: Service → Logs tab

### Service URL

After deployment, your backend will be available at:
```
https://bombing-aircraft-backend.onrender.com
```

Test endpoints:
- Health: `https://bombing-aircraft-backend.onrender.com/health`
- API: `https://bombing-aircraft-backend.onrender.com/api`

## Upgrading to Paid Plan

For persistent database storage:

1. Upgrade to Render's paid plan ($7/month)
2. Add disk configuration to `render.yaml`:
   ```yaml
   disk:
     name: backend-data
     mountPath: /app/data
     sizeGB: 1
   ```
3. Update `DB_PATH` environment variable:
   ```yaml
   - key: DB_PATH
     value: /app/data/database.sqlite
   ```

## Next Steps

- [ ] Set up frontend deployment to Vercel
- [ ] Configure CORS_ORIGIN with actual frontend URL
- [ ] Set up monitoring and alerts
- [ ] Consider database migration to PostgreSQL for production
- [ ] Add staging environment for testing

## Resources

- [Render Docker Deployment Docs](https://render.com/docs/docker)
- [GitHub Container Registry Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Render API Documentation](https://api-docs.render.com/)
