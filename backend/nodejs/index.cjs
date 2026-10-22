'use strict';
// Zoho Catalyst Advanced I/O function entry point. Catalyst loads this file and exports the Express app as the handler
// (module.exports = app), without calling listen(). It reuses the same app as src/server.js (local and Cloud Run).
// The project is "type": "module", so this CommonJS file loads the app with import(). A function has no startup phase,
// so the database check that server.js runs at startup happens on the first request instead and is remembered.
let ready;

function getApp() {
  if (!ready) {
    ready = (async () => {
      const [{ createApp }, { getConfig }] = await Promise.all([import('./src/app.js'), import('./src/config/index.js')]);
      const app = createApp(getConfig());
      await app.locals.repository.check();
      console.log(`Database connected: ${app.locals.repository.label}.`);
      return app;
    })();
    ready.catch(() => { ready = undefined; }); // a failed check is tried again on the next request
  }
  return ready;
}

module.exports = async (req, res) => {
  try {
    (await getApp())(req, res);
  } catch (error) {
    const reason = String(error?.message ?? error).split('\n')[0].slice(0, 300); // one-line explanation, same as the startup message of server.js
    console.error(reason);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    // The reason is returned too, because Catalyst function logs are easy to miss. It only names settings, tables and hosts, never secrets.
    res.end(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: `The API could not start: ${reason}` } }));
  }
};
