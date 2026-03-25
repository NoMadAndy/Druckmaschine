import { useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const { user, token, isAuthenticated, setAuth, clearAuth, setLoading, isLoading, error, setError } =
    useAuthStore();
  const navigate = useNavigate();

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.login(username, password);
        setAuth(data.user, data.access_token);
        navigate('/');
      } catch (err: unknown) {
        const message = (err as { message?: string })?.message || 'Login failed';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setAuth, setLoading, setError, navigate]
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.register(username, email, password);
        setAuth(data.user, data.access_token);
        navigate('/');
      } catch (err: unknown) {
        const message = (err as { message?: string })?.message || 'Registration failed';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setAuth, setLoading, setError, navigate]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      clearAuth();
      navigate('/login');
    }
  }, [clearAuth, navigate]);

  const fetchUser = useCallback(async () => {
    if (!token) return;
    try {
      const user = await api.getCurrentUser();
      setAuth(user, token);
    } catch {
      clearAuth();
    }
  }, [token, setAuth, clearAuth]);

  return { user, token, isAuthenticated, isLoading, error, login, register, logout, fetchUser };
}
