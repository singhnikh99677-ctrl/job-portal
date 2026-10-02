import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../App';
import { apiFetch } from '../services/api';
import type { Job, User } from '../types';

export function AdminDashboardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      return;
    }

    const loadData = async () => {
      try {
        const [userList, jobList] = await Promise.all([
          apiFetch<User[]>('/users'),
          apiFetch<Job[]>('/jobs'),
        ]);
        setUsers(userList);
        setJobs(jobList);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load administrator data');
      }
    };

    void loadData();
  }, [user]);

  const stats = useMemo(() => ({
    users: users.length,
    jobs: jobs.length,
    pending: jobs.filter((job) => !job.approved).length,
  }), [jobs, users]);

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="card">
        <h2>Admin dashboard</h2>
        {error ? <p className="error-text">{error}</p> : null}
        <p>Administrator privileges required.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Admin dashboard</h2>
      <div className="grid">
        <div className="stat"><h3>{stats.users}</h3><p>Users</p></div>
        <div className="stat"><h3>{stats.jobs}</h3><p>Jobs</p></div>
        <div className="stat"><h3>{stats.pending}</h3><p>Pending approvals</p></div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>User roster</h3>
        <ul className="stack-list">
          {users.map((person) => (
            <li key={person.id}>
              <strong>{person.name}</strong> ? {person.role} <span className="badge">{person.isActive ? 'Active' : 'Disabled'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
