import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { loadConfig } from './config.js';
import { App } from './App.jsx';
import './styles.css';

// HashRouter keeps routes in the URL fragment, so any static host (Firebase Hosting,
// Catalyst Web Client Hosting, Nginx...) serves them without server-side rewrites.
const root = createRoot(document.getElementById('root'));
root.render(<main className="startup" role="status">Loading XploCode…</main>);
loadConfig().then((config) => root.render(<HashRouter><App config={config} /></HashRouter>)).catch((error) => {
  root.render(<main className="startup"><h1>Configuration needs attention</h1><p role="alert">{error.message}</p><button onClick={() => location.reload()}>Try again</button></main>);
});
