#!/bin/bash

# Bombing Aircraft Online - Deployment Setup Script
# This script helps you set up deployment platforms and configure CI/CD

set -e

echo "🚀 Bombing Aircraft Online - Deployment Setup"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_warning "Node.js version $NODE_VERSION detected. Recommended: 18+"
fi

print_success "Prerequisites check passed"

echo ""
echo "Choose your deployment platform:"
echo "1) Railway (Recommended - Simple setup)"
echo "2) Render (Backend + Frontend)"
echo "3) Heroku (Traditional)"
echo "4) Docker (Manual deployment)"
echo "5) Setup all (Advanced)"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        print_status "Setting up Railway deployment..."
        ./scripts/setup-railway.sh
        ;;
    2)
        print_status "Setting up Render deployment..."
        ./scripts/setup-render.sh
        ;;
    3)
        print_status "Setting up Heroku deployment..."
        ./scripts/setup-heroku.sh
        ;;
    4)
        print_status "Setting up Docker deployment..."
        ./scripts/setup-docker.sh
        ;;
    5)
        print_status "Setting up all platforms..."
        ./scripts/setup-railway.sh
        ./scripts/setup-render.sh
        ./scripts/setup-heroku.sh
        ./scripts/setup-docker.sh
        ;;
    *)
        print_error "Invalid choice. Exiting."
        exit 1
        ;;
esac

print_success "Deployment setup completed!"
print_status "Next steps:"
echo "1. Configure GitHub secrets in your repository"
echo "2. Set environment variables in your deployment platform"
echo "3. Push to main branch to trigger deployment"
echo ""
print_status "For detailed instructions, see: docs/CI-CD-SETUP.md"