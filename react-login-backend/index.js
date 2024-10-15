// Import required packages
require('dotenv').config({ path: './ls.env' });
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Initialize the Express application
const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// PostgreSQL pool configuration using environment variables
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Test database connection
pool.connect()
    .then(() => {
        console.log('Connected to the database successfully');
    })
    .catch(err => {
        console.error('Database connection error:', err);
        process.exit(1); // Exit if the connection fails
    });

// User registration route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if the user already exists
        const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Save the new user in the database with the plain-text password
        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, password]);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error in registration route:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Query to find the user by username
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'User not found' });
        }

        const user = result.rows[0];

        // Directly compare the provided password with the stored plain-text password
        if (user.password !== password) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        // Generate a JWT token for the user
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        // Respond with success message and token
        res.json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Error in login route:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
