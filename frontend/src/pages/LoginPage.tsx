import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'applicant@jobportal.local', password: 'Applicant@123' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(form);
      navigate('/dashboard/applicant');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card auth-card" onSubmit={onSubmit}>
      <h2>Login</h2>
      <div className="form-grid">
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
      </div>
    </form>
  );
}
