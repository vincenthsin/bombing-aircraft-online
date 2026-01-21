# Bombing Aircraft Online - Deployment Setup Script (PowerShell)
# This script helps you set up deployment platforms and configure CI/CD

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("railway", "render", "heroku", "docker", "all")]
    [string]$Platform = "railway"
)

Write-Host "🚀 Bombing Aircraft Online - Deployment Setup" -ForegroundColor Blue
Write-Host "==============================================" -ForegroundColor Blue

# Check if we're in the right directory
if (!(Test-Path "backend/package.json")) {
    Write-Host "❌ Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green

switch ($Platform) {
    "railway" {
        Write-Host "Setting up Railway deployment..." -ForegroundColor Blue
        # Railway setup instructions
        Write-Host "Railway Setup Instructions:" -ForegroundColor Yellow
        Write-Host "1. Go to https://railway.app and create an account" -ForegroundColor White
        Write-Host "2. Install Railway CLI: npm install -g @railway/cli" -ForegroundColor White
        Write-Host "3. Login: railway login" -ForegroundColor White
        Write-Host "4. Create project: railway init" -ForegroundColor White
        Write-Host "5. Set environment variables:" -ForegroundColor White
        Write-Host "   railway variables set NODE_ENV production" -ForegroundColor White
        Write-Host "   railway variables set CORS_ORIGIN https://your-frontend-domain.com" -ForegroundColor White
        Write-Host "   railway variables set JWT_SECRET (generate a secure random string)" -ForegroundColor White
        Write-Host "6. Get your project token: railway tokens create" -ForegroundColor White
        Write-Host "7. Add to GitHub secrets: RAILWAY_TOKEN_PRODUCTION" -ForegroundColor White
    }
    "render" {
        Write-Host "Setting up Render deployment..." -ForegroundColor Blue
        # Render setup instructions
        Write-Host "Render Setup Instructions:" -ForegroundColor Yellow
        Write-Host "1. Go to https://render.com and create an account" -ForegroundColor White
        Write-Host "2. Create a new Web Service from your GitHub repo" -ForegroundColor White
        Write-Host "3. Set build command: cd backend && npm install" -ForegroundColor White
        Write-Host "4. Set start command: cd backend && npm start" -ForegroundColor White
        Write-Host "5. Add environment variables in Render dashboard" -ForegroundColor White
        Write-Host "6. Copy the deploy hook URL for GitHub secrets" -ForegroundColor White
    }
    "heroku" {
        Write-Host "Setting up Heroku deployment..." -ForegroundColor Blue
        # Heroku setup instructions
        Write-Host "Heroku Setup Instructions:" -ForegroundColor Yellow
        Write-Host "1. Go to https://heroku.com and create an account" -ForegroundColor White
        Write-Host "2. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli" -ForegroundColor White
        Write-Host "3. Login: heroku login" -ForegroundColor White
        Write-Host "4. Create app: heroku create your-app-name" -ForegroundColor White
        Write-Host "5. Set environment variables: heroku config:set KEY=value" -ForegroundColor White
        Write-Host "6. Get API key from Heroku dashboard → Account settings" -ForegroundColor White
        Write-Host "7. Add to GitHub secrets: HEROKU_API_KEY_PRODUCTION" -ForegroundColor White
    }
    "docker" {
        Write-Host "Setting up Docker deployment..." -ForegroundColor Blue
        # Docker setup instructions
        Write-Host "Docker Deployment Instructions:" -ForegroundColor Yellow
        Write-Host "1. Build image: docker build -t bombing-aircraft ." -ForegroundColor White
        Write-Host "2. Run locally: docker run -p 3000:3000 bombing-aircraft" -ForegroundColor White
        Write-Host "3. Deploy to any container platform (AWS, GCP, Azure, etc.)" -ForegroundColor White
        Write-Host "4. Set environment variables in your container platform" -ForegroundColor White
    }
    "all" {
        Write-Host "Setting up all platforms..." -ForegroundColor Blue
        # Run all setups
        & $MyInvocation.MyCommand.Path -Platform railway
        & $MyInvocation.MyCommand.Path -Platform render
        & $MyInvocation.MyCommand.Path -Platform heroku
        & $MyInvocation.MyCommand.Path -Platform docker
    }
}

Write-Host "" -ForegroundColor White
Write-Host "✅ Deployment setup completed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Blue
Write-Host "1. Configure GitHub secrets in your repository" -ForegroundColor White
Write-Host "2. Set environment variables in your deployment platform" -ForegroundColor White
Write-Host "3. Push to main branch to trigger deployment" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "📖 For detailed instructions, see: docs/CI-CD-SETUP.md" -ForegroundColor Blue