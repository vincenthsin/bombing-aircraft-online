# CI/CD Setup Guide

This guide will help you set up automated deployment for the Bombing Aircraft Online application.

## Overview

The CI/CD pipeline includes:
- **Automated Testing**: Runs backend tests on every push/PR
- **Multi-Platform Deployment**: Supports Railway, Render, Heroku, Vercel, and Netlify
- **Staging & Production**: Separate environments for safe deployments
- **Health Checks**: Automatic verification after deployment
- **Notifications**: Slack integration for deployment status

## Prerequisites

1. **GitHub Repository**: Your code must be hosted on GitHub
2. **Node.js**: Version 18+ recommended
3. **Deployment Platform**: Choose one or more from the supported platforms

## Supported Deployment Platforms

### Backend Platforms
- **Railway**: Recommended for simplicity
- **Render**: Good for static + web services
- **Heroku**: Traditional PaaS platform

### Frontend Platforms
- **Vercel**: Recommended for frontend
- **Netlify**: Alternative static hosting
- **GitHub Pages**: Free option for open source

## GitHub Secrets Configuration

Go to your repository → Settings → Secrets and variables → Actions and add the following secrets:

### Railway Deployment
```
RAILWAY_TOKEN_PRODUCTION=your-railway-token
RAILWAY_PROJECT_ID_PRODUCTION=your-project-id
RAILWAY_TOKEN_STAGING=your-staging-railway-token
RAILWAY_PROJECT_ID_STAGING=your-staging-project-id
```

### Render Deployment
```
RENDER_DEPLOY_HOOK_PRODUCTION=https://api.render.com/deploy/srv-...
RENDER_DEPLOY_HOOK_STAGING=https://api.render.com/deploy/srv-...
```

### Heroku Deployment
```
HEROKU_API_KEY_PRODUCTION=your-heroku-api-key
HEROKU_APP_NAME_PRODUCTION=your-app-name
HEROKU_API_KEY_STAGING=your-staging-api-key
HEROKU_APP_NAME_STAGING=your-staging-app-name
HEROKU_EMAIL=your-email@example.com
```

### Vercel Deployment (Frontend)
```
VERCEL_TOKEN=your-vercel-token
```

### Netlify Deployment (Frontend)
```
NETLIFY_AUTH_TOKEN=your-netlify-token
NETLIFY_SITE_ID=your-site-id
```

### Health Check URLs
```
PRODUCTION_URL=https://your-production-domain.com
STAGING_URL=https://your-staging-domain.com
```

### Notifications
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## Environment Variables Setup

### Railway
Set these in your Railway project environment variables:
```
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com
JWT_SECRET=your-secure-jwt-secret
DB_PATH=/app/database.sqlite
ADMIN_PASSWORD=your-admin-password
```

### Render
Configure in render.yaml or dashboard:
```
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com
JWT_SECRET=your-secure-jwt-secret
DB_PATH=/opt/render/project/database.sqlite
ADMIN_PASSWORD=your-admin-password
```

### Heroku
Set via Heroku CLI or dashboard:
```bash
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://your-frontend-domain.com
heroku config:set JWT_SECRET=your-secure-jwt-secret
heroku config:set ADMIN_PASSWORD=your-admin-password
```

### Vercel (Frontend)
Set in vercel.json or dashboard:
```
API_BASE_URL=https://your-backend-domain.com
SOCKET_URL=https://your-backend-domain.com
```

## Deployment Workflow

### 1. Initial Setup

1. **Copy environment template**:
   ```bash
   cp env.example .env
   # Fill in your values
   ```

2. **Configure deployment platforms**:
   - Create accounts on your chosen platforms
   - Set up projects/applications
   - Note down API keys and project IDs

3. **Add GitHub secrets**:
   - Go to repository Settings → Secrets and variables → Actions
   - Add all required secrets listed above

### 2. First Deployment

1. **Push to main branch**:
   ```bash
   git add .
   git commit -m "Add CI/CD pipeline"
   git push origin main
   ```

2. **Monitor deployment**:
   - Go to Actions tab in GitHub
   - Watch the CI/CD Pipeline run
   - Check deployment platform logs

### 3. Branch Strategy

- **`main`/`master`**: Production deployments
- **`develop`**: Staging deployments
- **Feature branches**: Testing only (no deployment)

## Customizing the Pipeline

### Adding New Tests

Edit `.github/workflows/ci-cd.yml` in the test job:

```yaml
- name: Run additional tests
  run: |
    cd backend
    npm run test:integration
    npm run test:e2e
```

### Adding Code Quality Checks

Add to the test job:

```yaml
- name: Run ESLint
  run: |
    cd backend
    npx eslint . --ext .js

- name: Run Prettier check
  run: |
    npx prettier --check "**/*.{js,json,md}"
```

### Adding Database Migrations

Add a migration step before deployment:

```yaml
- name: Run database migrations
  run: |
    cd backend
    npm run migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Troubleshooting

### Common Issues

1. **Tests failing in CI but passing locally**:
   - Check Node.js version in CI matches local
   - Ensure all dependencies are in package-lock.json
   - Check environment variables needed for tests

2. **Deployment failing**:
   - Verify all secrets are set correctly
   - Check platform-specific logs
   - Ensure environment variables are configured

3. **Health check failing**:
   - Verify the /health endpoint is working
   - Check CORS configuration
   - Ensure database connection works

### Debugging

1. **Check GitHub Actions logs**:
   - Go to Actions tab
   - Click on failed workflow
   - Review each step's logs

2. **Test locally**:
   ```bash
   # Test the build process
   docker build -t bombing-aircraft .
   docker run -p 3000:3000 bombing-aircraft

   # Test health endpoint
   curl http://localhost:3000/health
   ```

## Security Best Practices

1. **Never commit secrets**: Use GitHub secrets instead
2. **Use strong JWT secrets**: Generate random 64-character strings
3. **Configure CORS properly**: Only allow your domains
4. **Keep dependencies updated**: Use Dependabot or similar
5. **Monitor deployments**: Set up alerts for failures

## Cost Optimization

- **Railway**: ~$5/month for hobby plan
- **Render**: ~$7/month for web service
- **Heroku**: ~$7/month for hobby dyno
- **Vercel**: Free for personal projects
- **Netlify**: Free tier available

## Support

If you encounter issues:
1. Check this documentation
2. Review GitHub Actions logs
3. Check deployment platform documentation
4. Open an issue in the repository