const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  multipleStatements: true
};

let pool;

async function initDB() {
  try {
    // 1. Connect without database selected to create it if it doesn't exist
    const connection = await mysql.createConnection(dbConfig);
    const dbName = process.env.DB_NAME || 'smart_complaints';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();

    // 2. Create the pool attached to the database
    pool = mysql.createPool({
      ...dbConfig,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 3. Create complaints table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS complaints (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'Other',
        ai_priority VARCHAR(20) DEFAULT 'Low',
        status VARCHAR(20) DEFAULT 'open',
        image_data LONGTEXT,
        registered_by VARCHAR(255) DEFAULT 'Anonymous',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createTableQuery);

    // Ensure new columns exist on existing databases
    try {
      await pool.query('ALTER TABLE complaints ADD COLUMN image_data LONGTEXT');
    } catch (e) {}
    try {
      await pool.query("ALTER TABLE complaints ADD COLUMN registered_by VARCHAR(255) DEFAULT 'Anonymous'");
    } catch (e) {}
    try { await pool.query("ALTER TABLE complaints ADD COLUMN location_block VARCHAR(50)"); } catch (e) {}
    try { await pool.query("ALTER TABLE complaints ADD COLUMN location_floor VARCHAR(50)"); } catch (e) {}
    try { await pool.query("ALTER TABLE complaints ADD COLUMN location_room VARCHAR(50)"); } catch (e) {}
    try { await pool.query("ALTER TABLE complaints ADD COLUMN assigned_to VARCHAR(255)"); } catch (e) {}
    try { await pool.query("ALTER TABLE complaints ADD COLUMN sla_deadline DATETIME"); } catch (e) {}
    try { await pool.query("ALTER TABLE complaints ADD COLUMN escalation_level INT DEFAULT 0"); } catch (e) {}
    try { await pool.query("ALTER TABLE complaints ADD COLUMN is_duplicate_of VARCHAR(36)"); } catch (e) {}
    try { await pool.query("ALTER TABLE complaints ADD COLUMN admin_priority VARCHAR(20)"); } catch (e) {}
    try { await pool.query("ALTER TABLE complaints ADD COLUMN sentiment VARCHAR(50)"); } catch (e) {}
    try { await pool.query("ALTER TABLE complaints ADD COLUMN ai_reason TEXT"); } catch (e) {}
    try { await pool.query("ALTER TABLE complaints ADD COLUMN points_awarded BOOLEAN DEFAULT FALSE"); } catch (e) {}
    try { await pool.query("ALTER TABLE users ADD COLUMN points INT DEFAULT 0"); } catch (e) {}
    try { await pool.query("ALTER TABLE users ADD COLUMN profile_pic LONGTEXT"); } catch (e) {}
    try { await pool.query("ALTER TABLE users ADD COLUMN usn VARCHAR(50)"); } catch (e) {}
    try { await pool.query("ALTER TABLE users ADD COLUMN semester VARCHAR(20)"); } catch (e) {}
    try { await pool.query("ALTER TABLE users ADD COLUMN email VARCHAR(255)"); } catch (e) {}
    // 3.5 Create Comments and Activity Logs tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(36) PRIMARY KEY,
        complaint_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(36) PRIMARY KEY,
        complaint_id VARCHAR(36) NOT NULL,
        action VARCHAR(255) NOT NULL,
        performed_by VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_feedback (
        id VARCHAR(36) PRIMARY KEY,
        complaint_id VARCHAR(36) NOT NULL,
        original_priority VARCHAR(20),
        corrected_priority VARCHAR(20),
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create users table
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'student',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createUsersTableQuery);

    // 5. Seed initial users if they don't exist
    const crypto = require('crypto');
    const [adminExists] = await pool.query('SELECT id FROM users WHERE username = ?', ['admin']);
    if (adminExists.length === 0) {
      await pool.query('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)', [crypto.randomUUID(), 'admin', 'admin', 'admin']);
    }
    
    const [yashasExists] = await pool.query('SELECT id FROM users WHERE username = ?', ['yashas']);
    if (yashasExists.length === 0) {
      await pool.query('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)', [crypto.randomUUID(), 'yashas', 'yashas', 'student']);
    }

    console.log('MySQL Database and tables initialized successfully');
    
    return pool;
  } catch (error) {
    console.error('MySQL Database initialization failed:', error.message);
    console.log('\n--- IMPORTANT ---\nPlease ensure your MySQL Workbench is running and check the backend/.env file to verify the DB_USER and DB_PASSWORD match your local MySQL credentials!\n-----------------\n');
    process.exit(1);
  }
}

module.exports = {
  initDB,
  getPool: () => pool
};
