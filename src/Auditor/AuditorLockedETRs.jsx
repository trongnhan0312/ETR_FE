import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { fetchEtrList } from './auditorApi';
import { usePagination } from '../utils/usePagination';
import Pagination from '../components/Pagination';

const AuditorLockedETRs = () => {
  const navigate = useNavigate();
  const { trEn } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [allEtrs, setAllEtrs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadETRs = async () => {
      setLoading(true);
      try {
        const data = await fetchEtrList();
        setAllEtrs(data);
      } catch (err) {
        console.error('Error fetching locked ETR list:', err);
      } finally {
        setLoading(false);
      }
    };
    loadETRs();
  }, []);

  const filteredEtrs = allEtrs.filter((etr) => {
    return (
      etr.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      etr.learnerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      etr.courseName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      etr.learnerId?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const { page, setPage, pageCount, pageItems, total } = usePagination(filteredEtrs, {
    pageSize: 10,
    resetKey: searchQuery,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>{trEn('Locked ETR Records')}</h1>
          <div className="divider-gold"></div>
          <p className="header-description">
            {trEn('Searchable repository of finalized and cryptographically locked Electronic Training Records (IsLocked = true).')}
          </p>
        </div>
      </section>

      {/* Table Card */}
      <section className="table-card">
        {/* Table Toolbar */}
        <div className="table-toolbar">
          <div className="toolbar-left" style={{ width: '100%', maxWidth: '420px' }}>
            <div className="search-box" style={{ width: '100%' }}>
              <span className="search-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                placeholder={trEn('Search locked ETR by ID, learner name, course...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-responsive-scroll">
          <div className="table-header auditor-table-grid">
            <div>{trEn('ETR ID')}</div>
            <div>{trEn('Learner')}</div>
            <div>{trEn('Course')}</div>
            <div>{trEn('Completion Date')}</div>
            <div>{trEn('Locked Date')}</div>
            <div>{trEn('Approved By')}</div>
            <div>{trEn('Status')}</div>
            <div style={{ textAlign: 'right' }}>{trEn('Actions')}</div>
          </div>

          <div className="table-body">
            {loading ? (
              <div className="empty-table-state">{trEn('Loading locked records...')}</div>
            ) : filteredEtrs.length === 0 ? (
              <div className="empty-table-state">{trEn('No locked ETR records found matching your search criteria.')}</div>
            ) : (
              pageItems.map((etr) => (
                <div key={etr.id} className="table-row auditor-table-grid">
                  <div className="col-id">{etr.id}</div>
                  <div className="col-name">{etr.learnerName}</div>
                  <div className="col-course">{etr.courseName}</div>
                  <div>{etr.completionDate}</div>
                  <div>{etr.lockedDate}</div>
                  <div>{etr.approvedBy}</div>
                  <div>
                    <span className="badge-locked">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      {etr.status || trEn('Locked & Compliant')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button
                      className="auditor-btn-sm"
                      onClick={() => navigate(`/auditor/details?id=${etr.etrCourseRecordId}`)}
                    >
                      {trEn('View Details')}
                    </button>
                    <button
                      className="auditor-btn-sm"
                      onClick={() => navigate(`/auditor/approval-history?id=${etr.etrCourseRecordId}`)}
                    >
                      {trEn('Approval History')}
                    </button>
                    <button
                      className="auditor-btn-sm"
                      onClick={() => navigate('/auditor/export-packages')}
                    >
                      {trEn('Export')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Table Footer */}
        <div className="table-footer">
          <Pagination
            page={page}
            pageCount={pageCount}
            onChange={setPage}
            total={total}
            pageSize={10}
          />
        </div>
      </section>
    </div>
  );
};

export default AuditorLockedETRs;
