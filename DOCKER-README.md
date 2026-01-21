# Local Docker Development

This guide explains how to run the Bombing Aircraft Online application using Docker containers locally, with separate backend and frontend services.

## Architecture

- **Backend**: Node.js/Express API server with Socket.IO (Port 3000)
- **Frontend**: Nginx serving static files with API proxy (Port 8080)
- **Database**: SQLite (persisted in `./backend/database.sqlite`)

## Quick Start

### 1. Prerequisites

- Docker and Docker Compose installed
- At least 2GB free RAM
- Ports 3000 and 8080 available

### 2. Build and Run All Services

```bash
# Using npm script (Windows)
npm run docker:build

# Or using PowerShell directly
.\scripts\build-local.ps1

# Or using Docker Compose
docker compose up --build
```

### 3. Access the Application

- **Frontend**: http://localhost:8080
- **Admin Panel**: http://localhost:8080/admin.html
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## Individual Service Management

### Build Only Backend
```bash
npm run docker:build:backend
```

### Build Only Frontend
```bash
npm run docker:build:frontend
```

### Run Only Backend
```bash
npm run docker:up:backend
```

### Run Only Frontend
```bash
npm run docker:up:frontend
```

## Useful Commands

```bash
# View logs
npm run docker:logs
npm run docker:logs:backend
npm run docker:logs:frontend

# Restart services
npm run docker:restart
npm run docker:restart:backend
npm run docker:restart:frontend

# Stop all services
npm run docker:down
npm run docker:down:backend
npm run docker:down:frontend

# Clean rebuild
docker compose down --volumes
docker compose up --build
```

## Configuration

### Environment Variables

The application uses the following environment variables (defined in `docker-compose.yml`):

- `NODE_ENV=development`
- `PORT=3000` (backend)
- `CORS_ORIGIN=http://localhost:8080`
- `JWT_SECRET=your-development-jwt-secret-key-change-in-production`
- `DB_PATH=/app/database.sqlite`
- `ADMIN_PASSWORD=admin123`

### Database Persistence

The SQLite database is mounted as a volume, so data persists between container restarts:

```yaml
volumes:
  - ./backend/database.sqlite:/app/database.sqlite
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find what's using the port
   netstat -ano | findstr :3000
   # Kill the process
   taskkill /PID <PID> /F
   ```

2. **Permission denied**
   ```bash
   # On Windows, ensure Docker Desktop is running as administrator
   ```

3. **Database errors**
   ```bash
   # Remove the database file and restart
   rm backend/database.sqlite
   npm run docker:build
   ```

4. **Container won't start**
   ```bash
   # Check logs
   docker compose logs

   # Rebuild without cache
   docker compose build --no-cache
   ```

### Health Checks

Both services include health checks:

- **Backend**: `curl -f http://localhost:3000/health`
- **Frontend**: `curl -f http://localhost:8080/`

### Network Issues

The services communicate via a Docker network called `bombing-aircraft-network`. The frontend nginx config proxies API requests to the backend using the service name `backend:3000`.

## Development Workflow

1. **Make backend changes**: The backend will auto-restart in development mode
2. **Make frontend changes**: Rebuild the frontend container
3. **Database changes**: The SQLite file persists, but you may need to restart if schema changes

## Production Deployment

For production deployment, consider:

1. Using environment-specific `docker-compose.prod.yml`
2. Setting secure environment variables
3. Using Docker secrets for sensitive data
4. Setting up proper logging and monitoring
5. Using a reverse proxy (nginx/caddy) in front of the services

## File Structure

```
├── docker-compose.yml      # Main compose file
├── Dockerfile.backend      # Backend container config
├── Dockerfile.frontend     # Frontend container config
├── nginx.conf             # Nginx config for frontend
├── scripts/
│   └── build-local.ps1    # Build script
└── backend/
    ├── database.sqlite    # Persistent database (mounted)
    └── ...               # Backend source code
```