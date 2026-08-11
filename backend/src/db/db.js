/* global process */
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

export async function initDbTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenders (
        id VARCHAR(100) PRIMARY KEY,
        tender_number VARCHAR(100) NOT NULL,
        item_title TEXT NOT NULL,
        division VARCHAR(200) DEFAULT 'Haldia Refinery Division',
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.warn('Tenders table initialization note:', err.message);
  }
}
