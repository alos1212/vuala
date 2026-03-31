import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import GlobalLoader from '../ui/GlobalLoader';

const MainLayout: React.FC = () => {
  const [loadingCount, setLoadingCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const handleStart = () => setLoadingCount((count) => count + 1);
    const handleEnd = () => setLoadingCount((count) => Math.max(0, count - 1));

    window.addEventListener('loader:start', handleStart);
    window.addEventListener('loader:end', handleEnd);

    return () => {
      window.removeEventListener('loader:start', handleStart);
      window.removeEventListener('loader:end', handleEnd);
    };
  }, []);

  useEffect(() => {
    let completed = false;
    setLoadingCount((count) => count + 1);
    const timer = window.setTimeout(() => {
      completed = true;
      setLoadingCount((count) => Math.max(0, count - 1));
    }, 400);
    return () => {
      if (!completed) {
        setLoadingCount((count) => Math.max(0, count - 1));
      }
      window.clearTimeout(timer);
    };
  }, [location.pathname, location.search]);

  return (
    <div className="app-shell">
      <div className="app-body app-body--with-sidebar">
        <aside className="app-sidebar">
          <Sidebar />
        </aside>
        <main className="app-main">
          <div className="app-content">
            <Outlet />
          </div>
        </main>
      </div>
      {loadingCount > 0 && <GlobalLoader message="Procesando..." />}
    </div>
  );
};

export default MainLayout;
