/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

let pythonProcess = null;

function findPythonExecutable() {
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH;
  }

  const rootDir = process.cwd();
  const isWin = process.platform === 'win32';

  const candidates = isWin
    ? [
        path.join(rootDir, 'backend', 'venv', 'Scripts', 'python.exe'),
        path.join(rootDir, 'venv', 'Scripts', 'python.exe'),
      ]
    : [
        '/backend/venv/bin/python3', // AI Studio container environment
        path.join(rootDir, 'backend', 'venv', 'bin', 'python3'),
        path.join(rootDir, 'backend', 'venv', 'bin', 'python'),
        path.join(rootDir, 'venv', 'bin', 'python3'),
      ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback to system python binary
  return isWin ? 'python' : 'python3';
}

function startBackendPlugin() {
  return {
    name: 'start-python-backend',
    configureServer(server) {
      if (pythonProcess) return;

      const pythonExec = findPythonExecutable();
      const appPath = path.join(process.cwd(), 'backend', 'app.py');

      if (!fs.existsSync(appPath)) {
        return;
      }

      try {
        console.log(`[Vite Backend] Starting Python backend with: ${pythonExec}`);
        pythonProcess = spawn(pythonExec, [appPath], {
          stdio: 'inherit',
          env: { ...process.env, BACKEND_PORT: '5000' }
        });

        pythonProcess.on('error', (err) => {
          console.error(`[Vite Backend] Note: Could not auto-start Python backend (${err.message}).`);
          console.error(`[Vite Backend] You can start it manually in a separate terminal using: python backend/app.py`);
          pythonProcess = null;
        });

        pythonProcess.on('exit', () => {
          pythonProcess = null;
        });

        server.httpServer?.on('close', () => {
          if (pythonProcess) {
            pythonProcess.kill();
            pythonProcess = null;
          }
        });
      } catch (e) {
        console.error('[Vite Backend] Exception spawning Python backend:', e);
      }
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    startBackendPlugin()
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
