import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { submitContactForm } from '../../utils/api';

const ContactPage = () => {
  const { tr } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [inquiryType, setInquiryType] = useState('Technical Demo');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    document.title = `${tr('Contact Us & Schedule Technical Demo')} | ETR Aviation`;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    // Validation
    if (!name.trim()) {
      setFeedback({ type: 'error', text: tr('Please enter your name.') });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setFeedback({ type: 'error', text: tr('Please enter a valid email address.') });
      return;
    }

    if (!organization.trim()) {
      setFeedback({ type: 'error', text: tr('Please enter your organization or airline name.') });
      return;
    }

    if (message.trim().length < 10) {
      setFeedback({ type: 'error', text: tr('Message must be at least 10 characters long.') });
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
        text: res.message || tr('Thank you! Your message has been sent successfully. An ETR aviation specialist will respond shortly.')
      });
      setName('');
      setEmail('');
      setOrganization('');
      setMessage('');
    } else {
      setFeedback({
        type: 'error',
        text: res?.message || tr('Server error occurred while submitting your message. Please try again later.')
      });
    }
  };

  return (
    <div className="public-page-container">
      {/* HERO */}
      <section className="page-hero">
        <div className="hero-content">
          <div className="trust-pill">
            <span className="dot">•</span> {tr('GET IN TOUCH WITH ETR AVIATION')}
          </div>
          <h1 className="hero-title">
            {tr('Talk to an aviation')} <span className="highlight-text">{tr('ETR specialist.')}</span>
          </h1>
          <p className="hero-subtitle">
            {tr('Whether you want a technical platform demonstration, custom API integration consultation, or Part 145/147 audit alignment advice — our experts are standing by.')}
          </p>
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section className="page-section">
        <div className="contact-grid-container">
          {/* CONTACT INFO CARDS */}
          <div className="contact-info-col">
            <h3>{tr('Enterprise Support & Enquiries')}</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '24px' }}>
              {tr('Connect with our team to explore deployment options, pilot programs for maintenance bases, or technical support.')}
            </p>

            <div className="info-item-card">
              <span className="info-icon">📍</span>
              <div>
                <strong>{tr('Global Headquarters')}</strong>
                <p>{tr('Aviation Tech Hub, Hanoi & Ho Chi Minh City, Vietnam')}</p>
              </div>
            </div>

            <div className="info-item-card">
              <span className="info-icon">📧</span>
              <div>
                <strong>{tr('Email Enquiries')}</strong>
                <p>contact@etraviation.com • support@etraviation.com</p>
              </div>
            </div>

            <div className="info-item-card">
              <span className="info-icon">📞</span>
              <div>
                <strong>{tr('Technical Support Line')}</strong>
                <p>+84 24 3948 1000 ({tr('Mon-Fri 08:00 - 18:00 ICT')})</p>
              </div>
            </div>

            <div className="info-item-card">
              <span className="info-icon">🛡️</span>
              <div>
                <strong>{tr('Security & Audits')}</strong>
                <p>security@etraviation.com</p>
              </div>
            </div>
          </div>

          {/* CONTACT FORM */}
          <div className="contact-form-col">
            <div className="widget-card">
              <h3 style={{ color: '#ffffff', marginBottom: '16px', fontSize: '1.25rem', fontWeight: '700' }}>{tr('Send Us a Message')}</h3>

              {feedback && (
                <div className={`alert-box ${feedback.type}`}>
                  {feedback.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="public-form">
                <div className="form-group">
                  <label>{tr('Full Name *')}</label>
                  <input
                    type="text"
                    className="public-input"
                    placeholder={tr('e.g. Capt. Robert Thorne')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>{tr('Work Email *')}</label>
                  <input
                    type="email"
                    className="public-input"
                    placeholder={tr('e.g. r.thorne@airways.com')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>{tr('Organization / MRO / Airline *')}</label>
                  <input
                    type="text"
                    className="public-input"
                    placeholder={tr('e.g. Pacific Maintenance Repair Org')}
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>{tr('Inquiry Type')}</label>
                  <select
                    className="public-select"
                    value={inquiryType}
                    onChange={(e) => setInquiryType(e.target.value)}
                  >
                    <option value="Technical Demo">{tr('Request Technical Product Demo')}</option>
                    <option value="Part 145/147 Compliance">{tr('Part 145 / 147 Compliance Consultation')}</option>
                    <option value="API Integration">{tr('API & System Integration')}</option>
                    <option value="Enterprise Pricing">{tr('Enterprise & Fleet Pricing')}</option>
                    <option value="Other Inquiry">{tr('General Inquiry')}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{tr('Message * (min 10 characters)')}</label>
                  <textarea
                    className="public-textarea"
                    rows={5}
                    placeholder={tr('Tell us about your organization\'s training record requirements or current challenges...')}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  ></textarea>
                </div>

                <button type="submit" className="btn-secondary-hero" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                  {loading ? tr('Sending Message...') : tr('Submit Inquiry') + ' &rarr;'}
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
