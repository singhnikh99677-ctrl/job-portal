import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../App';
import { apiFetch } from '../services/api';

type ApplicationItem = {
  id: number;
  status: string;
  coverLetter?: string;
  job?: { title: string; company: string };
};

export function ApplicantDashboardPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadApplications = async () => {
      try {
        const data = await apiFetch<ApplicationItem[]>('/applications');
        setApplications(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load applications');
      }
    };

    void loadApplications();
  }, [user]);

  const stats = useMemo(() => ({
    total: applications.length,
    shortlisted: applications.filter((item) => item.status === 'SHORTLISTED').length,
    interview: applications.filter((item) => item.status === 'INTERVIEW').length,
  }), [applications]);

  if (!user) {
    return (
      <div className="card">
        <h2>Applicant dashboard</h2>
        <p>Please log in to view your applications and opportunities.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Applicant dashboard</h2>
      <div className="grid">
        <div className="stat"><h3>{stats.total}</h3><p>Applications</p></div>
        <div className="stat"><h3>{stats.shortlisted}</h3><p>Shortlisted</p></div>
        <div className="stat"><h3>{stats.interview}</h3><p>Interviews</p></div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Recent activity</h3>
        {error ? <p className="error-text">{error}</p> : null}
        {!error && applications.length === 0 ? <p>No applications yet.</p> : null}
        {applications.length > 0 ? (
          <ul className="stack-list">
            {applications.map((item) => (
              <li key={item.id}>
                <strong>{item.job?.title || 'Role'}</strong> ? {item.job?.company || 'Company'}
                <span className="badge">{item.status}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
