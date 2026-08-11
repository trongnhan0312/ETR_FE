import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { fetchPublicNews } from '../../utils/api';

const NewsroomPage = () => {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    document.title = `${tr('Newsroom & Press')} | ETR Aviation`;
    let isMounted = true;
    fetchPublicNews()
      .then(res => {
        if (isMounted) {
          setNews(res);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Failed to fetch news", err);
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const categories = ['All', 'Regulatory & Compliance', 'Product Innovation', 'Customer Success'];

  const filteredNews = selectedCategory === 'All' 
    ? news 
    : news.filter(item => item.category === selectedCategory);

  return (
    <div className="public-page-container">
      {/* HERO */}
      <section className="page-hero">
        <div className="hero-content">
          <div className="trust-pill">
            <span className="dot">•</span> {tr('ETR NEWSROOM & PRESS')}
          </div>
          <h1 className="hero-title">
            {tr('Latest announcements, regulatory updates,')} <span className="highlight-text-cyan">{tr('& insights.')}</span>
          </h1>
          <p className="hero-subtitle">
            {tr('Stay informed on platform releases, CAAV/FAA regulatory alignments, and technical aviation training best practices.')}
          </p>
        </div>
      </section>

      {/* CATEGORY FILTER */}
      <section className="page-section">
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

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>{tr('Loading news articles...')}</div>
        ) : filteredNews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>{tr('No news items found for this category.')}</div>
        ) : (
          <div className="news-grid">
            {filteredNews.map((item) => (
              <div key={item.id} className="news-card" onClick={() => navigate(`/newsroom/${item.id}`)}>
                <div className="news-card-header">
                  <span className="badge-tag-category">{item.category}</span>
                  <span className="news-date">📅 {item.date}</span>
                </div>

                <h3 className="news-title">{item.title}</h3>
                <p className="news-summary">{item.summary}</p>

                <div className="news-footer">
                  <span className="news-author">{tr('By')} {item.author}</span>
                  <span className="read-more">{tr('Read Article')} &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default NewsroomPage;
