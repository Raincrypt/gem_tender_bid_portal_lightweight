CREATE DATABASE gem_portal_db;

\c gem_portal_db;

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