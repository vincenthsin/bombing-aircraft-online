# Quick Setup Guide - Docker Deployment to Render

## Step 1: Get Render API Key

1. Go to [Render Dashboard](https://dashboard.render.com/u/settings#api-keys)
2. Click **Create API Key**
3. Copy the key (you'll need it for GitHub secrets)

## Step 2: Create Render Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Blueprint**
3. Connect your GitHub repository: `vincenthsin/bombing-aircraft-online`
4. Render will detect `render.yaml` and create the service
5. After creation, copy the **Service ID** from the URL:
   - URL format: `https://dashboard.render.com/web/srv-XXXXXXXXXXXXX`
   - Service ID is the `srv-XXXXXXXXXXXXX` part

## Step 3: Add GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:

   **Secret 1:**
   - Name: `RENDER_API_KEY`
   - Value: (paste the API key from Step 1)

   **Secret 2:**
   - Name: `RENDER_SERVICE_ID`
   - Value: (paste the Service ID from Step 2, e.g., `srv-XXXXXXXXXXXXX`)

## Step 4: Deploy

### Option A: Push to main branch
```bash
git checkout main
git pull origin main
git merge 31-create-cicd-pipeline
git push origin main
```

### Option B: Manual workflow trigger
1. Go to **Actions** tab in GitHub
2. Select **Deploy Backend to Render (Docker)**
3. Click **Run workflow** → **Run workflow**

## Step 5: Verify Deployment

After the workflow completes (5-10 minutes):

1. Check workflow status in **Actions** tab
2. Visit your backend URL: `https://bombing-aircraft-backend.onrender.com/health`
3. You should see a health check response

## Important Notes

⚠️ **Free Tier Limitation**: Database is ephemeral (data resets on each deployment)

✅ **What's Deployed**:
- Docker image built from `Dockerfile.backend`
- Pushed to GitHub Container Registry
- Deployed to Render automatically

## Troubleshooting

**Workflow fails?**
- Check GitHub Actions logs
- Verify secrets are set correctly

**Service not responding?**
- Check Render service logs in dashboard
- Ensure service is running (may take 1-2 minutes to start)

**Need help?**
- See full documentation: `docs/DEPLOYMENT.md`
