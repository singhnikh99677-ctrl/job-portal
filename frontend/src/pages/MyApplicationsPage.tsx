import { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { apiFetch } from '../services/api';

type ApplicationItem = {
  id: number;
  status: string;
  job?: { title: string; company: string };
};

export function MyApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadData = async () => {
      try {
        const data = await apiFetch<ApplicationItem[]>('/applications');
        setApplications(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load applications');
      }
    };

    void loadData();
  }, [user]);

  if (!user) {
    return <div className="card"><h2>My applications</h2><p>Please login to view your applications.</p></div>;
  }

  return (
    <div>
      <h2>My applications</h2>
      <div className="card">
        {error ? <p className="error-text">{error}</p> : null}
        {!error && applications.length === 0 ? <p>No applications yet.</p> : null}
        {applications.length > 0 ? (
          <ul className="stack-list">
            {applications.map((application) => (
              <li key={application.id}>
                <strong>{application.job?.title || 'Role title'}</strong> ? {application.job?.company || 'Company'}
                <span className="badge">{application.status}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
