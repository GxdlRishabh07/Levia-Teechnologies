import { app } from './app.js';
import { env } from './config/env.js';
import { checkDbHealth } from './config/db.js';

async function startServer() {
  const db = await checkDbHealth();
  app.listen(env.PORT, () => {
    console.log(
      `🚀 FlowSpace API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`
    );
    console.log(
      `   DB: ${db.ok ? `connected (${db.latencyMs}ms)` : `ERROR (${db.error})`} | Groq AI: ${env.hasGroq ? 'configured' : 'fallback mode'} | Pusher: ${env.hasPusher ? 'configured' : 'no-op fallback'}`
    );
  });
}

startServer();
