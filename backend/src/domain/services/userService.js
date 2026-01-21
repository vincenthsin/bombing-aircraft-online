const userRepository = require('../../infrastructure/persistence/userRepository');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = '7d';

class UserService {
    async register(username, email, password) {
        // Validate input
        if (!username || !email || !password) {
            throw new Error('All fields are required');
        }

        if (username.length < 3) {
            throw new Error('Username must be at least 3 characters long');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        // Check if username or email already exists
        const existingUser = await userRepository.findByUsername(username);
        if (existingUser) {
            throw new Error('Username already exists');
        }

        const existingEmail = await userRepository.findByEmail(email);
        if (existingEmail) {
            throw new Error('Email already exists');
        }

        // Create user
        const userId = await userRepository.createUser(username, email, password);

        // Return user data (without password)
        const user = await userRepository.findById(userId);
        return user;
    }

    async login(username, password) {
        if (!username || !password) {
            throw new Error('Username and password are required');
        }

        const user = await userRepository.verifyPassword(username, password);
        if (!user) {
            throw new Error('Invalid username or password');
        }

        // Update last login
        await userRepository.updateLastLogin(user.id);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                createdAt: user.created_at,
                lastLogin: user.last_login
            },
            token
        };
    }

    async getUserProfile(userId) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const stats = await userRepository.getUserStats(userId);

        return {
            ...user,
            stats
        };
    }

    async getUserGameHistory(userId, limit = 20, offset = 0) {
        return await userRepository.getGameHistory(userId, limit, offset);
    }

    async getUserRecentGames(userId, limit = 10) {
        return await userRepository.getRecentGames(userId, limit);
    }

    // JWT token verification
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            return decoded;
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    // Get user by token
    async getUserFromToken(token) {
        const decoded = this.verifyToken(token);
        const user = await userRepository.findById(decoded.userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    // Validate user input
    validateUsername(username) {
        if (!username || username.length < 3 || username.length > 20) {
            return false;
        }
        // Only allow alphanumeric characters and underscores
        return /^[a-zA-Z0-9_]+$/.test(username);
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePassword(password) {
        return password && password.length >= 6;
    }
}

module.exports = new UserService();