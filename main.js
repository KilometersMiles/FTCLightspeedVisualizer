const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const Store = require('electron-store').default;

const store = new Store();

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'build', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, 'build', 'index.html'));
  } else {
    win.loadURL('http://localhost:3000');
  }
}

ipcMain.handle('run-optimizer', async (event, payload) => {
  return new Promise((resolve, reject) => {
    const { waypoints = [], obstacles = [], attributes = [], boundary = {} } = payload || {};

    let pythonProcess;

    if (app.isPackaged) {
      const executableName = process.platform === 'win32' ? 'optim.exe' : 'optim';
      const executablePath = path.join(process.resourcesPath, 'backend', 'optim', executableName);
      pythonProcess = execFile(executablePath);
    } else {
      const venvPythonPath = process.platform === 'win32'
        ? path.join(__dirname, 'python', 'venv', 'Scripts', 'python.exe')
        : path.join(__dirname, 'python', 'venv', 'bin', 'python');
      const pythonCommand = process.env.PYTHON || (
        fs.existsSync(venvPythonPath)
          ? venvPythonPath
          : (process.platform === 'win32' ? 'python' : 'python3')
      );
      pythonProcess = spawn(pythonCommand, [path.join(__dirname, 'python', 'optim.py')]);
    }

    pythonProcess.stdin.write(JSON.stringify({ waypoints, obstacles, attributes, boundary }));
    pythonProcess.stdin.end();

    let result = '';
    let errorOutput = '';

    pythonProcess.on('error', (error) => {
      reject(new Error(
        `Unable to start optimizer (${error.code || error.message}). ` +
        (app.isPackaged
          ? 'The packaged optimizer executable is missing or could not be launched.'
          : `Make sure Python and the optimizer dependencies are installed, or set PYTHON to its executable path. Current command: ${process.env.PYTHON || 'the project virtual environment or python3'}.`)
      ));
    });

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`Python Stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(result));
        } catch (e) {
          reject(`Failed to parse Python output: ${result}`);
        }
      } else {
        reject(`Python exited with code ${code}. Error: ${errorOutput}`);
      }
    });
    pythonProcess.stderr.on('data', (data) => {
      console.error(`PYTHON ERROR: ${data.toString()}`);
    });
  });
});

ipcMain.on('store-set', (event, { key, value }) => {
  store.set(key, value);
});

ipcMain.handle('store-get', (event, key) => {
  return store.get(key);
});

app.whenReady().then(() => {
  createWindow()
})


