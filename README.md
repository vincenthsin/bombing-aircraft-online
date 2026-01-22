# Bombing Aircraft Online

A modern, real-time multiplayer web implementation of the classic "Bombing Aircraft" (Zha Feiji) game.
Built with **Node.js**, **Express**, and **Socket.io**.

## Features
- **Real-time Multiplayer**: Play against friends instantly.
- **Modern UI**: Dark-mode, sci-fi aesthetic with responsive grid layout.
- **Drag & Drop**: Easy ship placement with rotation support.
- **Socket.io**: Instant game state synchronization.

## Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)

## How to Run

This repo is split for **separate frontend + backend deployment**:

- **Frontend**: `frontend/public/` (static files)
- **Backend**: `backend/` (Node/Express + Socket.IO + SQLite)

### Run backend (API + Socket.IO)

1.  **Install dependencies**
    ```bash
    cd backend
    npm install
    ```

2.  **Start the server**
    ```bash
    npm start
    ```

Backend defaults to `http://localhost:3000`. You can configure:

- `PORT`: backend listen port
- `CORS_ORIGIN`: allowed frontend origins (comma-separated), or `*` for local dev
- `JWT_SECRET`: JWT secret
- `DB_PATH`: path to `database.sqlite`

### Run frontend (static)

Serve `frontend/public/` with any static server (Nginx, GitHub Pages, Vercel static, etc).

For local development, you can use:
```bash
cd frontend/public
npx http-server -p 8080 -c-1
```

## Integration Testing

The project includes automated integration testing for deployed environments.

### CI/CD Integration Testing

The GitHub Actions workflow automatically:
1. Deploys backend and captures its URL
2. Updates frontend configuration with the backend URL
3. Deploys frontend with correct backend connection
4. Runs comprehensive integration tests

### Manual Integration Testing

After deployment, test the integration manually:

#### Using Node.js Script
```bash
# Install dependencies
npm install

# Run integration tests
node scripts/integration-test.js https://your-frontend.vercel.app https://your-backend.vercel.app
```

#### Using PowerShell Script (Windows)
```powershell
.\scripts\test-deployed-integration.ps1 -FrontendUrl "https://your-frontend.vercel.app" -BackendUrl "https://your-backend.vercel.app"
```

### What Gets Tested

- ✅ Backend health endpoint (`/health`)
- ✅ Frontend loads successfully
- ✅ Socket.IO connection works
- ✅ CORS configuration
- ✅ API connectivity between frontend and backend

### Dynamic Domain Resolution

For platforms like Vercel that generate dynamic domains, the CI/CD pipeline automatically:
1. Captures deployment URLs from `vercel --yes` output
2. Updates frontend configuration with actual backend URL
3. Tests the integration with real deployed URLs

**Player Entrance URL**: Players access the game via the frontend URL (e.g., `http://localhost:8080`)

To point the frontend to your backend, set `window.__ENV__.API_BASE_URL` in `frontend/public/index.html`
**before** `config.js` loads, or set `localStorage.API_BASE_URL`.

Example (edit `frontend/public/index.html`):

```html
<script>
  window.__ENV__ = { API_BASE_URL: "https://api.example.com" };
</script>
```

If your Socket.IO server is on a different URL than the API base, you can also set:

- `window.__ENV__.SOCKET_URL`
- or `localStorage.SOCKET_URL`

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
3.  **Victory**: Destroy all 3 enemy aircraft to win.

## Deployment & CI/CD

This project includes a comprehensive CI/CD pipeline for automated testing and deployment.

### Quick Start
1. **Set up deployment platforms** (Railway, Render, Heroku, Vercel, or Netlify)
2. **Configure GitHub secrets** in your repository settings
3. **Push to main branch** to trigger automatic deployment

### Supported Platforms
- **Backend**: Railway, Render, Heroku, Docker
- **Frontend**: Vercel, Netlify, GitHub Pages
- **Container**: Docker for any cloud platform

### Documentation
See [CI/CD Setup Guide](docs/CI-CD-SETUP.md) for detailed instructions.

## License
MIT
