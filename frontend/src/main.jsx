import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MarketProvider } from './context/MarketContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MarketProvider>
      <App />
    </MarketProvider>
  </React.StrictMode>
);
