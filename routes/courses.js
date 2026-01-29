const express = require('express');
const router = express.Router();
const db = require('../config/db');

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
        // We join with sections to ensure we only get topics for this course
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

module.exports = router;
