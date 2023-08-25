'use strict'

import { app, protocol, ipcMain, BrowserWindow } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import axios from 'axios'
const isDevelopment = process.env.NODE_ENV !== 'production'
const fs = require('fs');
const path = require('path');
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1080,
    height: 900,
    webPreferences: {

      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION
    }
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS3_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}


ipcMain.handle('saveUserData', (event, data, folder, filename) => {
  const savePath = path.join(app.getPath('userData'), folder + '/' + filename);
  try {
    fs.writeFileSync(savePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log("Save Data " + filename)
    return true;
  } catch (error) {
    console.error('Error saving JSON file:', error);
    return false;
  }
});
ipcMain.handle('saveImageUrl', async (event, folder, filename, imageUrl) => {
  const filePath = path.join(app.getPath('userData'), folder + '/' + filename);
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(filePath, response.data, 'binary');
    //event.sender.send('imagePath', filePath);
    return filePath
  } catch (error) {
    console.error('Error Saving Image:', error);
  }
});
ipcMain.handle('getLocalImagePath', (event, filename) => {
  const imagePath = path.join(app.getPath('userData'), filename);
  console.log(imagePath)
  return imagePath;
});
ipcMain.handle('retriveJsonFile', (event, filePath) => {
  try {
    const filePath1 = path.join(app.getPath('userData'), filePath);
    const fileData = fs.readFileSync(filePath1, 'utf-8');
    event.sender.send('jsonFileData', fileData);
  } catch (error) {
    console.error('Error reading file:', error);
    event.sender.send('jsonFileData', null);
  }
});
ipcMain.handle('saveOfflineAttendance', (event, data) => {
  let filePath = data.type + '/attendance-logs/'
  const currentDateTime = new Date();
  const formattedDate = currentDateTime.toISOString().slice(0, 10); // Format as "YYYY-MM-DD"
  const publicPath = filePath + formattedDate + '.json';
  const fileName = path.join(app.getPath('userData'), 'Offline Storage', publicPath);
  console.log(fileName)
  // Ensure the directory structure exists
  const dirName = path.dirname(fileName);
  if (!fs.existsSync(dirName)) {
    console.log('Not Existing')
    fs.mkdirSync(dirName, { recursive: true }); // Recursive option creates parent directories if they don't exist
  }
  try {
    let fileData = [];

    if (fs.existsSync(fileName)) {
      const existingData = fs.readFileSync(fileName, 'utf-8');
      fileData = JSON.parse(existingData);
      // eslint-disable-next-line no-unused-vars
      let findIndex = null
      console.log(data)
      // First the the Data
      fileData.forEach((element, index) => {
        if (element.email == data.email) {
          if (element.time_out == null) {
            findIndex = index
          }
        }
      });
      console.log(findIndex)
      if (findIndex != null) {
        fileData[findIndex].time_out = data.time_in
      } else {
        fileData.push(data)
      }
    }
    else {
      fileData.push(data)
    }
    fs.writeFileSync(fileName, JSON.stringify(fileData, null, 2), 'utf-8'); // Save the combined data
    console.log('Data appended and file updated.');
  } catch (error) {
    fs.writeFileSync(fileName, JSON.stringify(data, null, 2), 'utf-8');
    console.log(error);
    return 'File created and data written.'; // Return a success message
  }
});
ipcMain.handle('saveOfflineAttendanceInDay', (event, data, filePath) => {
  const fileName = path.join(app.getPath('userData'), filePath);
  console.log(fileName)
  // Ensure the directory structure exists
  const dirName = path.dirname(fileName);
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true }); // Recursive option creates parent directories if they don't exist
  }
  try {
    let fileData = [];

    if (fs.existsSync(fileName)) {
      const existingData = fs.readFileSync(fileName, 'utf-8');
      fileData = JSON.parse(existingData);
    }
    else {
      data.forEach(element => {
       
        fileData.push(element)
      });

    }
    fs.writeFileSync(fileName, JSON.stringify(fileData, null, 2), 'utf-8'); // Save the combined data
    console.log('Data appended and file updated.');
  } catch (error) {
    fs.writeFileSync(fileName, JSON.stringify(data, null, 2), 'utf-8');
    console.log(error);
    return 'File created and data written.'; // Return a success message
  }
});

ipcMain.on('create-or-check-folder', (event, folderName) => {
  const folderPath = path.join(app.getPath('userData'), folderName);
  if (!fs.existsSync(folderPath)) {
    try {
      fs.mkdirSync(folderPath);
      console.log('Folder created successfully.');
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  } else {
    return true
  }
});


