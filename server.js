const express = require('express');
const path = require('path');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Set View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the 'public' directory (css, js, images)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const mainRoutes = require('./routes/main');
const courseRoutes = require('./routes/courses');

// Use Main Routes for Pages
app.use('/', mainRoutes);

// API Routes
app.use('/api/courses', courseRoutes);

// Test database connection
db.query('SELECT 1')
    .then(() => console.log('Database connected successfully'))
    .catch(err => console.error('Database connection failed:', err));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
