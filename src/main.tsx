// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { usePageStore } from './stores/usePageStore';
import { getDomainConfig } from './config/domainConfig';
import './index.css' ;

const hostname = window.location.hostname;
const { page, countryId } = getDomainConfig(hostname);

usePageStore.getState().setPage(page);
usePageStore.getState().setCountryId(countryId);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
