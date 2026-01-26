# Bombing Aircraft Online

A modern, real-time multiplayer web implementation of the classic "Bombing Aircraft" (Zha Feiji) game.
Built with **Node.js**, **Express**, and **Socket.io**.

## Features
- **Real-time Multiplayer**: Play against friends instantly.
- **Robot Matchmaking**: Automatically matches with a robot opponent if no players are found after 5 seconds.
- **Modern UI**: Dark-mode, sci-fi aesthetic with responsive grid layout.
- **Drag & Drop**: Easy ship placement with rotation support.
- **Socket.io**: Instant game state synchronization.

## Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- For production: PostgreSQL database (Vercel Postgres, Railway, etc.)

## Local Development Setup

This project consists of two main components:

- **Frontend**: Static files in `frontend/public/` (HTML, CSS, JS)
- **Backend**: Node.js/Express server with Socket.IO in `backend/`

### Quick Start (Recommended)

The easiest way to get started locally is using the provided npm scripts:

1. **Install dependencies**
   ```bash
   # Bash/Linux/macOS
   npm install
   cd backend && npm install && cd ..
   ```
   ```cmd
   REM Windows CMD
   npm install
   cd backend && npm install && cd ..
   ```
   ```powershell
   # Windows PowerShell
   npm install
   cd backend; npm install; cd ..
   ```

2. **Start the application**
   ```bash
   # Bash/Linux/macOS
   npm start
   ```
   ```cmd
   REM Windows CMD
   npm start
   ```
   ```powershell
   # Windows PowerShell
   npm start
   ```

   This will start the backend on `http://localhost:3000` and display instructions for serving the frontend.

### Manual Setup (Step by Step)

#### Option 1: Manual Setup (Without Docker)

1. **Install dependencies**
   ```bash
   # Bash/Linux/macOS
   # Root dependencies (for scripts)
   npm install

   # Backend dependencies
   cd backend
   npm install
   cd ..
   ```
   ```cmd
   REM Windows CMD
   REM Root dependencies (for scripts)
   npm install

   REM Backend dependencies
   cd backend
   npm install
   cd ..
   ```
   ```powershell
   # Windows PowerShell
   # Root dependencies (for scripts)
   npm install

   # Backend dependencies
   cd backend
   npm install
   cd ..
   ```

2. **Database Setup** (SQLite - automatic for local development)
   ```bash
   # SQLite database will be created automatically at backend/database.sqlite
   # No additional setup required for local development
   ```

3. **Start the Backend**
   ```bash
   # Bash/Linux/macOS
   cd backend
   npm start
   ```
   ```cmd
   REM Windows CMD
   cd backend
   npm start
   ```
   ```powershell
   # Windows PowerShell
   cd backend
   npm start
   ```
   Backend will be available at `http://localhost:3000`

4. **Serve the Frontend** (in a new terminal)
   ```bash
   # Bash/Linux/macOS
   cd frontend/public
   npx http-server -p 8080 -c-1 --cors
   ```
   ```cmd
   REM Windows CMD
   cd frontend\public
   npx http-server -p 8080 -c-1 --cors
   ```
   ```powershell
   # Windows PowerShell
   cd frontend/public
   npx http-server -p 8080 -c-1 --cors
   ```
   Frontend will be available at `http://localhost:8080`

5. **Access the Game**
   - **Game**: http://localhost:8080
   - **Admin Panel**: http://localhost:8080/admin.html (password: admin123)
   - **Backend API**: http://localhost:3000
   - **Health Check**: http://localhost:3000/health

#### Option 2: Docker Setup

For a fully containerized development environment:

1. **Build and start with Docker**
   ```bash
   # Bash/Linux/macOS
   # Build and start both services
   npm run docker:build

   # Or build specific services
   npm run docker:build:backend
   npm run docker:build:frontend
   ```
   ```cmd
   REM Windows CMD
   REM Build and start both services
   npm run docker:build

   REM Or build specific services
   npm run docker:build:backend
   npm run docker:build:frontend
   ```
   ```powershell
   # Windows PowerShell
   # Build and start both services
   npm run docker:build

   # Or build specific services
   npm run docker:build:backend
   npm run docker:build:frontend
   ```

2. **Access the application**
   - **Frontend**: http://localhost:8080
   - **Backend**: http://localhost:3000
   - **Admin Panel**: http://localhost:8080/admin.html

