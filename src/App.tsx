import  { useEffect } from 'react';
import AppRouter from './routes/AppRouter';
import { useAuthStore } from './stores/authStore';
import Cookies from 'js-cookie';
import { Layout } from './components/layout/Layout';

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
    document.title = "WOW Assistance";
  }, []);

  return <Layout><AppRouter /></Layout>;
}

export default App;