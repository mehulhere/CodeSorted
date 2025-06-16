import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getAuthStatus, logout } from './api';
import { useNotification } from '@/components/ui/notification';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  isAdmin: boolean;
}

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const { showNotification } = useNotification();

  const checkAuthStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAuthStatus();
      if (response.isLoggedIn && response.user) {
        setIsLoggedIn(true);
        setUser(response.user);
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsLoggedIn(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setIsLoggedIn(false);
      setUser(null);
      
      showNotification({
        message: 'Successfully logged out',
        type: 'success',
        duration: 2000,
      });
      
      router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      
      showNotification({
        message: 'Logout failed, but session has been cleared',
        type: 'warning',
        duration: 3000,
      });
      
      // Still update state on error
      setIsLoggedIn(false);
      setUser(null);
    }
  }, [router, showNotification]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Refresh auth status when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      checkAuthStatus();
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, checkAuthStatus]);

  return {
    isLoggedIn,
    user,
    loading,
    logout: handleLogout,
    checkAuthStatus
  };
}; 