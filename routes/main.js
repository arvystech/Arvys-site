const express = require('express');
const router = express.Router();

// Render Index Page
router.get('/', (req, res) => {
    res.render('index');
});

// Render About Page
router.get('/about', (req, res) => {
    res.render('about');
});

// Render Courses Page
router.get('/courses', (req, res) => {
    res.render('courses');
});

// Render Course Details Page (Note: Frontend will likely fetch details via API, or we can pass data later)
router.get('/course-details', (req, res) => {
    // For now hardcoded as requested, expecting ?slug=... in URL for client-side JS handling
    res.render('course-details');
});

// Render Industrial Training Page
router.get('/industrial-training', (req, res) => {
    res.render('Industrial-training');
});

// Render IT Register Page
router.get('/it-register', (req, res) => {
    res.render('it-register');
});

// Render Login Page
router.get('/login', (req, res) => {
    res.render('login');
});

// Render Register Page
router.get('/register', (req, res) => {
    res.render('register');
});

// Render Staffs Page
router.get('/staffs', (req, res) => {
    res.render('staffs');
});

// Render Staffs Details Page
router.get('/staffs-details', (req, res) => {
    res.render('staffs-details');
});

// Render TEST Page (if needed)
router.get('/test', (req, res) => {
    res.render('TEST');
});

module.exports = router;
