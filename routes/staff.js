const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');

// Multer Configuration for Staff Images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/staff');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'staff-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB Limit
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

// GET all staff members
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM staffs ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET single staff member by ID
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const [rows] = await db.query('SELECT * FROM staffs WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Staff member not found' });
        }

        const staff = rows[0];

        // Fetch related data if needed for editing
        const [socialLinks] = await db.query('SELECT * FROM staff_social_links WHERE staff_id = ?', [id]);
        const [expertise] = await db.query('SELECT * FROM staff_expertise WHERE staff_id = ? ORDER BY display_order ASC', [id]);
        const [experience] = await db.query('SELECT * FROM staff_experience WHERE staff_id = ? ORDER BY start_date DESC', [id]);
        const [certifications] = await db.query('SELECT * FROM staff_certifications WHERE staff_id = ? ORDER BY issue_date DESC', [id]);

        res.json({
            ...staff,
            social_links: socialLinks,
            expertise: expertise,
            experience: experience,
            certifications: certifications
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST a new staff member
router.post('/', upload.single('profile_image_file'), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const {
            first_name, last_name, slug, email, phone, title, badge, bio,
            students_count, average_rating, courses_count, years_experience,
            personal_website, is_active
        } = req.body;

        // Parse dynamic fields
        const expertise = req.body.expertise ? JSON.parse(req.body.expertise) : [];
        const experience = req.body.experience ? JSON.parse(req.body.experience) : [];
        const certifications = req.body.certifications ? JSON.parse(req.body.certifications) : [];
        const socialLinks = req.body.social_links ? JSON.parse(req.body.social_links) : [];

        // Image Path
        let profileImagePath = req.body.profile_image || null;
        if (req.file) {
            profileImagePath = `/uploads/staff/${req.file.filename}`;
        }

        // 1. Insert into staffs table
        const [result] = await connection.query(
            `INSERT INTO staffs (
                first_name, last_name, slug, email, phone, title, badge, bio,
                students_count, average_rating, courses_count, years_experience,
                profile_image, personal_website, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                first_name, last_name, slug, email, phone, title, badge, bio,
                students_count || 0, average_rating || 0.0, courses_count || 0, years_experience || 0,
                profileImagePath, personal_website, is_active === 'on' || is_active === 'true' || is_active === true
            ]
        );

        const staffId = result.insertId;

        // 2. Insert Social Links
        if (socialLinks.length > 0) {
            const values = socialLinks.map(l => [staffId, l.platform, l.url]);
            await connection.query('INSERT INTO staff_social_links (staff_id, platform, profile_url) VALUES ?', [values]);
        }

        // 3. Insert Expertise
        if (expertise.length > 0) {
            const values = expertise.map(e => [staffId, e.category, e.level, e.display_order]);
            await connection.query('INSERT INTO staff_expertise (staff_id, category, proficiency_level, display_order) VALUES ?', [values]);
        }

        // 4. Insert Experience
        if (experience.length > 0) {
            for (const exp of experience) {
                await connection.query(
                    'INSERT INTO staff_experience (staff_id, job_title, company_name, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?)',
                    [staffId, exp.job_title, exp.company_name, exp.start_date || null, exp.end_date || null, exp.description]
                );
            }
        }

        // 5. Insert Certifications
        if (certifications.length > 0) {
            for (const cert of certifications) {
                await connection.query(
                    'INSERT INTO staff_certifications (staff_id, certification_name, issuing_organization) VALUES (?, ?, ?)',
                    [staffId, cert.name, cert.org]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Staff member added successfully', id: staffId });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Error adding staff member', error: err.message });
    } finally {
        connection.release();
    }
});

// UPDATE a staff member
router.put('/:id', upload.single('profile_image_file'), async (req, res) => {
    const staffId = req.params.id;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const {
            first_name, last_name, slug, email, phone, title, badge, bio,
            students_count, average_rating, courses_count, years_experience,
            personal_website, is_active
        } = req.body;

        const expertise = req.body.expertise ? JSON.parse(req.body.expertise) : [];
        const experience = req.body.experience ? JSON.parse(req.body.experience) : [];
        const certifications = req.body.certifications ? JSON.parse(req.body.certifications) : [];
        const socialLinks = req.body.social_links ? JSON.parse(req.body.social_links) : [];

        // 1. Update Core Table
        let updateQuery = `
            UPDATE staffs SET 
                first_name=?, last_name=?, slug=?, email=?, phone=?, title=?, badge=?, bio=?,
                students_count=?, average_rating=?, courses_count=?, years_experience=?,
                personal_website=?, is_active=?
        `;
        let queryParams = [
            first_name, last_name, slug, email, phone, title, badge, bio,
            students_count || 0, average_rating || 0.0, courses_count || 0, years_experience || 0,
            personal_website, is_active === 'on' || is_active === 'true' || is_active === true
        ];

        if (req.file) {
            updateQuery += ', profile_image=?';
            queryParams.push(`/uploads/staff/${req.file.filename}`);
        } else if (req.body.profile_image) {
            updateQuery += ', profile_image=?';
            queryParams.push(req.body.profile_image);
        }

        updateQuery += ' WHERE id=?';
        queryParams.push(staffId);

        await connection.query(updateQuery, queryParams);

        // 2. Refresh Social Links
        await connection.query('DELETE FROM staff_social_links WHERE staff_id = ?', [staffId]);
        if (socialLinks.length > 0) {
            const values = socialLinks.map(l => [staffId, l.platform, l.url]);
            await connection.query('INSERT INTO staff_social_links (staff_id, platform, profile_url) VALUES ?', [values]);
        }

        // 3. Refresh Expertise
        await connection.query('DELETE FROM staff_expertise WHERE staff_id = ?', [staffId]);
        if (expertise.length > 0) {
            const values = expertise.map(e => [staffId, e.category, e.level, e.display_order]);
            await connection.query('INSERT INTO staff_expertise (staff_id, category, proficiency_level, display_order) VALUES ?', [values]);
        }

        // 4. Refresh Experience
        await connection.query('DELETE FROM staff_experience WHERE staff_id = ?', [staffId]);
        if (experience.length > 0) {
            for (const exp of experience) {
                await connection.query(
                    'INSERT INTO staff_experience (staff_id, job_title, company_name, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?)',
                    [staffId, exp.job_title, exp.company_name, exp.start_date || null, exp.end_date || null, exp.description]
                );
            }
        }

        // 5. Refresh Certifications
        await connection.query('DELETE FROM staff_certifications WHERE staff_id = ?', [staffId]);
        if (certifications.length > 0) {
            for (const cert of certifications) {
                await connection.query(
                    'INSERT INTO staff_certifications (staff_id, certification_name, issuing_organization) VALUES (?, ?, ?)',
                    [staffId, cert.name, cert.org]
                );
            }
        }

        await connection.commit();
        res.json({ message: 'Staff member updated successfully' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Update failed', error: err.message });
    } finally {
        connection.release();
    }
});

// DELETE a staff member
router.delete('/:id', async (req, res) => {
    const staffId = req.params.id;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Dependencies should ideally be handled with ON DELETE CASCADE in SQL,
        // but we'll do it manually to be safe.
        await connection.query('DELETE FROM staff_social_links WHERE staff_id = ?', [staffId]);
        await connection.query('DELETE FROM staff_expertise WHERE staff_id = ?', [staffId]);
        await connection.query('DELETE FROM staff_experience WHERE staff_id = ?', [staffId]);
        await connection.query('DELETE FROM staff_certifications WHERE staff_id = ?', [staffId]);
        await connection.query('DELETE FROM staff_feedback WHERE staff_id = ?', [staffId]);
        await connection.query('DELETE FROM staffs WHERE id = ?', [staffId]);

        await connection.commit();
        res.json({ message: 'Staff member deleted permanently' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Deletion failed' });
    } finally {
        connection.release();
    }
});

module.exports = router;
