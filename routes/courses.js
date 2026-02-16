const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');

const fs = require('fs');

// Multer Configuration for Course Images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/uploads/courses';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'course-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpeg, jpg, png, webp) are allowed!'));
    }
});

// GET all courses
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM courses ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET single course details by slug
router.get('/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;

        // 1. Get Course Details
        const [courseRows] = await db.query('SELECT * FROM courses WHERE slug = ?', [slug]);

        if (courseRows.length === 0) {
            return res.status(404).json({ message: 'Course not found' });
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

        // 4. Get Course Topics (for all sections in this course)
        const [topics] = await db.query(`
            SELECT t.*, s.id as section_id 
            FROM course_topics t 
            JOIN course_sections s ON t.section_id = s.id 
            WHERE s.course_id = ? 
            ORDER BY t.topic_order ASC
        `, [courseId]);

        // 5. Structure the data: Nest topics inside sections
        const sectionsWithTopics = sections.map(section => {
            return {
                ...section,
                topics: topics.filter(topic => topic.section_id === section.id)
            };
        });

        // 6. Construct final response object
        const responseData = {
            ...course,
            outcomes: outcomes,
            curriculum: sectionsWithTopics
        };

        res.json(responseData);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST a new course with all details (including image and availability)
router.post('/', (req, res, next) => {
    upload.single('course_image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
            }
            return res.status(400).json({ message: err.message });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}, async (req, res) => {
    // Ensure req.body is defined (multer should set it, but as a fallback)
    if (!req.body) {
        return res.status(400).json({ message: 'Request body is missing. Please ensure you are sending form data.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const {
            slug,
            title,
            tagline,
            description,
            duration,
            level,
            price,
            availability
        } = req.body;

        // Basic validation
        if (!slug || !title) {
            return res.status(400).json({ message: 'Missing required fields: slug and title are mandatory.' });
        }

        // Parse JSON strings from FormData
        const outcomes = req.body.outcomes ? JSON.parse(req.body.outcomes) : [];
        const sections = req.body.sections ? JSON.parse(req.body.sections) : [];

        // Image Path
        const imagePath = req.file ? `/uploads/courses/${req.file.filename}` : null;

        // 1. Insert into courses table
        const [courseResult] = await connection.query(
            'INSERT INTO courses (slug, title, tagline, description, duration, level, price, image_path, availability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [slug, title, tagline, description, duration, level, price, imagePath, availability]
        );

        const courseId = courseResult.insertId;

        // 2. Insert into course_outcomes table
        if (outcomes.length > 0) {
            const outcomeValues = outcomes.map(outcome => [
                courseId,
                outcome.outcome_order,
                outcome.title
            ]);
            await connection.query(
                'INSERT INTO course_outcomes (course_id, outcome_order, title) VALUES ?',
                [outcomeValues]
            );
        }

        // 3. Insert into course_sections and course_topics tables
        if (sections.length > 0) {
            for (const section of sections) {
                const [sectionResult] = await connection.query(
                    'INSERT INTO course_sections (course_id, section_order, title, duration, section_project) VALUES (?, ?, ?, ?, ?)',
                    [courseId, section.section_order, section.title, section.duration, section.section_project]
                );

                const sectionId = sectionResult.insertId;

                if (section.topics && section.topics.length > 0) {
                    const topicValues = section.topics.map(topic => [
                        sectionId,
                        topic.topic_order,
                        topic.title
                    ]);
                    await connection.query(
                        'INSERT INTO course_topics (section_id, topic_order, title) VALUES ?',
                        [topicValues]
                    );
                }
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Course added successfully', courseId });

    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Error adding course', error: err.message });
    } finally {
        connection.release();
    }
});

// UPDATE a course
router.put('/:id', (req, res, next) => {
    upload.single('course_image')(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        next();
    });
}, async (req, res) => {
    const courseId = req.params.id;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { slug, title, tagline, description, duration, level, price, availability } = req.body;
        const outcomes = req.body.outcomes ? JSON.parse(req.body.outcomes) : [];
        const sections = req.body.sections ? JSON.parse(req.body.sections) : [];

        // 1. Update Core Course Table
        let updateQuery = 'UPDATE courses SET slug=?, title=?, tagline=?, description=?, duration=?, level=?, price=?, availability=?';
        let queryParams = [slug, title, tagline, description, duration, level, price, availability];

        if (req.file) {
            const imagePath = `/uploads/courses/${req.file.filename}`;
            updateQuery += ', image_path=?';
            queryParams.push(imagePath);
        }

        updateQuery += ' WHERE id=?';
        queryParams.push(courseId);
        await connection.query(updateQuery, queryParams);

        // 2. Refresh Outcomes: Delete old, Insert new
        await connection.query('DELETE FROM course_outcomes WHERE course_id = ?', [courseId]);
        if (outcomes.length > 0) {
            const outcomeValues = outcomes.map(o => [courseId, o.outcome_order, o.title]);
            await connection.query('INSERT INTO course_outcomes (course_id, outcome_order, title) VALUES ?', [outcomeValues]);
        }

        // 3. Refresh Curriculum: Delete old (topics & sections), Insert new
        // First get section IDs to delete topics
        const [oldSections] = await connection.query('SELECT id FROM course_sections WHERE course_id = ?', [courseId]);
        if (oldSections.length > 0) {
            const oldSecIds = oldSections.map(s => s.id);
            await connection.query('DELETE FROM course_topics WHERE section_id IN (?)', [oldSecIds]);
        }
        await connection.query('DELETE FROM course_sections WHERE course_id = ?', [courseId]);

        if (sections.length > 0) {
            for (const section of sections) {
                const [secRes] = await connection.query(
                    'INSERT INTO course_sections (course_id, section_order, title, duration, section_project) VALUES (?, ?, ?, ?, ?)',
                    [courseId, section.section_order, section.title, section.duration, section.section_project]
                );
                const newSecId = secRes.insertId;

                if (section.topics && section.topics.length > 0) {
                    const topicValues = section.topics.map(t => [newSecId, t.topic_order, t.title]);
                    await connection.query('INSERT INTO course_topics (section_id, topic_order, title) VALUES ?', [topicValues]);
                }
            }
        }

        await connection.commit();
        res.json({ message: 'Course updated successfully' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Update failed', error: err.message });
    } finally {
        connection.release();
    }
});

// DELETE a course
router.delete('/:id', async (req, res) => {
    const courseId = req.params.id;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Delete dependencies (in case no foreign key CASCADE is set in DB)
        const [sections] = await connection.query('SELECT id FROM course_sections WHERE course_id = ?', [courseId]);
        if (sections.length > 0) {
            const secIds = sections.map(s => s.id);
            await connection.query('DELETE FROM course_topics WHERE section_id IN (?)', [secIds]);
        }
        await connection.query('DELETE FROM course_sections WHERE course_id = ?', [courseId]);
        await connection.query('DELETE FROM course_outcomes WHERE course_id = ?', [courseId]);
        await connection.query('DELETE FROM courses WHERE id = ?', [courseId]);

        await connection.commit();
        res.json({ message: 'Course deleted permanently' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Deletions failed' });
    } finally {
        connection.release();
    }
});

module.exports = router;
