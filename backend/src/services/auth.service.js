import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';
import { AppDataSource } from '../database/datasource.js';

/**
 * Hashes a plain-text password using bcryptjs with a high-security salt factor.
 * @param {string} password - The plain-text password to hash.
 * @returns {Promise<string>} The cryptographically secure hashed password.
 */
export async function hashPassword(password) {
    const saltRounds = 12; // High-security operational standard for hashing complexity
    return await bcrypt.hash(password, saltRounds);
}

/**
 * Securely compares a plain-text password against a stored hashed password.
 * @param {string} password - The plain-text password attempt.
 * @param {string} hashedPassword - The stored hashed password from the database.
 * @returns {Promise<boolean>} True if matching, false otherwise.
 */
export async function comparePasswords(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

/**
 * Generates a signed JSON Web Token (JWT) for the authenticated user context.
 * The token contains a subject ('sub') claim containing the user's UUID.
 * @param {object} user - The user object containing at least the database ID.
 * @returns {string} The signed JWT access token.
 */
export function generateToken(user) {
    const payload = {
        sub: user.id,
        email: user.email
    };

    const options = {
        expiresIn: '12h' // Configured for an exact 12-hour expiration window
    };

    return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Registers a new user with hashed password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} The created user entity.
 */
export async function registerUser(email, password) {
    const hashedPassword = await hashPassword(password);
    const userRepository = AppDataSource.getRepository('User');
    const newUser = userRepository.create({
        email,
        password: hashedPassword
    });
    return await userRepository.save(newUser);
}

/**
 * Authenticates user credentials and generates a JWT.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string|null>} The JWT token or null if authentication fails.
 */
export async function authenticateCredentials(email, password) {
    const userRepository = AppDataSource.getRepository('User');
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
        return null;
    }
    const isMatch = await comparePasswords(password, user.password);
    if (!isMatch) {
        return null;
    }
    return generateToken(user);
}