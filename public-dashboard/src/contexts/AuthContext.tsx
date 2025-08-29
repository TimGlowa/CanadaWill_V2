import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'viewer' | 'editor' | 'admin';
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock authentication - replace with actual API calls
  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock authentication logic
      if (email === 'admin@canadawill.com' && password === 'admin123') {
        const mockUser: User = {
          id: '1',
          email: 'admin@canadawill.com',
          name: 'Admin User',
          role: 'admin',
          permissions: [
            'quotes.read',
            'quotes.write',
            'quotes.delete',
            'audit.read',
            'users.read',
            'users.write',
            'settings.read',
            'settings.write',
          ],
        };
        
        setUser(mockUser);
        
        // Store in localStorage for persistence
        localStorage.setItem('auth_user', JSON.stringify(mockUser));
        localStorage.setItem('auth_token', 'mock_jwt_token_' + Date.now());
        
      } else if (email === 'editor@canadawill.com' && password === 'editor123') {
        const mockUser: User = {
          id: '2',
          email: 'editor@canadawill.com',
          name: 'Editor User',
          role: 'editor',
          permissions: [
            'quotes.read',
            'quotes.write',
            'audit.read',
          ],
        };
        
        setUser(mockUser);
        localStorage.setItem('auth_user', JSON.stringify(mockUser));
        localStorage.setItem('auth_token', 'mock_jwt_token_' + Date.now());
        
      } else {
        throw new Error('Invalid email or password');
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions.includes(permission) || false;
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const storedUser = localStorage.getItem('auth_user');
        const storedToken = localStorage.getItem('auth_token');
        
        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser);
          
          // In a real app, you'd validate the token with your API
          // For now, we'll just check if it exists and isn't expired
          const tokenTimestamp = parseInt(storedToken.split('_').pop() || '0');
          const oneHourAgo = Date.now() - (60 * 60 * 1000);
          
          if (tokenTimestamp > oneHourAgo) {
            setUser(parsedUser);
          } else {
            // Token expired, clear storage
            localStorage.removeItem('auth_user');
            localStorage.removeItem('auth_token');
          }
        }
      } catch (error) {
        // Error checking auth status, clear storage
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 