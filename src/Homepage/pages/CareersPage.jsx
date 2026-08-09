import React, { useEffect, useState } from 'react';
import { fetchPublicCareersJobs, submitCareerApplication } from '../../utils/api';

const CareersPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState(null);

  useEffect(() => {
    document.title = "Careers & Open Positions | ETR Aviation";
    let isMounted = true;
    fetchPublicCareersJobs()
      .then(res => {
        if (isMounted) {
          setJobs(res);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Failed to load jobs", err);
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const handleOpenApply = (job) => {
    setSelectedJob(job);
    setSubmitFeedback(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedJob(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setCoverNote('');
    setSubmitFeedback(null);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!fullName || !email) {
      setSubmitFeedback({ type: 'error', text: 'Please fill in required fields (Name & Email).' });
      return;
    }

    setSubmitting(true);
    setSubmitFeedback(null);

    const payload = {
      jobId: selectedJob?.id,
      jobTitle: selectedJob?.title,
      applicantName: fullName,
      applicantEmail: email,
      phone,
      coverNote
    };

    const res = await submitCareerApplication(payload);
    setSubmitting(false);

    if (res && res.success !== false) {
      setSubmitFeedback({ type: 'success', text: res.message || 'Application submitted successfully!' });
      setTimeout(() => {
        handleCloseModal();
      }, 2500);
    } else {
      setSubmitFeedback({ type: 'error', text: res?.message || 'Failed to submit application. Please try again.' });
    }
  };

  const filteredJobs = jobs.filter(j => 
    j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="public-page-container">
      {/* HERO */}
      <section className="page-hero">
        <div className="hero-content">
          <div className="trust-pill">
            <span className="dot">•</span> JOIN THE ETR TEAM
          </div>
          <h1 className="hero-title">
            Build the future of <span className="highlight-text">aviation safety & compliance.</span>
          </h1>
          <p className="hero-subtitle">
            We are looking for passionate aviation domain experts, cloud engineers, quality auditors, and customer success leaders to transform electronic training record technology.
          </p>
        </div>
      </section>

      {/* JOB LISTING SECTION */}
      <section className="page-section">
        <div className="section-head">
          <span className="sub-tag">— OPEN POSITIONS</span>
          <h2 className="section-title">Explore current opportunities.</h2>
        </div>

        {/* SEARCH BAR */}
        <div className="search-filter-bar">
          <input
            type="text"
            className="public-input"
            placeholder="Search by job title, department, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>Loading open positions...</div>
        ) : filteredJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>No matching positions found.</div>
        ) : (
          <div className="job-listings-grid">
            {filteredJobs.map((job) => (
              <div key={job.id} className="job-card">
                <div className="job-header">
                  <div>
                    <span className="badge-tag-category">{job.department}</span>
                    <h3 className="job-title">{job.title}</h3>
                  </div>
                  <span className="badge-type">{job.type}</span>
                </div>

                <div className="job-meta-row">
                  <span>📍 {job.location}</span>
                  <span>⏱️ {job.experience}</span>
                </div>

                <p className="job-desc">{job.description}</p>

                <div className="job-reqs">
                  <strong>Requirements:</strong>
                  <ul>
                    {job.requirements?.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <button type="button" className="btn-secondary-hero" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => handleOpenApply(job)}>
                    Apply Now &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* APPLICATION MODAL */}
      {showModal && selectedJob && (
        <div className="public-modal-backdrop" onClick={handleCloseModal}>
          <div className="public-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Apply for: {selectedJob.title}</h3>
              <button type="button" className="close-btn" onClick={handleCloseModal}>✕</button>
            </div>

            {submitFeedback && (
              <div className={`alert-box ${submitFeedback.type}`}>
                {submitFeedback.text}
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="public-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  className="public-input"
                  required
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  className="public-input"
                  required
                  placeholder="e.g. john.doe@airline.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  className="public-input"
                  placeholder="+84 90 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Cover Note / Relevant Aviation Experience</label>
                <textarea
                  className="public-textarea"
                  rows={4}
                  placeholder="Briefly introduce your qualifications, licenses (FAA/EASA), or engineering background..."
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                ></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareersPage;
