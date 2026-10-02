export function HomePage() {
  return (
    <section className="hero">
      <div>
        <p className="badge">Hiring made simpler</p>
        <h1>Find the right jobs or great candidates faster.</h1>
        <p>
          Job Portal helps employers publish roles, review applications, and manage hiring pipelines
          while giving applicants a clean search and application experience.
        </p>
        <div className="cta-row">
          <a href="/jobs" className="button">Browse jobs</a>
          <a href="/register" className="button secondary">Create account</a>
        </div>
      </div>

      <div className="card panel-card">
        <div className="stat">
          <h3>Platform stats</h3>
          <p>3,245 jobs posted</p>
          <p>1,120 recruiters</p>
          <p>24k candidate applications</p>
        </div>
      </div>
    </section>
  );
}
