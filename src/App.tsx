import React, { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import Cookies from 'js-cookie';
import { Layout } from './components/layout/Layout';
import AppErrorBoundary from './components/ui/AppErrorBoundary';

const LazyAppRouter = React.lazy(() => import('./routes/AppRouter'));

function App() {
  const { login, logout } = useAuthStore();

  useEffect(() => {
    // Verificar token al cargar la aplicación
    const token = Cookies.get('auth_token');
    const storedUser = localStorage.getItem('auth-storage');
    
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.state?.user && parsed.state?.token) {
          // El estado ya está restaurado por Zustand persist
         // console.log('Usuario autenticado restaurado');
        }
      } catch (error) {
        console.error('Error restaurando sesión:', error);
        logout();
      }
    } else if (!token) {
      logout();
    }
  }, [login, logout]);

  useEffect(() => {
    document.title = "Vuala CRM";
  }, []);

  return (
    <AppErrorBoundary>
      <Layout>
        <React.Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-base-200">
              <div className="rounded-2xl border border-base-300 bg-base-100 px-6 py-4 shadow">
                <span className="loading loading-spinner loading-md mr-2" />
                Cargando aplicacion...
              </div>
            </div>
          }
        >
          <LazyAppRouter />
        </React.Suspense>
      </Layout>
    </AppErrorBoundary>
  );
}

export default App;
