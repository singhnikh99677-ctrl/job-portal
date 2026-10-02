import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { apiFetch } from '../services/api';
import type { Job } from '../types';

export function RecruiterDashboardPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || (user.role !== 'RECRUITER' && user.role !== 'ADMIN')) {
      return;
    }

    const loadJobs = async () => {
      try {
        const data = await apiFetch<Job[]>('/jobs');
        setJobs(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load jobs');
      }
    };

    void loadJobs();
  }, [user]);

  const stats = useMemo(() => ({
    total: jobs.length,
    approved: jobs.filter((job) => job.approved).length,
    pending: jobs.filter((job) => !job.approved).length,
  }), [jobs]);

  if (!user || (user.role !== 'RECRUITER' && user.role !== 'ADMIN')) {
    return (
      <div className="card">
        <h2>Recruiter dashboard</h2>
        <p>Recruiter access required.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Recruiter dashboard</h2>
      <div className="grid">
        <div className="stat"><h3>{stats.total}</h3><p>Jobs</p></div>
        <div className="stat"><h3>{stats.approved}</h3><p>Approved</p></div>
        <div className="stat"><h3>{stats.pending}</h3><p>Pending</p></div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="section-head">
          <h3>Active postings</h3>
          <Link to="/jobs/new" className="button secondary">Create job</Link>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        {!error && jobs.length === 0 ? <p>No jobs yet.</p> : null}
        {jobs.length > 0 ? (
          <ul className="stack-list">
            {jobs.map((job) => (
              <li key={job.id}>
                <strong>{job.title}</strong> ? {job.company}
                <span className="badge">{job.approved ? 'Approved' : 'Pending'}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
