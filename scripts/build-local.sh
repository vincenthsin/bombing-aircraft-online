#!/bin/bash

# Bombing Aircraft Online - Local Docker Build and Deploy Script

set -e

echo "🏗️  Building Bombing Aircraft Online locally..."
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    print_status "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

print_success "Docker is installed"

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating .env file from template..."
    cp env.example .env
    print_warning "Please edit .env file with your configuration before running in production"
fi

print_status "Building Docker image..."
if command -v docker-compose &> /dev/null; then
    docker-compose build --no-cache
else
    docker compose build --no-cache
fi

print_success "Docker image built successfully"

print_status "Starting containers..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
fi

print_success "Containers started successfully"

# Wait for the application to be healthy
print_status "Waiting for application to be ready..."
sleep 10

# Check if the application is running
if curl -f http://localhost:3000/health &> /dev/null; then
    print_success "Application is running and healthy!"
    echo ""
    print_status "Access your application at:"
    echo "  🌐 Frontend: http://localhost:3000"
    echo "  🔧 Admin Panel: http://localhost:3000/admin.html"
    echo "  ❤️  Health Check: http://localhost:3000/health"
    echo ""
    print_status "To view logs: docker-compose logs -f"
    print_status "To stop: docker-compose down"
else
    print_error "Application health check failed"
    print_status "Check logs: docker-compose logs"
    exit 1
fi