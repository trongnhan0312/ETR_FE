import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  exportPdf,
  exportTrainingPackage,
  exportDashboard,
  downloadExportFile,
  fetchExportJobs,
  fetchEtrList,
} from './auditorApi';
import { usePagination } from '../utils/usePagination';
import Pagination from '../components/Pagination';

const AuditorExportPackages = () => {
  const { trEn } = useLanguage();
  const [exportHistory, setExportHistory] = useState([]);
  const [loadingType, setLoadingType] = useState(null);
  // Chọn ĐÚNG hồ sơ ETR cần xuất — trước đây export luôn lấy "ETR Completed đầu tiên"
  // nên file nhận được không phải hồ sơ mình muốn (và thiếu mốc thời gian validation
  // của đúng hồ sơ đó).
  const [etrOptions, setEtrOptions] = useState([]);
  const [selectedEtrId, setSelectedEtrId] = useState('');
  const [etrSearch, setEtrSearch] = useState('');

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const jobs = await fetchExportJobs();
        if (Array.isArray(jobs)) setExportHistory(jobs);
      } catch (err) {
        console.error('Error loading export history:', err);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    const loadEtrs = async () => {
      try {
        const etrs = await fetchEtrList();
        if (Array.isArray(etrs)) setEtrOptions(etrs);
      } catch (err) {
        console.error('Error loading ETR list for export:', err);
      }
    };
    loadEtrs();
  }, []);

  // id số thuần cho API; '' = chưa chọn → fallback ETR Completed đầu tiên
  const exportTarget = selectedEtrId ? { etrCourseRecordId: Number(selectedEtrId) } : {};

  // Lọc danh sách ETR theo từ khóa (ID / học viên / khóa học / trạng thái)
  const etrQuery = etrSearch.trim().toLowerCase();
  const filteredEtrOptions = etrQuery
    ? etrOptions.filter((etr) =>
        [etr.id, etr.learnerName, etr.courseName, etr.className, etr.status, String(etr.etrCourseRecordId ?? '')]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(etrQuery)),
      )
    : etrOptions;

  // Hồ sơ đang chọn để hiển thị trạng thái rõ ràng
  const selectedEtr =
    etrOptions.find((e) => String(e.etrCourseRecordId) === String(selectedEtrId)) || null;

  // Màu badge theo trạng thái ETR — dễ nhìn khi chọn hồ sơ để xuất
  const statusTone = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('completed') || s.includes('approved')) return { cls: 'dash-badge-compliant', color: '#16a34a' };
    if (s.includes('locked') || s.includes('compliant')) return { cls: 'dash-badge-locked', color: '#0a2c55' };
    if (s.includes('inprogress') || s.includes('draft') || s.includes('planned')) return { cls: 'dash-badge-warn', color: '#0891b2' };
    if (s.includes('submitted') || s.includes('verified') || s.includes('underreview') || s.includes('pending')) return { cls: 'dash-badge-warn', color: '#d97706' };
    if (s.includes('returned') || s.includes('rejected') || s.includes('cancelled')) return { cls: 'dash-badge-danger', color: '#dc2626' };
    return { cls: '', color: '#475569' };
  };
  const selectedTone = statusTone(selectedEtr?.status);

  const handleExportPDF = async () => {
    setLoadingType('pdf');
    try {
      const newPkg = await exportPdf({ ...exportTarget, name: 'Single_ETR_Compliance_Summary.pdf' });
      setExportHistory((prev) => [newPkg, ...prev]);
    } catch (err) {
      console.error('Export PDF failed:', err);
    } finally {
      setLoadingType(null);
    }
  };

  const handleExportZIP = async () => {
    setLoadingType('zip');
    try {
      const newPkg = await exportTrainingPackage({
        ...exportTarget,
        packageType: 'Full Evidence ZIP',
        name: 'Complete_Evidence_Archive.zip',
      });
      setExportHistory((prev) => [newPkg, ...prev]);
    } catch (err) {
      console.error('Export Evidence ZIP failed:', err);
    } finally {
      setLoadingType(null);
    }
  };

  const handleExportRegulatoryPackage = async () => {
    setLoadingType('regulatory');
    try {
      const newPkg = await exportTrainingPackage({
        ...exportTarget,
        packageType: 'Regulatory Package',
        name: 'CAA_EASA_Regulatory_Package.zip',
      });
      setExportHistory((prev) => [newPkg, ...prev]);
    } catch (err) {
      console.error('Export Regulatory Package failed:', err);
    } finally {
      setLoadingType(null);
    }
  };

  const handleExportSignatureManifest = async () => {
    setLoadingType('manifest');
    try {
      const newPkg = await exportDashboard({
        type: 'Digital Signature Package',
        name: 'Digital_Signature_Manifest.p7b',
      });
      setExportHistory((prev) => [newPkg, ...prev]);
    } catch (err) {
      console.error('Export Signature Manifest failed:', err);
    } finally {
      setLoadingType(null);
    }
  };

  const handleDownload = async (pkg) => {
    await downloadExportFile(pkg.id, pkg.name);
  };

  const { page, setPage, pageCount, pageItems, total } = usePagination(exportHistory, {
    pageSize: 10,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>{trEn('Export Packages & Regulatory Dossiers')}</h1>
          <div className="divider-gold"></div>
          <p className="header-description">
            {trEn('Generate cryptographically signed compliance export packages, PDF transcripts, and complete evidence archives for CAA / EASA inspections.')}
          </p>
        </div>
      </section>

      {/* ETR Selector — chọn hồ sơ cần xuất (file sẽ mang đủ mốc thời gian validation của hồ sơ này) */}
      <section className="table-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 360px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              {trEn('Select ETR Record to Export')}
            </label>
            <input
              type="text"
              className="search-input"
              style={{ width: '100%', marginBottom: '10px' }}
              placeholder={trEn('Search by ID, learner, course or status...')}
              value={etrSearch}
              onChange={(e) => setEtrSearch(e.target.value)}
            />
            <select
              className="search-input"
              style={{ width: '100%', background: '#ffffff' }}
              value={selectedEtrId}
              onChange={(e) => setSelectedEtrId(e.target.value)}
            >
              <option value="">
                {trEn('— Auto (first Completed ETR) —')}
              </option>
              {filteredEtrOptions.map((etr) => {
                const tone = statusTone(etr.status);
                return (
                  <option
                    key={etr.etrCourseRecordId}
                    value={etr.etrCourseRecordId}
                    style={{ color: tone.color, fontWeight: 600 }}
                  >
                    {etr.id} - {etr.learnerName} ({etr.courseName}) - {etr.status}
                  </option>
                );
              })}
            </select>
            {/* Chú thích màu theo trạng thái */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '8px',
                fontSize: '11px',
                color: 'rgba(0,33,71,0.6)',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 700, color: 'rgba(0,33,71,0.45)', textTransform: 'uppercase' }}>{trEn('Status colors')}:</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />{trEn('Completed / Approved')}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#0a2c55', display: 'inline-block' }} />{trEn('Locked & Compliant')}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#0891b2', display: 'inline-block' }} />{trEn('In Progress / Draft')}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />{trEn('Submitted / Verified / Pending')}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />{trEn('Returned / Rejected')}</span>
            </div>
            {filteredEtrOptions.length === 0 && (
              <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '6px' }}>
                {trEn('No records match your search.')}
              </div>
            )}
            <div style={{ fontSize: '11px', color: 'rgba(0,33,71,0.55)', marginTop: '6px' }}>
              {selectedEtrId
                ? trEn('This export will include the full validation timeline (Submitted / Verified / Completed) of the selected record.')
                : trEn('No record chosen — the export falls back to the first Completed ETR. Pick one above to export a specific dossier.')
              }
            </div>
          </div>
        </div>

        {/* Trạng thái hồ sơ đang chọn — hiển thị rõ ràng để dễ kiểm tra trước khi xuất */}
        {selectedEtr && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
              marginTop: '16px',
              padding: '16px 18px',
              borderRadius: '14px',
              border: '1px solid #dfe6f1',
              background: '#f8fafc',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{trEn('ETR Record')}</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#002147', marginTop: '4px' }}>{selectedEtr.id}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{trEn('Learner')}</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#002147', marginTop: '4px' }}>{selectedEtr.learnerName}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{trEn('Course / Class')}</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#002147', marginTop: '4px' }}>
                {selectedEtr.courseName}
                {selectedEtr.className && selectedEtr.className !== '—' ? ` — ${selectedEtr.className}` : ''}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{trEn('Status')}</div>
              <div style={{ marginTop: '6px' }}>
                <span
                  className={`dash-badge ${selectedTone.cls}`}
                  style={{ color: selectedTone.color, borderColor: 'currentColor', opacity: 0.9 }}
                >
                  {selectedEtr.status}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Cards Section */}
      <section className="export-card-grid">
        {/* Card 1: Export PDF (POST /api/Exports/pdf) */}
        <div className="export-card">
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div className="export-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div>
              <h2 className="export-title">{trEn('Export PDF')}</h2>
              <p className="export-desc">{trEn('Generate official single or multi-ETR summary compliance dossier PDF with watermark.')}</p>
            </div>
          </div>
          <button
            className="create-btn"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
            onClick={handleExportPDF}
            disabled={loadingType === 'pdf'}
          >
            {loadingType === 'pdf' ? trEn('Generating PDF...') : trEn('Generate PDF Dossier')}
          </button>
        </div>

        {/* Card 2: Export ZIP (POST /api/Exports/training-package) */}
        <div className="export-card">
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div className="export-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <div>
              <h2 className="export-title">{trEn('Export ZIP')}</h2>
              <p className="export-desc">{trEn('Archive all uploaded practical evidence, simulator logs, and certificates into a encrypted ZIP file.')}</p>
            </div>
          </div>
          <button
            className="create-btn"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
            onClick={handleExportZIP}
            disabled={loadingType === 'zip'}
          >
            {loadingType === 'zip' ? trEn('Generating Evidence ZIP...') : trEn('Generate Evidence ZIP')}
          </button>
        </div>

        {/* Card 3: Compliance Package (POST /api/Exports/training-package) */}
        <div className="export-card">
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div className="export-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h2 className="export-title">{trEn('Compliance Package')}</h2>
              <p className="export-desc">{trEn('Comprehensive regulatory inspection package with CAA / EASA compliance matrix.')}</p>
            </div>
          </div>
          <button
            className="create-btn"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
            onClick={handleExportRegulatoryPackage}
            disabled={loadingType === 'regulatory'}
          >
            {loadingType === 'regulatory' ? trEn('Generating Package...') : trEn('Generate Regulatory Package')}
          </button>
        </div>

        {/* Card 4: Digital Signature Package (POST /api/Exports/dashboard) */}
        <div className="export-card">
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div className="export-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h2 className="export-title">{trEn('Digital Signature Package')}</h2>
              <p className="export-desc">{trEn('Public-key cryptographic certificate manifest verifying zero alteration of locked records.')}</p>
            </div>
          </div>
          <button
            className="create-btn"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
            onClick={handleExportSignatureManifest}
            disabled={loadingType === 'manifest'}
          >
            {loadingType === 'manifest' ? trEn('Generating Manifest...') : trEn('Generate Signature Manifest')}
          </button>
        </div>
      </section>

      {/* Export History Table */}
      <section className="table-card">
        <div className="table-toolbar">
          <div className="toolbar-left">
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>
              {trEn('Generated Export History')} ({exportHistory.length} {trEn('packages')})
            </h2>
          </div>
        </div>

        <div className="table-responsive-scroll">
          <div className="table-header auditor-export-grid">
            <div>{trEn('Package ID')}</div>
            <div>{trEn('Package Name')}</div>
            <div>{trEn('Type')}</div>
            <div>{trEn('ETR Record')}</div>
            <div>{trEn('Generated Date')}</div>
            <div>{trEn('Generated By')}</div>
            <div>{trEn('File Size')}</div>
            <div>{trEn('Status')}</div>
            <div style={{ textAlign: 'right' }}>{trEn('Download')}</div>
          </div>

          <div className="table-body">
            {pageItems.map((pkg) => (
              <div key={pkg.id} className="table-row auditor-export-grid">
                <div className="col-id">{pkg.id}</div>
                <div className="col-name">{pkg.name}</div>
                <div style={{ fontWeight: '600', color: '#002147' }}>{pkg.type}</div>
                <div>{pkg.etrCourseRecordId ? `#ETR-${String(pkg.etrCourseRecordId).padStart(4, '0')}` : '—'}</div>
                <div style={{ fontSize: '12px', color: 'rgba(0,33,71,0.6)' }}>{pkg.generatedDate}</div>
                <div>{pkg.generatedBy}</div>
                <div>{pkg.size}</div>
                <div>
                  <span className="badge-compliant" style={{ fontSize: '10px' }}>{pkg.status}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button 
                    className="auditor-btn-sm" 
                    onClick={() => handleDownload(pkg)}
                  >
                    {trEn('Download')}
                  </button>
                </div>
              </div>
            ))}
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

export default AuditorExportPackages;
