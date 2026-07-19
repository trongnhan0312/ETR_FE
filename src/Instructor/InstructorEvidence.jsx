import { useState } from 'react';

const initialFiles = [
  { name: 'Attendance_Day_01.pdf', type: 'ATTENDANCE SHEET', tag: 'AV-2024-001', date: '24/10/2023', size: '2.4 MB', status: 'Verified', fileType: 'pdf' },
  { name: 'Practical_Exam_Result.png', type: 'PRACTICAL FORM', tag: 'AV-2024-001', date: '22/10/2023', size: '1.1 MB', status: 'Pending QA', fileType: 'png' },
  { name: 'Digital_Signature_Instructor.png', type: 'SIGNATURE', tag: 'AV-2024-045', date: '20/10/2023', size: '450 KB', status: 'Rejected', fileType: 'png' },
  { name: 'Xac_Nhan_Hoc_Vien_0892.pdf', type: 'CERTIFICATE', tag: 'AV-2024-012', date: '21/10/2023', size: '15 KB', status: 'Verified', fileType: 'pdf' },
  { name: 'Lab_Report_Engine_Check.pdf', type: 'LAB REPORT', tag: 'AV-2024-001', date: '18/10/2023', size: '3.2 MB', status: 'Pending QA', fileType: 'pdf' },
];

const InstructorEvidence = () => {
  const [evidenceFiles, setEvidenceFiles] = useState(initialFiles);
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const handleUpload = (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.size > 10 * 1024 * 1024) {
      alert('Kích thước file vượt quá giới hạn 10MB!');
      return;
    }

    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(fileExt)) {
      alert('Định dạng file không hỗ trợ! Chỉ cho phép PDF, JPG, PNG.');
      return;
    }

    const newFile = {
      name: file.name,
      type: fileExt === 'pdf' ? 'DOCUMENT' : 'IMAGE',
      tag: 'AV-2024-001',
      date: new Date().toLocaleDateString('vi-VN'),
      size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
      status: 'Pending QA',
      fileType: fileExt === 'pdf' ? 'pdf' : 'png',
    };

    setEvidenceFiles((prev) => [newFile, ...prev]);
    alert('Tải lên minh chứng thành công!');
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Verified': return { bg: '#e8f5e9', color: '#2e7d32', border: '#c8e6c9' };
      case 'Pending QA': return { bg: 'rgba(197,160,89,0.08)', color: '#c5a059', border: 'rgba(197,160,89,0.3)' };
      case 'Rejected': return { bg: '#ffebee', color: '#c62828', border: '#ffcdd2' };
      default: return { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
    }
  };

  const filteredFiles = evidenceFiles.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) || f.tag.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'ALL' || f.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Content Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>Minh chứng đào tạo</h1>
          <div className="divider-gold" />
          <p className="header-description">
            Quản lý và tải lên các minh chứng đào tạo như bảng điểm danh, kết quả đánh giá và chữ ký xác nhận.
          </p>
        </div>
      </section>

      {/* Upload Area */}
      <div
        className={`evidence-dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('evidence-file-input').click()}
      >
        <div className="dropzone-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-3-7v4h-2v-4H9l4-4 4 4h-4z" />
          </svg>
        </div>
        <p className="dropzone-title">Kéo thả file hoặc nhấn để tải lên</p>
        <p className="dropzone-subtitle">Hỗ trợ: PDF, JPG, PNG · Tối đa 10MB</p>
        <input
          id="evidence-file-input"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
        padding: '14px 20px', background: '#ffffff', border: '1px solid #dfe6f1', borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0,33,71,0.04)',
      }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '360px' }}>
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
            <path d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C.629167 9.85417 0 8.31667 0 6.5C0 4.68333.629167 3.14583 1.8875 1.8875C3.14583.629167 4.68333 0 6.5 0C8.31667 0 9.85417.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z" fill="currentColor" />
          </svg>
          <input
            type="text"
            placeholder="Tìm file minh chứng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{ width: '100%', paddingLeft: '42px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'Verified', 'Pending QA', 'Rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              type="button"
              style={{
                padding: '8px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: '700',
                border: '1px solid', cursor: 'pointer', textTransform: 'uppercase',
                ...(filterStatus === f
                  ? { backgroundColor: '#002147', borderColor: '#002147', color: '#d4af37' }
                  : { backgroundColor: 'transparent', borderColor: '#dfe6f1', color: 'rgba(0,33,71,0.6)' }
                ),
              }}
            >
              {f === 'ALL' ? 'Tất cả' : f === 'Verified' ? 'Đã duyệt' : f === 'Pending QA' ? 'Chờ QA' : 'Từ chối'}
            </button>
          ))}
        </div>
      </div>

      {/* Evidence Table */}
      <section className="table-card">
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 120px 120px 100px 80px 100px',
          alignItems: 'center', gap: '12px',
          background: 'linear-gradient(135deg, #06234a 0%, #041b39 100%)',
          color: '#ffffff', padding: '14px 20px', fontSize: '11px', fontWeight: '700',
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          <div>Tên file</div>
          <div>Loại</div>
          <div>Lớp</div>
          <div>Ngày tải</div>
          <div>Kích thước</div>
          <div style={{ textAlign: 'center' }}>Trạng thái</div>
        </div>

        <div className="table-body">
          {filteredFiles.map((file, idx) => {
            const s = getStatusStyle(file.status);
            return (
              <div key={idx} className="table-row" style={{
                display: 'grid', gridTemplateColumns: '1fr 120px 120px 100px 80px 100px',
                alignItems: 'center', gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800',
                    backgroundColor: file.fileType === 'pdf' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                    color: file.fileType === 'pdf' ? '#ef4444' : '#3b82f6',
                    textTransform: 'uppercase',
                  }}>
                    {file.fileType}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#002147' }}>{file.name}</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{file.type}</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#c5a059' }}>{file.tag}</span>
                <span style={{ fontSize: '12px', color: 'rgba(0,33,71,0.6)' }}>{file.date}</span>
                <span style={{ fontSize: '12px', color: 'rgba(0,33,71,0.5)' }}>{file.size}</span>
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block', padding: '4px 10px', borderRadius: '6px',
                    fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                    backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`,
                  }}>
                    {file.status === 'Verified' ? 'ĐÃ DUYỆT' : file.status === 'Pending QA' ? 'CHỜ QA' : 'TỪ CHỐI'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="table-footer">
          <span className="footer-info">Hiển thị {filteredFiles.length} trên {evidenceFiles.length} file</span>
          <div className="pagination">
            <button className="page-num active" type="button">1</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InstructorEvidence;
