import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import type { Job } from '../types';

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const data = await apiFetch<Job[]>('/jobs');
        setJobs(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load jobs');
      } finally {
        setLoading(false);
      }
    };

    void loadJobs();
  }, []);

  return (
    <div>
      <h2>Open jobs</h2>
      {loading ? <p>Loading jobs...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {!loading && !error && jobs.length === 0 ? <p>No jobs are available right now.</p> : null}
      <div className="grid">
        {jobs.map((job) => (
          <div key={job.id} className="card job-card">
            <span className="badge">{job.category}</span>
            <h3>{job.title}</h3>
            <p><strong>{job.company}</strong></p>
            <p>{job.location} ? {job.employmentType}</p>
            <p>{job.description}</p>
            <Link to={`/jobs/${job.id}`} className="button secondary">View details</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
