import { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { apiFetch } from '../services/api';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '' });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, email: user.email });
    }
  }, [user]);

  if (!user) {
    return <div className="card"><h2>Profile</h2><p>Please login to manage your profile.</p></div>;
  }

  const saveProfile = async () => {
    setError('');
    setSaved(false);
    try {
      const updated = await apiFetch<typeof user>(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      if (updated) {
        updateUser(updated);
        setSaved(true);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save profile');
    }
  };

  return (
    <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
      <h2>Profile</h2>
      <div className="form-grid">
        <input type="text" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
        <input type="text" value={user.role} readOnly />
        <button onClick={saveProfile}>Save profile</button>
        {error ? <p className="error-text">{error}</p> : null}
        {saved ? <p>Profile saved.</p> : null}
      </div>
    </div>
  );
}
