import { useState } from 'react';
import { MOCK_EXPORT_PACKAGES } from './mockAuditorData';

const AuditorExportPackages = () => {
  const [exportHistory, setExportHistory] = useState(MOCK_EXPORT_PACKAGES);

  const handleCreateExport = (type, defaultName) => {
    const newPkg = {
      id: `PKG-2026-${String(exportHistory.length + 1).padStart(3, '0')}`,
      name: defaultName,
      type: type,
      scope: 'Selected ETR Records Audit',
      generatedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      generatedBy: 'Auditor Officer',
      size: '14.2 MB',
      status: 'Ready',
      downloadUrl: '#',
      digitalSignature: 'VALID (CA-AeroMetric-2026)'
    };

    setExportHistory([newPkg, ...exportHistory]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>Export Packages & Regulatory Dossiers</h1>
          <div className="divider-gold"></div>
          <p className="header-description">
            Generate cryptographically signed compliance export packages, PDF transcripts, and complete evidence archives for CAA / EASA inspections.
          </p>
        </div>
      </section>

      {/* Cards Section */}
      <section className="export-card-grid">
        {/* Card 1: Export PDF */}
        <div className="export-card">
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div className="export-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div>
              <h2 className="export-title">Export PDF</h2>
              <p className="export-desc">Generate official single or multi-ETR summary compliance dossier PDF with watermark.</p>
            </div>
          </div>
          <button
            className="create-btn"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
            onClick={() => handleCreateExport('Compliance PDF', 'Single_ETR_Compliance_Summary.pdf')}
          >
            Generate PDF Dossier
          </button>
        </div>

        {/* Card 2: Export ZIP */}
        <div className="export-card">
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div className="export-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <div>
              <h2 className="export-title">Export ZIP</h2>
              <p className="export-desc">Archive all uploaded practical evidence, simulator logs, and certificates into a encrypted ZIP file.</p>
            </div>
          </div>
          <button
            className="create-btn"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
            onClick={() => handleCreateExport('Full Evidence ZIP', 'Complete_Evidence_Archive.zip')}
          >
            Generate Evidence ZIP
          </button>
        </div>

        {/* Card 3: Compliance Package */}
        <div className="export-card">
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div className="export-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h2 className="export-title">Compliance Package</h2>
              <p className="export-desc">Comprehensive regulatory inspection package with CAA / EASA compliance matrix.</p>
            </div>
          </div>
          <button
            className="create-btn"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
            onClick={() => handleCreateExport('Regulatory Package', 'CAA_EASA_Regulatory_Package.zip')}
          >
            Generate Regulatory Package
          </button>
        </div>

        {/* Card 4: Digital Signature Package */}
        <div className="export-card">
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div className="export-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h2 className="export-title">Digital Signature Package</h2>
              <p className="export-desc">Public-key cryptographic certificate manifest verifying zero alteration of locked records.</p>
            </div>
          </div>
          <button
            className="create-btn"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
            onClick={() => handleCreateExport('Digital Signature Package', 'Digital_Signature_Manifest.p7b')}
          >
            Generate Signature Manifest
          </button>
        </div>
      </section>

      {/* Export History Table */}
      <section className="table-card">
        <div className="table-toolbar">
          <div className="toolbar-left">
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>
              Generated Export History ({exportHistory.length} packages)
            </h2>
          </div>
        </div>

        <div className="table-responsive-scroll">
          <div className="table-header auditor-export-grid">
            <div>Package ID</div>
            <div>Package Name</div>
            <div>Type</div>
            <div>Generated Date</div>
            <div>Generated By</div>
            <div>File Size</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Download</div>
          </div>

          <div className="table-body">
            {exportHistory.map((pkg) => (
              <div key={pkg.id} className="table-row auditor-export-grid">
                <div className="col-id">{pkg.id}</div>
                <div className="col-name">{pkg.name}</div>
                <div style={{ fontWeight: '600', color: '#002147' }}>{pkg.type}</div>
                <div style={{ fontSize: '12px', color: 'rgba(0,33,71,0.6)' }}>{pkg.generatedDate}</div>
                <div>{pkg.generatedBy}</div>
                <div>{pkg.size}</div>
                <div>
                  <span className="badge-compliant" style={{ fontSize: '10px' }}>{pkg.status}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button 
                    className="auditor-btn-sm" 
                    onClick={() => alert(`Downloading package ${pkg.name}...`)}
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AuditorExportPackages;
