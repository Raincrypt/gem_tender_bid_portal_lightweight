import os
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_PORT = os.getenv("DB_PORT", "5432")

_use_pg = False
if DB_USER and DB_HOST and DB_NAME:
    _use_pg = True

def get_db_connection():
    if _use_pg:
        try:
            conn = psycopg2.connect(
                user=DB_USER,
                host=DB_HOST,
                database=DB_NAME,
                password=DB_PASSWORD,
                port=DB_PORT,
                cursor_factory=RealDictCursor
            )
            return conn, "pg"
        except Exception as e:
            print(f"[DB Warning] PostgreSQL connection failed: {e}. Falling back to SQLite.")

    # SQLite Fallback
    db_path = os.path.join(os.path.dirname(__file__), "database.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn, "sqlite"

def init_db():
    conn, db_type = get_db_connection()
    try:
        cursor = conn.cursor()
        if db_type == "pg":
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS extracted_bids (
                    id VARCHAR(100) PRIMARY KEY,
                    vendor_folder VARCHAR(255),
                    wo_number VARCHAR(255) NOT NULL,
                    wo_value VARCHAR(255),
                    date_str VARCHAR(100),
                    date_verified VARCHAR(10),
                    ministry TEXT,
                    ministry_verified VARCHAR(10),
                    completion_certificate VARCHAR(10) DEFAULT 'No',
                    recommendation VARCHAR(10) DEFAULT 'No',
                    file_name VARCHAR(255),
                    page_index INT DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tenders (
                    id VARCHAR(100) PRIMARY KEY,
                    tender_number VARCHAR(100) NOT NULL,
                    item_title TEXT NOT NULL,
                    division VARCHAR(200) DEFAULT 'Haldia Refinery Division',
                    status VARCHAR(50) DEFAULT 'Active',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """)
        else:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS extracted_bids (
                    id TEXT PRIMARY KEY,
                    vendor_folder TEXT,
                    wo_number TEXT NOT NULL,
                    wo_value TEXT,
                    date_str TEXT,
                    date_verified TEXT,
                    ministry TEXT,
                    ministry_verified TEXT,
                    completion_certificate TEXT DEFAULT 'No',
                    recommendation TEXT DEFAULT 'No',
                    file_name TEXT,
                    page_index INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tenders (
                    id TEXT PRIMARY KEY,
                    tender_number TEXT NOT NULL,
                    item_title TEXT NOT NULL,
                    division TEXT DEFAULT 'Haldia Refinery Division',
                    status TEXT DEFAULT 'Active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
        conn.commit()
    except Exception as e:
        print(f"[DB Init Error] {e}")
    finally:
        conn.close()
