# Bombing Aircraft Online - Local Docker Build and Deploy Script (PowerShell)

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("all", "backend", "frontend")]
    [string]$Service = "all"
)

Write-Host "🏗️  Building Bombing Aircraft Online locally..." -ForegroundColor Blue
Write-Host "===============================================" -ForegroundColor Blue

# Colors for output
$RED = "Red"
$GREEN = "Green"
$YELLOW = "Yellow"
$BLUE = "Blue"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $BLUE
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $GREEN
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $YELLOW
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $RED
}

# Check if Docker is installed
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not installed. Please install Docker first."
    Write-Status "Visit: https://docs.docker.com/get-docker/"
    exit 1
}

Write-Success "Docker is installed"

# Check if we're in the right directory
if (!(Test-Path "backend/package.json")) {
    Write-Error "Please run this script from the project root directory"
    exit 1
}

# Create .env file if it doesn't exist
if (!(Test-Path ".env")) {
    Write-Status "Creating .env file from template..."
    Copy-Item env.example .env
    Write-Warning "Please edit .env file with your configuration before running in production"
}

# Build services based on parameter
$servicesToBuild = @()
switch ($Service) {
    "all" {
        $servicesToBuild = @("backend", "frontend")
    }
    "backend" {
        $servicesToBuild = @("backend")
    }
    "frontend" {
        $servicesToBuild = @("frontend")
    }
}

Write-Status "Building Docker services: $($servicesToBuild -join ', ')"
try {
    $buildCommand = "docker compose build --no-cache"
    if ($Service -ne "all") {
        $buildCommand += " $Service"
    }
    Invoke-Expression $buildCommand
    Write-Success "Docker images built successfully"
} catch {
    Write-Error "Failed to build Docker images: $_"
    exit 1
}

Write-Status "Starting containers..."
try {
    $upCommand = "docker compose up -d"
    if ($Service -ne "all") {
        $upCommand += " $Service"
    }
    Invoke-Expression $upCommand
    Write-Success "Containers started successfully"
} catch {
    Write-Error "Failed to start containers: $_"
    exit 1
}

# Wait for the application to be healthy
Write-Status "Waiting for services to be ready..."
Start-Sleep -Seconds 15

$allHealthy = $true

# Check backend health if building backend or all
if ($Service -in @("all", "backend")) {
    try {
        Write-Status "Checking backend health..."
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 10 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Success "Backend is running and healthy!"
        } else {
            throw "Backend health check returned status $($response.StatusCode)"
        }
    } catch {
        Write-Error "Backend health check failed: $_"
        $allHealthy = $false
    }
}

# Check frontend health if building frontend or all
if ($Service -in @("all", "frontend")) {
    try {
        Write-Status "Checking frontend health..."
        $response = Invoke-WebRequest -Uri "http://localhost:8080/" -TimeoutSec 10 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Success "Frontend is running and healthy!"
        } else {
            throw "Frontend health check returned status $($response.StatusCode)"
        }
    } catch {
        Write-Error "Frontend health check failed: $_"
        $allHealthy = $false
    }
}

if ($allHealthy) {
    Write-Host ""
    Write-Status "Access your application at:"
    Write-Host "  🌐 Frontend: http://localhost:8080"
    Write-Host "  🔧 Admin Panel: http://localhost:8080/admin.html"
    Write-Host "  🚀 Backend API: http://localhost:3000"
    Write-Host "  ❤️  Backend Health: http://localhost:3000/health"
    Write-Host ""
    Write-Status "Useful commands:"
    Write-Host "  📋 View logs: docker compose logs -f"
    Write-Host "  🛑 Stop all: docker compose down"
    Write-Host "  🔄 Restart: docker compose restart"
    Write-Host "  📦 Rebuild: .\scripts\build-local.ps1"
} else {
    Write-Error "Some services failed health checks"
    Write-Status "Check logs: docker compose logs"
    exit 1
}