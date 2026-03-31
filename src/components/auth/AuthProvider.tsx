import React, { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useAuth } from '../../hooks/useAuth';
import Cookies from 'js-cookie';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const { refetchProfile } = useAuth();

  useEffect(() => {
    const token = Cookies.get('auth_token');
    
    // If there's a token but user is not authenticated, try to fetch profile
    if (token && !isAuthenticated) {
      refetchProfile();
    }
  }, [isAuthenticated, refetchProfile]);

  return <>{children}</>;
};

export default AuthProvider;