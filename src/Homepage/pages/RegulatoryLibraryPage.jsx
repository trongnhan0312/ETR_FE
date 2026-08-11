import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { fetchPublicRegulatoryDocs } from '../../utils/api';

const RegulatoryLibraryPage = () => {
  const { tr } = useLanguage();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    document.title = `${tr('Regulatory Library & Aviation Standards')} | ETR Aviation`;
    let isMounted = true;
    fetchPublicRegulatoryDocs()
      .then(res => {
        if (isMounted) {
          setDocs(res);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Failed to load regulatory docs", err);
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const categories = ['All', 'Compliance Standard', 'Training Standards', 'Safety & Operational', 'Safety'];

  const filteredDocs = docs.filter(doc => {
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="public-page-container">
      {/* HERO */}
      <section className="page-hero">
        <div className="hero-content">
          <div className="trust-pill">
            <span className="dot">•</span> {tr('PUBLIC AVIATION REGULATORY LIBRARY')}
          </div>
          <h1 className="hero-title">
            {tr('Reference framework for')} <span className="highlight-text-cyan">{tr('aviation training standards.')}</span>
          </h1>
          <p className="hero-subtitle">
            {tr('Explore sample reference guidelines, Part 145/147 training frameworks, EWIS practical assessment standards, and compliance benchmarks for electronic training records.')}
          </p>
        </div>
      </section>

      {/* LIBRARY SEARCH & FILTER */}
      <section className="page-section">
        <div className="search-filter-bar">
          <input
            type="text"
            className="public-input"
            placeholder={tr('Search regulatory standards by title, keyword, or document ID...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-pill-row" style={{ marginBottom: '32px' }}>
          {categories.map((cat, i) => (
            <button
              key={i}
              type="button"
              className={`filter-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="disclaimer-alert-box" style={{ marginBottom: '24px' }}>
          <span>ℹ️ <strong>{tr('Note:')}</strong> {tr('These reference documents represent public-safe educational models and regulatory alignment guidelines used by ETR Aviation platform developers and training administrators.')}</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>{tr('Loading regulatory library...')}</div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>{tr('No matching regulatory documents found.')}</div>
        ) : (
          <div className="doc-library-grid">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="reg-doc-card">
                <div className="reg-card-header">
                  <span className="badge-tag-category">{doc.category}</span>
                  <span className="doc-id font-mono text-cyan">{doc.id}</span>
                </div>

                <h3 className="reg-title">{doc.title}</h3>
                <p className="reg-summary">{doc.summary}</p>

                <div className="reg-meta-footer">
                  <span className="agency-tag">🏛️ {doc.agency}</span>
                  <span className="rev-date">Rev: {doc.revDate}</span>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <button type="button" className="btn-secondary-hero" style={{ padding: '8px 16px', fontSize: '0.85rem', width: '100%' }} onClick={() => setSelectedDoc(doc)}>
                    {tr('View Reference Specifications')} &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* DOCUMENT PREVIEW MODAL */}
      {selectedDoc && (
        <div className="public-modal-backdrop" onClick={() => setSelectedDoc(null)}>
          <div className="public-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedDoc.id}: {selectedDoc.title}</h3>
              <button type="button" className="close-btn" onClick={() => setSelectedDoc(null)}>✕</button>
            </div>

            <div className="doc-modal-body">
              <div className="doc-modal-meta">
                <span><strong>{tr('Category:')}</strong> {selectedDoc.category}</span>
                <span><strong>{tr('Issuing Body:')}</strong> {selectedDoc.agency}</span>
                <span><strong>{tr('Revision Date:')}</strong> {selectedDoc.revDate}</span>
              </div>

              <h4>{tr('Specification Overview')}</h4>
              <p>{selectedDoc.summary}</p>

              <div className="code-block-preview" style={{ marginTop: '16px' }}>
                <div className="code-header">{tr('SPECIFICATION STRUCTURE (SAMPLE JSON)')}</div>
                <pre><code>{JSON.stringify({
                  docId: selectedDoc.id,
                  title: selectedDoc.title,
                  complianceStandard: "Part 145 / 147 ETR Aligned",
                  retentionYears: 5,
                  requiredSignatures: ["Instructor", "QA_Officer", "Training_Manager"]
                }, null, 2)}</code></pre>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-submit" onClick={() => setSelectedDoc(null)}>
                {tr('Close Preview')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegulatoryLibraryPage;
