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
- Each player places **3 Aircraft**.
- Aircraft Shape: Cruciform (Head, Wings, Body, Tail).
- **Turn-based**: Players take turns bombing coordinates on the enemy grid.
- **Victory**: Destroy all enemy aircraft to win.

## License
MIT
