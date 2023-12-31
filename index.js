const { app, BrowserWindow } = require('electron')
const path = require('path')
const url = require('url')

function createWindow () {
  let win = new BrowserWindow({
    width: 800,
    height: 600,
  })

	win.loadURL(url.format({
		pathname: path.join(__dirname + '/index.html'),
		protocol: 'file:',
		slashes: true
	}))

	win.on('closed', () => win = null)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
