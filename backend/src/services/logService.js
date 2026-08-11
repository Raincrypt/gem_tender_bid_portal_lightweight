import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  LOG_DIR_NAME,
  SERVER_LOG_FILE,
  CLIENT_LOG_FILE,
  EXTRACTED_TEXT_LOG_FILE,
} from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const LOG_DIR = path.resolve(__dirname, '..', '..', LOG_DIR_NAME);

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function logToFile(filename, message, data = null) {
  const timestamp = new Date().toISOString();
  let logEntry = `[${timestamp}] ${message}`;
  if (data) {
    logEntry += `\n${JSON.stringify(data, null, 2)}`;
  }
  logEntry += '\n';
  const filePath = path.join(LOG_DIR, filename);
  fs.appendFile(filePath, logEntry, (err) => {
    if (err) console.error('Log write failed:', err);
  });
}

export function logServer(message, data = null) {
  logToFile(SERVER_LOG_FILE, message, data);
}

export function logClient(level, message, data = null) {
  const logMessage = `[CLIENT ${level}] ${message}`;
  logToFile(CLIENT_LOG_FILE, logMessage, data);
}

export function logExtractedText(fileName, pages, vendorDisplay) {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString();
    let logEntry = `\n--- ${timestamp} ---\nFILE: ${fileName}\n`;
    if (vendorDisplay) {
      logEntry += `VENDOR: ${vendorDisplay}\n`;
    }
    pages.forEach((page) => {
      logEntry += `\n--- PAGE ${page.pageIndex} ---\n${page.text}\n`;
    });
    logEntry += '\n';
    const filePath = path.join(LOG_DIR, EXTRACTED_TEXT_LOG_FILE);
    fs.appendFile(filePath, logEntry, (err) => {
      if (err) {
        console.error('Failed to log extracted text:', err);
        return reject(err);
      }
      resolve();
    });
  });
}

export function clearExtractedTextLog() {
  return new Promise((resolve, reject) => {
    const filePath = path.join(LOG_DIR, EXTRACTED_TEXT_LOG_FILE);
    fs.truncate(filePath, 0, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Failed to clear extracted text log:', err);
        return reject(err);
      }
      if (err && err.code === 'ENOENT') {
        fs.writeFile(filePath, '', (writeErr) => {
          if (writeErr) {
            console.error('Failed to create empty log file:', writeErr);
            return reject(writeErr);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}
