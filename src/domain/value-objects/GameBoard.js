const Coordinate = require('./Coordinate');

/**
 * Value Object representing the game board with cell states
 */
class GameBoard {
    // Cell states
    static EMPTY = 0;      // Empty water
    static SHIP = 1;       // Ship part present
    static HIT = 2;        // Hit on ship
    static MISS = 3;       // Miss (shot in water)
    static FATAL = 4;      // Fatal hit (head destroyed)

    constructor() {
        this._grid = Array(10).fill(null).map(() =>
            Array(10).fill(GameBoard.EMPTY)
        );
        Object.freeze(this._grid);
        Object.freeze(this);
    }

    get grid() {
        return this._grid.map(row => [...row]);
    }

    /**
     * Get the state of a specific cell
     */
    getCellState(coordinate) {
        return this._grid[coordinate.y][coordinate.x];
    }

    /**
     * Check if a cell has been shot at
     */
    isCellShot(coordinate) {
        const state = this.getCellState(coordinate);
        return state === GameBoard.HIT || state === GameBoard.MISS || state === GameBoard.FATAL;
    }

    /**
     * Check if a cell contains a ship
     */
    hasShipAt(coordinate) {
        return this.getCellState(coordinate) === GameBoard.SHIP;
    }

    /**
     * Create a new board with a ship placed at the given coordinates
     */
    placeShip(coordinates) {
        const newGrid = this.grid;
        coordinates.forEach(coord => {
            if (this.hasShipAt(coord) || this.isCellShot(coord)) {
                throw new Error(`Cannot place ship at ${coord}: cell already occupied or shot`);
            }
            newGrid[coord.y][coord.x] = GameBoard.SHIP;
        });
        return GameBoard.fromGrid(newGrid);
    }

    /**
     * Create a new board with a shot at the given coordinate
     */
    shoot(coordinate, isHit, isFatal = false) {
        if (this.isCellShot(coordinate)) {
            throw new Error(`Cell ${coordinate} has already been shot`);
        }

        const newGrid = this.grid;
        if (isFatal) {
            newGrid[coordinate.y][coordinate.x] = GameBoard.FATAL;
        } else if (isHit) {
            newGrid[coordinate.y][coordinate.x] = GameBoard.HIT;
        } else {
            newGrid[coordinate.y][coordinate.x] = GameBoard.MISS;
        }

        return GameBoard.fromGrid(newGrid);
    }

    /**
     * Get all ship coordinates on the board
     */
    getShipCoordinates() {
        const coordinates = [];
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                if (this._grid[y][x] === GameBoard.SHIP) {
                    coordinates.push(new Coordinate(x, y));
                }
            }
        }
        return coordinates;
    }

    /**
     * Check if the board has any ships remaining
     */
    hasShipsRemaining() {
        return this.getShipCoordinates().length > 0;
    }

    /**
     * Create GameBoard from a 2D grid array
     */
    static fromGrid(grid) {
        const board = Object.create(GameBoard.prototype);
        board._grid = grid.map(row => [...row]);
        Object.freeze(board._grid);
        Object.freeze(board);
        return board;
    }

    /**
     * Create an empty board
     */
    static createEmpty() {
        return new GameBoard();
    }

    equals(other) {
        if (!(other instanceof GameBoard)) {
            return false;
        }

        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                if (this._grid[y][x] !== other._grid[y][x]) {
                    return false;
                }
            }
        }
        return true;
    }

    toString() {
        let result = '';
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                result += this._grid[y][x] + ' ';
            }
            result += '\n';
        }
        return result;
    }
}

module.exports = GameBoard;