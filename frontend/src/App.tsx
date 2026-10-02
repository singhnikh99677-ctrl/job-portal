import { BrowserRouter, Link, Route, Routes, useNavigate } from 'react-router-dom';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, apiFetch } from './services/api';
import type { Role, User } from './types';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { JobsPage } from './pages/JobsPage';
import { JobDetailsPage } from './pages/JobDetailsPage';
import { ApplicantDashboardPage } from './pages/ApplicantDashboardPage';
import { RecruiterDashboardPage } from './pages/RecruiterDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { CreateJobPage } from './pages/CreateJobPage';
import { MyApplicationsPage } from './pages/MyApplicationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (payload: { name: string; email: string; password: string; role?: Role }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (nextUser: User) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? (JSON.parse(storedUser) as User) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const updateUser = useCallback((nextUser: User) => {
    setUser(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const me = await apiFetch<User>('/users/me');
      setUser(me);
      localStorage.setItem('user', JSON.stringify(me));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
      } else {
        console.error('Could not refresh the signed-in user profile:', error);
      }
    }
  }, [logout, token]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      void refreshUser();
    } else {
      localStorage.removeItem('token');
    }
  }, [refreshUser, token]);

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    const result = await apiFetch<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setToken(result.token);
    setUser(result.user);
    localStorage.setItem('token', result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
  }, []);

  const register = useCallback(async (payload: { name: string; email: string; password: string; role?: Role }) => {
    const result = await apiFetch<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setToken(result.token);
    setUser(result.user);
    localStorage.setItem('token', result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, token, login, register, logout, refreshUser, updateUser }), [login, logout, refreshUser, register, token, updateUser, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleLabel = user ? `${user.role[0]}${user.role.slice(1).toLowerCase()}` : 'Guest';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container nav-row">
          <Link to="/" className="brand">Job Portal</Link>
          <nav className="nav-links">
            <Link to="/jobs">Jobs</Link>
            <Link to="/dashboard/applicant">Applicant</Link>
            <Link to="/dashboard/recruiter">Recruiter</Link>
            <Link to="/dashboard/admin">Admin</Link>
            {user ? (
              <>
                <Link to="/applications">My applications</Link>
                <Link to="/profile">Profile</Link>
                <button className="mini-button" onClick={handleLogout}>Logout</button>
                <span className="user-pill">{roleLabel}</span>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="container page-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailsPage />} />
          <Route path="/dashboard/applicant" element={<ApplicantDashboardPage />} />
          <Route path="/dashboard/recruiter" element={<RecruiterDashboardPage />} />
          <Route path="/dashboard/admin" element={<AdminDashboardPage />} />
          <Route path="/jobs/new" element={<CreateJobPage />} />
          <Route path="/applications" element={<MyApplicationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
