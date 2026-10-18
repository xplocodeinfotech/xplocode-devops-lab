import React from 'react';
import { createRoot } from 'react-dom/client';
import { loadConfig } from './config.js';
import { App } from './App.jsx';
import './styles.css';

const root = createRoot(document.getElementById('root'));
root.render(<main className="startup" role="status">Loading XploCode…</main>);
loadConfig().then((config) => root.render(<App config={config} />)).catch((error) => {
  root.render(<main className="startup"><h1>Configuration needs attention</h1><p role="alert">{error.message}</p><button onClick={() => location.reload()}>Try again</button></main>);
});
