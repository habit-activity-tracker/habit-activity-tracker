import { createApp } from './app.js';
import { loadConfig } from './config/env.js';

const config = loadConfig();
const port = config.port;
const host = config.host;

createApp().listen(port, host, () => {
  console.log(`API listening on ${host}:${port} (${config.appEnv})`);
});
