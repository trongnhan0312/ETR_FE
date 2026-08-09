import React, { useEffect, useState } from 'react';
import { submitContactForm } from '../../utils/api';

const ContactPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [inquiryType, setInquiryType] = useState('Technical Demo');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    document.title = "Contact Us & Schedule Technical Demo | ETR Aviation";
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    // Validation
    if (!name.trim()) {
      setFeedback({ type: 'error', text: 'Please enter your name.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setFeedback({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    if (!organization.trim()) {
      setFeedback({ type: 'error', text: 'Please enter your organization or airline name.' });
      return;
    }

    if (message.trim().length < 10) {
      setFeedback({ type: 'error', text: 'Message must be at least 10 characters long.' });
      return;
    }

    setLoading(true);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      organization: organization.trim(),
      inquiryType,
      message: message.trim()
    };

    const res = await submitContactForm(payload);
    setLoading(false);

    if (res && res.success !== false) {
      setFeedback({
        type: 'success',
        text: res.message || 'Thank you! Your message has been sent successfully. An ETR aviation specialist will respond shortly.'
      });
      setName('');
      setEmail('');
      setOrganization('');
      setMessage('');
    } else {
      setFeedback({
        type: 'error',
        text: res?.message || 'Server error occurred while submitting your message. Please try again later.'
      });
    }
  };

  return (
    <div className="public-page-container">
      {/* HERO */}
      <section className="page-hero">
        <div className="hero-content">
          <div className="trust-pill">
            <span className="dot">•</span> GET IN TOUCH WITH ETR AVIATION
          </div>
          <h1 className="hero-title">
            Talk to an aviation <span className="highlight-text">ETR specialist.</span>
          </h1>
          <p className="hero-subtitle">
            Whether you want a technical platform demonstration, custom API integration consultation, or Part 145/147 audit alignment advice — our experts are standing by.
          </p>
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section className="page-section">
        <div className="contact-grid-container">
          {/* CONTACT INFO CARDS */}
          <div className="contact-info-col">
            <h3>Enterprise Support & Enquiries</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '24px' }}>
              Connect with our team to explore deployment options, pilot programs for maintenance bases, or technical support.
            </p>

            <div className="info-item-card">
              <span className="info-icon">📍</span>
              <div>
                <strong>Global Headquarters</strong>
                <p>Aviation Tech Hub, Hanoi & Ho Chi Minh City, Vietnam</p>
              </div>
            </div>

            <div className="info-item-card">
              <span className="info-icon">📧</span>
              <div>
                <strong>Email Enquiries</strong>
                <p>contact@etraviation.com • support@etraviation.com</p>
              </div>
            </div>

            <div className="info-item-card">
              <span className="info-icon">📞</span>
              <div>
                <strong>Technical Support Line</strong>
                <p>+84 24 3948 1000 (Mon-Fri 08:00 - 18:00 ICT)</p>
              </div>
            </div>

            <div className="info-item-card">
              <span className="info-icon">🛡️</span>
              <div>
                <strong>Security & Audits</strong>
                <p>security@etraviation.com</p>
              </div>
            </div>
          </div>

          {/* CONTACT FORM */}
          <div className="contact-form-col">
            <div className="widget-card">
              <h3 style={{ color: '#ffffff', marginBottom: '16px', fontSize: '1.25rem', fontWeight: '700' }}>Send Us a Message</h3>

              {feedback && (
                <div className={`alert-box ${feedback.type}`}>
                  {feedback.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="public-form">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    className="public-input"
                    placeholder="e.g. Capt. Robert Thorne"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Work Email *</label>
                  <input
                    type="email"
                    className="public-input"
                    placeholder="e.g. r.thorne@airways.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Organization / MRO / Airline *</label>
                  <input
                    type="text"
                    className="public-input"
                    placeholder="e.g. Pacific Maintenance Repair Org"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Inquiry Type</label>
                  <select
                    className="public-select"
                    value={inquiryType}
                    onChange={(e) => setInquiryType(e.target.value)}
                  >
                    <option value="Technical Demo">Request Technical Product Demo</option>
                    <option value="Part 145/147 Compliance">Part 145 / 147 Compliance Consultation</option>
                    <option value="API Integration">API & System Integration</option>
                    <option value="Enterprise Pricing">Enterprise & Fleet Pricing</option>
                    <option value="Other Inquiry">General Inquiry</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Message * (min 10 characters)</label>
                  <textarea
                    className="public-textarea"
                    rows={5}
                    placeholder="Tell us about your organization's training record requirements or current challenges..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  ></textarea>
                </div>

                <button type="submit" className="btn-secondary-hero" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                  {loading ? 'Sending Message...' : 'Submit Inquiry &rarr;'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
