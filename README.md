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

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Start the Server**
    ```bash
    npm start
    ```

3.  **Play**
    - Open your browser to `http://localhost:3000`.
    - Open a second tab (or share the link with a friend on the same network) to simulate the opponent.

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

## License
MIT
