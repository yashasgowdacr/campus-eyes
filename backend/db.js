const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const crypto = require('crypto');

const isPostgres = Boolean(
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))
);

let pool;

async function initPostgres() {
  const { Pool } = require('pg');
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  // Wrapper providing mysql2-style [rows, fields] return signature
  pool = {
    async query(queryText, params = []) {
      let paramIndex = 1;
      let pgSql = queryText.replace(/\?/g, () => `$${paramIndex++}`);
      pgSql = pgSql.replace(/INTERVAL\s+(\d+)\s+([A-Za-z]+)/gi, "INTERVAL '$1 $2'");
      const res = await pgPool.query(pgSql, params);
      return [res.rows, res.fields];
    },
    async end() {
      return pgPool.end();
    }
  };

  // Test connection
  await pgPool.query('SELECT 1');

  // Initialize tables in PostgreSQL / Neon DB
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS complaints (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(50) DEFAULT 'Other',
      ai_priority VARCHAR(20) DEFAULT 'Low',
      status VARCHAR(20) DEFAULT 'open',
      image_data TEXT,
      registered_by VARCHAR(255) DEFAULT 'Anonymous',
      location_block VARCHAR(50),
      location_floor VARCHAR(50),
      location_room VARCHAR(50),
      assigned_to VARCHAR(255),
      sla_deadline TIMESTAMP,
      escalation_level INT DEFAULT 0,
      is_duplicate_of VARCHAR(36),
      admin_priority VARCHAR(20),
      sentiment VARCHAR(50),
      ai_reason TEXT,
      points_awarded BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comments (
      id VARCHAR(36) PRIMARY KEY,
      complaint_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id VARCHAR(36) PRIMARY KEY,
      complaint_id VARCHAR(36) NOT NULL,
      action VARCHAR(255) NOT NULL,
      performed_by VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_feedback (
      id VARCHAR(36) PRIMARY KEY,
      complaint_id VARCHAR(36) NOT NULL,
      original_priority VARCHAR(20),
      corrected_priority VARCHAR(20),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'student',
      points INT DEFAULT 0,
      profile_pic TEXT,
      usn VARCHAR(50),
      semester VARCHAR(20),
      email VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default users if they don't exist
  const adminCheck = await pgPool.query('SELECT id FROM users WHERE username = $1', ['admin']);
  if (adminCheck.rows.length === 0) {
    await pgPool.query(
      'INSERT INTO users (id, username, password, role) VALUES ($1, $2, $3, $4)',
      [crypto.randomUUID(), 'admin', 'admin', 'admin']
    );
  }

  const yashasCheck = await pgPool.query('SELECT id FROM users WHERE username = $1', ['yashas']);
  if (yashasCheck.rows.length === 0) {
    await pgPool.query(
      'INSERT INTO users (id, username, password, role) VALUES ($1, $2, $3, $4)',
      [crypto.randomUUID(), 'yashas', 'yashas', 'student']
    );
  }

  console.log('Neon PostgreSQL Database connected and tables initialized successfully');
  return pool;
}

async function initMySQL() {
  const mysql = require('mysql2/promise');
  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true
  };

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

  // Ensure columns exist on existing databases
  try { await pool.query('ALTER TABLE complaints ADD COLUMN image_data LONGTEXT'); } catch (e) {}
  try { await pool.query("ALTER TABLE complaints ADD COLUMN registered_by VARCHAR(255) DEFAULT 'Anonymous'"); } catch (e) {}
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'student',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

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
}

async function initDB() {
  try {
    if (isPostgres) {
      return await initPostgres();
    } else {
      return await initMySQL();
    }
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    if (!isPostgres) {
      console.log('\n--- IMPORTANT ---\nPlease ensure your MySQL is running or provide DATABASE_URL for Neon PostgreSQL in backend/.env!\n-----------------\n');
    }
    process.exit(1);
  }
}

module.exports = {
  initDB,
  getPool: () => pool
};
