# PowerShell script to test deployed frontend-backend integration
# Usage: .\scripts\test-deployed-integration.ps1 -FrontendUrl "https://your-frontend.vercel.app" -BackendUrl "https://your-backend.vercel.app"

param(
    [Parameter(Mandatory=$true)]
    [string]$FrontendUrl,

    [Parameter(Mandatory=$true)]
    [string]$BackendUrl
)

Write-Host "🚀 Testing Deployed Integration..." -ForegroundColor Green
Write-Host "Frontend: $FrontendUrl" -ForegroundColor Cyan
Write-Host "Backend: $BackendUrl" -ForegroundColor Cyan
Write-Host ""

# Test 1: Backend Health Check
Write-Host "📡 Testing backend health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BackendUrl/health" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        $content = $response.Content | ConvertFrom-Json
        if ($content.ok -eq $true) {
            Write-Host "✅ Backend health check passed" -ForegroundColor Green
        } else {
            Write-Host "❌ Backend health check failed - unexpected response" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Backend health check failed - HTTP $($response.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Backend health check failed - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Frontend Loads
Write-Host "🌐 Testing frontend loads..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $FrontendUrl -TimeoutSec 10
    if ($response.StatusCode -eq 200 -and $response.Content -match "Bombing Aircraft") {
        Write-Host "✅ Frontend loads successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend failed to load or missing expected content" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Frontend load test failed - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Socket.IO Connection Test (using Node.js if available)
Write-Host "🔌 Testing Socket.IO connection..." -ForegroundColor Yellow
try {
    $nodeTest = @"
const io = require('socket.io-client');
const socket = io('$BackendUrl', { timeout: 5000, forceNew: true });

setTimeout(() => {
    console.log('TIMEOUT');
    socket.disconnect();
    process.exit(1);
}, 10000);

socket.on('connect', () => {
    console.log('CONNECTED');
    socket.disconnect();
    process.exit(0);
});

socket.on('connect_error', (error) => {
    console.log('ERROR:', error.message);
    socket.disconnect();
    process.exit(1);
});
"@

    $tempFile = [System.IO.Path]::GetTempFileName() + ".js"
    $nodeTest | Out-File -FilePath $tempFile -Encoding UTF8

    $process = Start-Process -FilePath "node" -ArgumentList $tempFile -NoNewWindow -Wait -PassThru
    Remove-Item $tempFile

    if ($process.ExitCode -eq 0) {
        Write-Host "✅ Socket.IO connection successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Socket.IO connection failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "⚠️  Socket.IO test skipped - Node.js test failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Integration tests completed successfully!" -ForegroundColor Green
Write-Host "Frontend and backend are properly connected." -ForegroundColor Green