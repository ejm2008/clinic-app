import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

(window as unknown as { __API_URL__?: string }).__API_URL__ =
  import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
