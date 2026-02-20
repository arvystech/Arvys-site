const db = require('../config/db');

async function init() {
    try {
        console.log('Initializing database settings...');

        // 1. Create app_settings table
        await db.query(`
            CREATE TABLE IF NOT EXISTS app_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('Table app_settings created or already exists.');

        // 2. Insert manager passphrase
        const hashedPassphrase = '$2b$10$KkTF2WGi.lwQLxIFHF8lROVSToWaJSE0R7FU4C5qjM/sKTRRSod.S';
        await db.query(`
            INSERT IGNORE INTO app_settings (setting_key, setting_value) 
            VALUES ('manager_passphrase', ?)
        `, [hashedPassphrase]);
        console.log('Manager passphrase verified/inserted in database.');

        console.log('Database initialization complete.');
        process.exit(0);
    } catch (err) {
        console.error('Database initialization failed:', err);
        process.exit(1);
    }
}

init();
