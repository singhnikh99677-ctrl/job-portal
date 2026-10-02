import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'APPLICANT' as 'RECRUITER' | 'APPLICANT',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(form);
      navigate('/jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card auth-card" onSubmit={onSubmit}>
      <h2>Create account</h2>
      <div className="form-grid">
        <input
          type="text"
          placeholder="Full name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
        />
        <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as 'RECRUITER' | 'APPLICANT' }))}>
          <option value="APPLICANT">Applicant</option>
          <option value="RECRUITER">Recruiter</option>
        </select>
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
      </div>
    </form>
  );
}
