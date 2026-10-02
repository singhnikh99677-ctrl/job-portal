import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { apiFetch } from '../services/api';

export function CreateJobPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: 'Senior Product Manager',
    company: 'Northstar Labs',
    description: 'Own the roadmap for core talent workflows and deliver measurable platform outcomes.',
    requiredSkills: 'Product Strategy, Roadmapping, Analytics',
    location: 'Remote',
    employmentType: 'Full-time',
    category: 'Product',
    experience: '4+ years',
    openings: '2',
    salaryMin: '120000',
    salaryMax: '150000',
    applicationDeadline: '2026-12-31',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user || (user.role !== 'RECRUITER' && user.role !== 'ADMIN')) {
    return (
      <div className="card">
        <h2>Create job posting</h2>
        <p>Only recruiters and admins can publish jobs.</p>
      </div>
    );
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiFetch('/jobs', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          requiredSkills: form.requiredSkills.split(',').map((item) => item.trim()).filter(Boolean),
          openings: Number(form.openings),
          salaryMin: Number(form.salaryMin),
          salaryMax: Number(form.salaryMax),
          approved: true,
        }),
      });
      navigate('/dashboard/recruiter');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card auth-card" onSubmit={onSubmit}>
      <h2>Create job posting</h2>
      <div className="form-grid two-column">
        <input type="text" placeholder="Job title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <input type="text" placeholder="Company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} />
        <textarea rows={5} placeholder="Job description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <input type="text" placeholder="Required skills" value={form.requiredSkills} onChange={(event) => setForm({ ...form, requiredSkills: event.target.value })} />
        <input type="text" placeholder="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
        <input type="text" placeholder="Employment type" value={form.employmentType} onChange={(event) => setForm({ ...form, employmentType: event.target.value })} />
        <input type="text" placeholder="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
        <input type="text" placeholder="Experience" value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} />
        <input type="number" placeholder="Openings" value={form.openings} onChange={(event) => setForm({ ...form, openings: event.target.value })} />
        <input type="number" placeholder="Salary min" value={form.salaryMin} onChange={(event) => setForm({ ...form, salaryMin: event.target.value })} />
        <input type="number" placeholder="Salary max" value={form.salaryMax} onChange={(event) => setForm({ ...form, salaryMax: event.target.value })} />
        <input type="date" value={form.applicationDeadline} onChange={(event) => setForm({ ...form, applicationDeadline: event.target.value })} />
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button type="submit" disabled={loading}>{loading ? 'Publishing...' : 'Publish job'}</button>
    </form>
  );
}
