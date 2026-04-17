import { useAuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useAuthContext();
  return { user, isAuthenticated, isLoading, login, logout };
};
