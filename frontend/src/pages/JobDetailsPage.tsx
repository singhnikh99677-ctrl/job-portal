import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../App';
import { apiFetch } from '../services/api';
import type { Job } from '../types';

export function JobDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadJob = async () => {
      if (!id) {
        return;
      }

      try {
        const data = await apiFetch<Job>(`/jobs/${id}`);
        setJob(data);
      } catch (loadError) {
        setNotice(loadError instanceof Error ? loadError.message : 'Unable to load this job right now.');
      } finally {
        setLoading(false);
      }
    };

    void loadJob();
  }, [id]);

  const applyNow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!job || !id) {
      return;
    }

    const formData = new FormData();
    formData.append('jobId', String(job.id));
    if (coverLetter) {
      formData.append('coverLetter', coverLetter);
    }
    if (resumeFile) {
      formData.append('resume', resumeFile);
    }

    try {
      await apiFetch('/applications', { method: 'POST', body: formData });
      setNotice('Application submitted successfully.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to submit application');
    }
  };

  if (loading) {
    return <div className="card"><p>Loading job details...</p></div>;
  }

  if (!job) {
    return <div className="card"><h2>Job not found</h2><p>{notice || 'The selected role is unavailable.'}</p></div>;
  }

  return (
    <div className="card detail-card">
      <h2>{job.title}</h2>
      <p><strong>Company:</strong> {job.company}</p>
      <p><strong>Location:</strong> {job.location}</p>
      <p><strong>Employment:</strong> {job.employmentType}</p>
      <p><strong>Category:</strong> {job.category}</p>
      <p>{job.description}</p>

      <div className="form-grid">
        <textarea
          rows={5}
          placeholder="Write a short cover letter (optional)"
          value={coverLetter}
          onChange={(event) => setCoverLetter(event.target.value)}
        />
        <input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setResumeFile(event.target.files?.[0] || null)} />
        <button onClick={applyNow}>Apply now</button>
        {notice ? <p className="info-text">{notice}</p> : null}
      </div>
    </div>
  );
}
