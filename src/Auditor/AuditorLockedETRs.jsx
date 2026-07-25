import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchEtrList } from './auditorApi';

const AuditorLockedETRs = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [allEtrs, setAllEtrs] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Line Maintenance', 'Flight Operations', 'Quality Assurance', 'Base Maintenance'];

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
    const matchesSearch =
      etr.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      etr.learnerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      etr.courseName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      etr.learnerId?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeCategory === 'All') return matchesSearch;
    return matchesSearch && etr.learnerDepartment?.toLowerCase().includes(activeCategory.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>Locked ETR Records</h1>
          <div className="divider-gold"></div>
          <p className="header-description">
            Searchable repository of finalized and cryptographically locked Electronic Training Records (IsLocked = true).
          </p>
        </div>
      </section>

      {/* Table Card */}
      <section className="table-card">
        {/* Table Toolbar */}
        <div className="table-toolbar">
          <div className="toolbar-left">
            <div className="search-box">
              <span className="search-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search locked ETR by ID, learner name, course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="toolbar-right" style={{ flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-btn${activeCategory === cat ? ' active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="table-responsive-scroll">
          <div className="table-header auditor-table-grid">
            <div>ETR ID</div>
            <div>Learner</div>
            <div>Course</div>
            <div>Completion Date</div>
            <div>Locked Date</div>
            <div>Approved By</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
          </div>

          <div className="table-body">
            {loading ? (
              <div className="empty-table-state">Loading locked records...</div>
            ) : filteredEtrs.length === 0 ? (
              <div className="empty-table-state">No locked ETR records found matching your search criteria.</div>
            ) : (
              filteredEtrs.map((etr) => (
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
                      {etr.status || 'Locked & Compliant'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button
                      className="auditor-btn-sm"
                      onClick={() => navigate(`/auditor/details?id=${etr.id}`)}
                    >
                      View Details
                    </button>
                    <button
                      className="auditor-btn-sm"
                      onClick={() => navigate(`/auditor/approval-history?id=${etr.id}`)}
                    >
                      Approval History
                    </button>
                    <button
                      className="auditor-btn-sm"
                      onClick={() => navigate('/auditor/export-packages')}
                    >
                      Export
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Table Footer */}
        <div className="table-footer">
          <div className="footer-info">Showing {filteredEtrs.length} of {allEtrs.length} locked records</div>
          <div className="pagination">
            <button className="page-arrow" disabled>
              ‹
            </button>
            <button className="page-num active">1</button>
            <button className="page-arrow" disabled>
              ›
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AuditorLockedETRs;