3. **Docker commands**
   ```bash
   # Bash/Linux/macOS
   # Start services
   npm run docker:up

   # View logs
   npm run docker:logs

   # Stop services
   npm run docker:down

   # Restart services
   npm run docker:restart
   ```
   ```cmd
   REM Windows CMD
   REM Start services
   npm run docker:up

   REM View logs
   npm run docker:logs

   REM Stop services
   npm run docker:down

   REM Restart services
   npm run docker:restart
   ```
   ```powershell
   # Windows PowerShell
   # Start services
   npm run docker:up

   # View logs
   npm run docker:logs

   # Stop services
   npm run docker:down

   # Restart services
   npm run docker:restart
   ```

### Environment Configuration

#### Backend Environment Variables
Create a `.env` file in the backend directory or set environment variables:

```bash
# Server Configuration
PORT=3000
CORS_ORIGIN=http://localhost:8080

# Security
JWT_SECRET=your-development-jwt-secret-key-change-in-production

# Database (SQLite for local dev)
DB_PATH=./database.sqlite

# Admin
ADMIN_PASSWORD=admin123
```

#### Frontend Configuration
The frontend automatically detects the local development environment. For custom backend URLs:

**Method 1: Edit HTML (permanent)**
```html
<!-- Add to frontend/public/index.html before config.js -->
<script>
  window.__ENV__ = {
    API_BASE_URL: "http://localhost:3000",
    SOCKET_URL: "http://localhost:3000"
  };
</script>
```

**Method 2: Browser localStorage (temporary)**
```javascript
// Run in browser console
localStorage.setItem('API_BASE_URL', 'http://localhost:3000');
localStorage.setItem('SOCKET_URL', 'http://localhost:3000');
```

#### Production Setup
For production deployment with PostgreSQL:

1. Set `DATABASE_URL` environment variable
2. Run database setup: `npm run setup-postgres`
3. Configure CORS_ORIGIN for your frontend domain

## Game Rules

### Objective
The goal is to destroy the enemy's air fleet before they destroy yours.

### The Fleet
Each player commands a squadron of **3 Aircraft**.
Every aircraft has a specific shape occupying **10 grid cells**.

### Aircraft Shape
The aircraft is a **Heavy Bomber** (10 Cells):
```
      H        (Head)
    WWBWW      (Neck/Wings)
      B        (Body)
     TTT       (Tail)
```

### Gameplay
1.  **Placement**: Drag and drop your 3 aircraft onto the 10x10 grid. Press **'R'** to rotate.
2.  **Combat**: Players take turns firing at the enemy grid.
    - **MISS** (Gray): Hitting empty water.
    - **HIT** (Red): Hitting the wings, body, or tail.
    - **FATAL** (Black): Hitting the **Head** instantly destroys the entire aircraft.
4.  **Auto-Matching**: If you wait more than 5 seconds in the lobby, a robot opponent will satisfy your thirst for battle!
5.  **Victory**: Destroy all 3 enemy aircraft to win.

## Deployment & CI/CD

This project includes a comprehensive CI/CD pipeline for automated testing and deployment.

### Quick Start
1. **Set up deployment platforms** (Railway, Render, Heroku, Vercel, or Netlify)
2. **Configure GitHub secrets** in your repository settings
3. **Push to main branch** to trigger automatic deployment

### Supported Platforms
- **Backend**: Railway, Render, Heroku, Vercel (with Postgres), Docker
- **Frontend**: Vercel, Netlify, GitHub Pages
- **Container**: Docker for any cloud platform
- **Database**: SQLite (local), PostgreSQL (production)

### Integration Testing

The project includes automated integration testing for deployed environments.

#### CI/CD Integration Testing

The GitHub Actions workflow automatically:
1. Deploys backend and captures its URL
2. Updates frontend configuration with the backend URL
3. Deploys frontend with correct backend connection
4. Runs comprehensive integration tests

#### Configuration

The frontend uses runtime configuration and automatically connects to the correct backend:

- **Development**: Automatically uses `localhost:3000` (with port 8080 redirected)
- **Production**: Uses localStorage overrides for testing different backends
- **No build-time configuration required**: The frontend handles all URL resolution at runtime

For testing different backend URLs, use browser developer tools:
```javascript
localStorage.setItem('API_BASE_URL', 'https://your-backend.com');
localStorage.setItem('SOCKET_URL', 'https://your-backend.com');
```

#### Deployment

The CI/CD pipeline deploys both frontend and backend separately with automatic health checks.

### Documentation
See [CI/CD Setup Guide](docs/CI-CD-SETUP.md) for detailed instructions.

## License
MIT
