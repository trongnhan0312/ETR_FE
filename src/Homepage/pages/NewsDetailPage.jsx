import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { fetchPublicNewsById } from '../../utils/api';

const NewsDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchPublicNewsById(id)
      .then(res => {
        if (isMounted) {
          setArticle(res);
          document.title = `${res?.title || 'News Detail'} | ETR Aviation`;
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Failed to load article detail", err);
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [id]);

  return (
    <div className="public-page-container">
      <div className="detail-page-wrapper">
        <button type="button" className="btn-back" onClick={() => navigate('/newsroom')}>
          &larr; {tr('Back to Newsroom')}
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>{tr('Loading article...')}</div>
        ) : !article ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>{tr('Article not found.')}</div>
        ) : (
          <article className="news-detail-article">
            <div className="article-meta">
              <span className="badge-tag-category">{article.category}</span>
              <span className="meta-date">{tr('Published on')} {article.date}</span>
              <span className="meta-author">{tr('By')} {article.author}</span>
            </div>

            <h1 className="article-title">{article.title}</h1>

            <div className="article-summary-lead">
              {article.summary}
            </div>

            <div className="article-body">
              <p>{article.content}</p>
              <p>
                {tr('As part of our commitment to continuous safety and operational transparency, ETR Aviation provides ongoing platform enhancements to meet evolving international aviation regulatory standards.')}
              </p>
            </div>
          </article>
        )}
      </div>
    </div>
  );
};

export default NewsDetailPage;
