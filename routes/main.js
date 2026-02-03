const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Render Index Page (Home)
router.get('/', (req, res) => {
    res.render('index');
});

// Render About Us Page
router.get('/about', (req, res) => {
    res.render('about');
});

// Render Courses Page (Dynamic)
router.get('/courses', async (req, res) => {
    try {
        const [courses] = await db.query('SELECT * FROM courses ORDER BY created_at DESC');
        res.render('courses', { courses: courses });
    } catch (err) {
        console.error(err);
        res.render('courses', { courses: [] }); // Fallback to empty list or handle error
    }
});

// Render Course Details Page (Dynamic)
router.get('/course-details/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;

        // 1. Get Course Details
        const [courseRows] = await db.query('SELECT * FROM courses WHERE slug = ?', [slug]);

        if (courseRows.length === 0) {
            return res.status(404).render('404'); // Or redirect to courses
        }

        const course = courseRows[0];
        const courseId = course.id;

        // 2. Get Course Outcomes
        const [outcomes] = await db.query(
            'SELECT * FROM course_outcomes WHERE course_id = ? ORDER BY outcome_order ASC',
            [courseId]
        );

        // 3. Get Course Sections
        const [sections] = await db.query(
            'SELECT * FROM course_sections WHERE course_id = ? ORDER BY section_order ASC',
            [courseId]
        );

        // 4. Get Course Topics
        const [topics] = await db.query(`
            SELECT t.*, s.id as section_id 
            FROM course_topics t 
            JOIN course_sections s ON t.section_id = s.id 
            WHERE s.course_id = ? 
            ORDER BY t.topic_order ASC
        `, [courseId]);

        // 5. Structure Curriculum: Nest topics inside sections
        const curriculum = sections.map(section => {
            return {
                ...section,
                topics: topics.filter(topic => topic.section_id === section.id)
            };
        });

        // 6. Combine all data
        const courseData = {
            ...course,
            outcomes: outcomes,
            curriculum: curriculum
        };

        res.render('course-details', { course: courseData });

    } catch (err) {
        console.error(err);
        res.status(500).redirect('/courses');
    }
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

// Render Staffs Page (Dynamic)
router.get('/staffs', async (req, res) => {
    try {
        // Fetch all active staff members
        const [staffs] = await db.query(`
            SELECT * FROM staffs 
            WHERE is_active = TRUE 
            ORDER BY is_featured DESC, created_at DESC
        `);

        // Fetch social links for all staff (up to 3 per staff)
        const [socialLinks] = await db.query(`
            SELECT staff_id, platform, profile_url, display_order 
            FROM staff_social_links 
            ORDER BY staff_id, display_order ASC
        `);

        // Attach social links to each staff member
        const staffsWithSocial = staffs.map(staff => {
            return {
                ...staff,
                social_links: socialLinks.filter(link => link.staff_id === staff.id).slice(0, 3)
            };
        });

        res.render('staffs', { staffs: staffsWithSocial });
    } catch (err) {
        console.error('Error fetching staffs:', err);
        res.render('staffs', { staffs: [] }); // Fallback to empty list
    }
});


// Render Staffs Details Page (Dynamic)
router.get('/staffs/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;

        // 1. Get Staff Basic Info
        const [staffRows] = await db.query(`
            SELECT * FROM staffs 
            WHERE slug = ? AND is_active = TRUE
        `, [slug]);

        if (staffRows.length === 0) {
            return res.status(404).render('404');
        }

        const staff = staffRows[0];
        const staffId = staff.id;

        // 2. Get Social Links (up to 3)
        const [socialLinks] = await db.query(`
            SELECT platform, profile_url, display_order 
            FROM staff_social_links 
            WHERE staff_id = ? 
            ORDER BY display_order ASC 
            LIMIT 3
        `, [staffId]);

        // 3. Get Expertise/Skills
        const [expertise] = await db.query(`
            SELECT category, proficiency_level 
            FROM staff_expertise 
            WHERE staff_id = ? 
            ORDER BY display_order ASC
        `, [staffId]);

        // 4. Get Professional Experience
        const [experience] = await db.query(`
            SELECT job_title, company_name, company_website, location,
                   start_date, end_date, is_current, description
            FROM staff_experience 
            WHERE staff_id = ? 
            ORDER BY is_current DESC, start_date DESC
        `, [staffId]);

        // 5. Get Certifications
        const [certifications] = await db.query(`
            SELECT certification_name, issuing_organization, 
                   issue_date, expiry_date, credential_url
            FROM staff_certifications 
            WHERE staff_id = ? 
            ORDER BY issue_date DESC
        `, [staffId]);

        // 6. Get Student Feedback (approved only)
        const [feedback] = await db.query(`
            SELECT student_name, student_avatar, rating, comment, course_taken
            FROM staff_feedback 
            WHERE staff_id = ? AND is_approved = TRUE 
            ORDER BY created_at DESC
            LIMIT 10
        `, [staffId]);

        // Structure all data
        const staffData = {
            ...staff,
            social_links: socialLinks,
            expertise: expertise,
            experience: experience,
            certifications: certifications,
            feedback: feedback
        };

        res.render('staffs-details', { staff: staffData });

    } catch (err) {
        console.error('Error fetching staff details:', err);
        res.status(500).redirect('/staffs');
    }
});

// Render Manager Page (Dashboard for Courses & Staff)
router.get('/manager', async (req, res) => {
    try {
        const [courses] = await db.query('SELECT * FROM courses ORDER BY created_at DESC');
        const [staff] = await db.query('SELECT * FROM staffs ORDER BY created_at DESC');
        res.render('manager', { courses: courses, staff: staff });
    } catch (err) {
        console.error(err);
        res.render('manager', { courses: [], staff: [] });
    }
});

// Render TEST Page (if needed)
router.get('/test', (req, res) => {
    res.render('TEST');
});

module.exports = router;
