import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { fetchEtrList } from './auditorApi';
import { usePagination } from '../utils/usePagination';
import Pagination from '../components/Pagination';

const AuditorAdvancedSearch = () => {
  const navigate = useNavigate();
  const { trEn } = useLanguage();
  const [filters, setFilters] = useState({
    learner: '',
    course: '',
    classId: '',
    etrId: '',
    completionDate: '',
    lockedDate: '',
    status: 'All'
  });

  const [allRecords, setAllRecords] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchNonce, setSearchNonce] = useState(0);

  useEffect(() => {
    const loadRecords = async () => {
      setLoading(true);
      try {
        const data = await fetchEtrList();
        setAllRecords(data);
        setFilteredResults(data);
      } catch (err) {
        console.error('Error loading ETR records for advanced search:', err);
      } finally {
        setLoading(false);
      }
    };
    loadRecords();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const results = allRecords.filter((etr) => {
      const matchLearner =
        !filters.learner ||
        etr.learnerName?.toLowerCase().includes(filters.learner.toLowerCase()) ||
        etr.learnerId?.toLowerCase().includes(filters.learner.toLowerCase());

      const matchCourse =
        !filters.course ||
        etr.courseName?.toLowerCase().includes(filters.course.toLowerCase()) ||
        etr.courseId?.toLowerCase().includes(filters.course.toLowerCase());

      const matchClass =
        !filters.classId ||
        etr.className?.toLowerCase().includes(filters.classId.toLowerCase()) ||
        etr.classId?.toLowerCase().includes(filters.classId.toLowerCase());

      const matchEtr =
        !filters.etrId || etr.id?.toLowerCase().includes(filters.etrId.toLowerCase());

      const matchCompDate =
        !filters.completionDate || etr.completionDate?.includes(filters.completionDate);

      const matchLockDate =
        !filters.lockedDate || etr.lockedDate?.includes(filters.lockedDate);

      const matchStatus =
        filters.status === 'All' ||
        etr.status?.toLowerCase().includes(filters.status.toLowerCase());

      return (
        matchLearner &&
        matchCourse &&
        matchClass &&
        matchEtr &&
        matchCompDate &&
        matchLockDate &&
        matchStatus
      );
    });

    setFilteredResults(results);
    setSearchNonce((n) => n + 1);
  };

  const { page, setPage, pageCount, pageItems, total } = usePagination(filteredResults, {
    pageSize: 10,
    resetKey: searchNonce,
  });

  const handleReset = () => {
    setFilters({
      learner: '',
      course: '',
      classId: '',
      etrId: '',
      completionDate: '',
      lockedDate: '',
      status: 'All'
    });
    setFilteredResults(allRecords);
    setSearchNonce((n) => n + 1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>{trEn('Advanced Compliance Search')}</h1>
          <div className="divider-gold"></div>
          <p className="header-description">
            {trEn('Multi-parametric compliance inspection tool for regulatory auditing of locked training records.')}
          </p>
        </div>
      </section>

      {/* Filter Form Card */}
      <section className="table-card" style={{ padding: '24px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase' }}>{trEn('Learner Name / ID')}</label>
              <input
                type="text"
                name="learner"
                placeholder={trEn('e.g. Nguyen Van An, HV-8801')}
                className="search-input"
                style={{ width: '100%' }}
                value={filters.learner}
                onChange={handleFilterChange}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase' }}>{trEn('Course Name / Code')}</label>
              <input
                type="text"
                name="course"
                placeholder={trEn('e.g. A320 Type Rating')}
                className="search-input"
                style={{ width: '100%' }}
                value={filters.course}
                onChange={handleFilterChange}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase' }}>{trEn('Class Name / Code')}</label>
              <input
                type="text"
                name="classId"
                placeholder={trEn('e.g. CLS-2026-A320-04')}
                className="search-input"
                style={{ width: '100%' }}
                value={filters.classId}
                onChange={handleFilterChange}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase' }}>{trEn('ETR Record ID')}</label>
              <input
                type="text"
                name="etrId"
                placeholder={trEn('e.g. ETR-2026-0891')}
                className="search-input"
                style={{ width: '100%' }}
                value={filters.etrId}
                onChange={handleFilterChange}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase' }}>{trEn('Completion Date')}</label>
              <input
                type="date"
                name="completionDate"
                className="search-input"
                style={{ width: '100%' }}
                value={filters.completionDate}
                onChange={handleFilterChange}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase' }}>{trEn('Locked Date')}</label>
              <input
                type="date"
                name="lockedDate"
                className="search-input"
                style={{ width: '100%' }}
                value={filters.lockedDate}
                onChange={handleFilterChange}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase' }}>{trEn('Lock Status')}</label>
              <select
                name="status"
                className="search-input"
                style={{ width: '100%' }}
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="All">{trEn('All Locked States')}</option>
                <option value="Locked">{trEn('Locked & Compliant')}</option>
                <option value="Archived">{trEn('Archived Audit')}</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              className="auditor-btn-sm"
              style={{ padding: '10px 20px' }}
              onClick={handleReset}
            >
              {trEn('Reset Filters')}
            </button>
            <button
              type="submit"
              className="create-btn"
              style={{ borderRadius: '12px', padding: '10px 24px' }}
            >
              {trEn('Apply Filter Search')}
            </button>
          </div>
        </form>
      </section>

      {/* Results Table */}
      <section className="table-card">
        <div className="table-toolbar">
          <div className="toolbar-left">
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#002147', margin: 0 }}>
              {trEn('Search Results')} ({filteredResults.length} {trEn('records matching')})
            </h2>
          </div>
        </div>

        <div className="table-responsive-scroll">
          <div className="table-header auditor-table-grid">
            <div>{trEn('ETR ID')}</div>
            <div>{trEn('Learner')}</div>
            <div>{trEn('Course')}</div>
            <div>{trEn('Completion')}</div>
            <div>{trEn('Locked Date')}</div>
            <div>{trEn('Approved By')}</div>
            <div>{trEn('Status')}</div>
            <div style={{ textAlign: 'right' }}>{trEn('Actions')}</div>
          </div>

          <div className="table-body">
            {loading ? (
              <div className="empty-table-state">{trEn('Searching records...')}</div>
            ) : filteredResults.length === 0 ? (
              <div className="empty-table-state">{trEn('No matching records found for the applied filter parameters.')}</div>
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
                    <span className="badge-locked">{trEn('Locked')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button
                      className="auditor-btn-sm"
                      onClick={() => navigate(`/auditor/details?id=${etr.etrCourseRecordId}`)}
                    >
                      {trEn('View Details')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

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

export default AuditorAdvancedSearch;
