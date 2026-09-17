import { app } from 'electron';

const ready = app.whenReady();

ready.then(() => {
  app.on('activate', () => undefined);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
