import { useState } from 'react';

const initialEtrRecords = [
  {
    id: '#AM-2024-0892',
    studentCode: 'AM-2409-001',
    studentName: 'Trần Hoàng Nam',
    course: 'Aerospace Structural Analysis',
    status: 'PENDING QA',
    lastUpdated: '24/05/2024 14:30',
    steps: { personal: true, attendance: true, results: true, evidence: false },
    evidenceList: [
      { name: 'Bao-Cao-Khao-Sat-Thuc-Dia.pdf', type: 'PDF DOC', tag: 'AEROSPACE STRUCTURAL ANALYSIS', date: '15 Th08, 2024', size: '2.4 MB', status: 'Verified' },
      { name: 'Canh-Canh-May-Bay-Repair-01.jpg', type: 'PHOTO', tag: 'STRUCTURAL INTEGRITY CHECK', date: '18 Th08, 2024', size: '1.1 MB', status: 'Pending QA' },
      { name: 'Digital_Signature_Instructor.png', type: 'SIGNATURE', tag: 'FINAL APPROVAL TOKEN', date: '20 Th08, 2024', size: '450 KB', status: 'Rejected', rejectReason: 'Hình ảnh mờ, không nhìn rõ chữ ký và dấu mộc của đơn vị.' },
      { name: 'Xac-Nhan-Hoc-Vien-0892.svg', type: 'SIGNATURE', tag: 'DIGITAL ID CERTIFICATE', date: '21 Th08, 2024', size: '15 KB', status: 'Verified' }
    ]
  },
  {
    id: '#AM-2024-0650',
    studentCode: 'AM-2409-003',
    studentName: 'Nguyễn Văn Bình',
    course: 'Propulsion Systems',
    status: 'APPROVED',
    lastUpdated: '20/05/2024 16:45',
    steps: { personal: true, attendance: true, results: true, evidence: true },
    evidenceList: [
      { name: 'CCCD_NguyenVanBinh.pdf', type: 'PDF DOC', tag: 'PERSONAL FILE', date: '10 Th05, 2024', size: '1.1 MB', status: 'Verified' },
      { name: 'BangDiem_Chung.pdf', type: 'PDF DOC', tag: 'ACADEMIC TRANSCRIPT', date: '15 Th05, 2024', size: '920 KB', status: 'Verified' }
    ]
  },
  {
    id: '#AM-2024-0320',
    studentCode: 'AM-2409-002',
    studentName: 'Trần Thị B',
    course: 'A320 Maintenance Basics',
    status: 'UNDER REVIEW',
    lastUpdated: '18/05/2024 10:15',
    steps: { personal: true, attendance: true, results: false, evidence: false },
    evidenceList: [
      { name: 'CCCD_TranThiB.pdf', type: 'PDF DOC', tag: 'PERSONAL FILE', date: '12 Th05, 2024', size: '1.5 MB', status: 'Verified' }
    ]
  }
];

const initialAuditTrail = [
  { time: '24/05/2024 14:32', actor: 'Academic Staff', action: 'UPDATE', desc: 'Đã cập nhật điểm danh lớp L1-M2' },
  { time: '24/05/2024 10:15', actor: 'Academic Staff', action: 'VALIDATE', desc: 'Xác nhận checklist hồ sơ Trần Hoàng Nam' },
  { time: '20/05/2024 16:47', actor: 'QA Officer', action: 'VALIDATE', desc: 'Phê duyệt ETR #AM-2024-0650 của Nguyễn Văn Bình' },
  { time: '18/05/2024 10:20', actor: 'Academic Staff', action: 'UPDATE', desc: 'Tạo mới hồ sơ ETR #AM-2024-0320' }
];

const EtrManagement = () => {
  const [etrRecords, setEtrRecords] = useState(initialEtrRecords);
  const [selectedRecord, setSelectedRecord] = useState(initialEtrRecords[0]);
  const [auditTrail, setAuditTrail] = useState(initialAuditTrail);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Sub-views & Filters
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'evidence'
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [fileCategoryFilter, setFileCategoryFilter] = useState('ALL');
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEvidenceUploadOpen, setIsEvidenceUploadOpen] = useState(false);
  const [isFinalViewOpen, setIsFinalViewOpen] = useState(false);
  const [finalViewRecord, setFinalViewRecord] = useState(null);

  // New ETR form state
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentCode, setNewStudentCode] = useState('');
  const [newCourse, setNewCourse] = useState('Propulsion Systems');
  const [newStatus, setNewStatus] = useState('UNDER REVIEW');

  // New Evidence upload form state
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileType, setUploadFileType] = useState('PDF DOC');
  const [uploadFileTag, setUploadFileTag] = useState('AEROSPACE STRUCTURAL ANALYSIS');
  const [uploadFileSize, setUploadFileSize] = useState('1.5 MB');

  const handleSelectRecord = (record) => {
    setSelectedRecord(record);
  };

  const handleCreateEtr = (e) => {
    e.preventDefault();

    const recordId = `#AM-2024-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const nowStr = new Date().toLocaleString('vi-VN', { hour12: false }).replace(',', '');

    const newRecord = {
      id: recordId,
      studentCode: newStudentCode || 'AM-2409-999',
      studentName: newStudentName,
      course: newCourse,
      status: newStatus,
      lastUpdated: nowStr,
      steps: {
        personal: true,
        attendance: newStatus !== 'UNDER REVIEW',
        results: newStatus === 'APPROVED',
        evidence: newStatus === 'APPROVED'
      },
      evidenceList: [
        { name: `CCCD_${newStudentName.replace(/\s+/g, '')}.pdf`, type: 'PDF DOC', tag: 'PERSONAL FILE', date: nowStr.split(' ')[0], size: '1.0 MB', status: 'Verified' }
      ]
    };

    setEtrRecords([newRecord, ...etrRecords]);
    setSelectedRecord(newRecord);

    // Append to Audit Trail
    const newLog = {
      time: nowStr,
      actor: 'Academic Staff',
      action: 'UPDATE',
      desc: `Tạo mới hồ sơ ETR ${recordId} của ${newStudentName}`
    };
    setAuditTrail([newLog, ...auditTrail]);

    setIsCreateOpen(false);
  };

  const handleOpenEvidence = (record, e) => {
    e.stopPropagation();
    setSelectedRecord(record);
    setViewMode('evidence');
    setFileSearchQuery('');
    setFileCategoryFilter('ALL');
    setSelectedFiles([]);
  };

  const handleUploadEvidence = (e) => {
    e.preventDefault();
    if (!selectedRecord) return;

    const nowStr = new Date().toLocaleString('vi-VN', { hour12: false }).replace(',', '');
    const today = new Date();
    const months = ['Th01', 'Th02', 'Th03', 'Th04', 'Th05', 'Th06', 'Th07', 'Th08', 'Th09', 'Th10', 'Th11', 'Th12'];
    const dateFormatted = `${today.getDate()} ${months[today.getMonth()]}, ${today.getFullYear()}`;

    const newFile = {
      name: uploadFileName || 'Document.pdf',
      type: uploadFileType,
      tag: uploadFileTag.toUpperCase(),
      date: dateFormatted,
      size: uploadFileSize,
      status: 'Pending QA'
    };

    const updatedRecord = {
      ...selectedRecord,
      evidenceList: [...selectedRecord.evidenceList, newFile]
    };

    setEtrRecords(etrRecords.map(r => r.id === selectedRecord.id ? updatedRecord : r));
    setSelectedRecord(updatedRecord);

    // Append to Audit Trail
    const newLog = {
      time: nowStr,
      actor: 'Academic Staff',
      action: 'UPDATE',
      desc: `Tải lên minh chứng ${newFile.name} cho hồ sơ ETR ${selectedRecord.id}`
    };
    setAuditTrail([newLog, ...auditTrail]);

    setIsEvidenceUploadOpen(false);
    setUploadFileName('');
  };

  const handleOpenFinalView = (record, e) => {
    e.stopPropagation();
    setFinalViewRecord(record);
    setIsFinalViewOpen(true);
  };

  const handleDownloadFile = (fileName) => {
    alert(`Đang tải xuống tệp tin: ${fileName}`);
    const nowStr = new Date().toLocaleString('vi-VN', { hour12: false }).replace(',', '');
    const newLog = {
      time: nowStr,
      actor: 'Academic Staff',
      action: 'UPDATE',
      desc: `Tải xuống minh chứng ${fileName} thuộc hồ sơ ETR ${selectedRecord ? selectedRecord.id : ''}`
    };
    setAuditTrail([newLog, ...auditTrail]);
  };

  const [previewFile, setPreviewFile] = useState(null);

  const handleDeleteFile = (fileName, e) => {
    e.stopPropagation();
    if (!selectedRecord) return;
    if (confirm(`Bạn có chắc chắn muốn xóa minh chứng ${fileName}?`)) {
      const updatedRecord = {
        ...selectedRecord,
        evidenceList: selectedRecord.evidenceList.filter(f => f.name !== fileName)
      };
      setEtrRecords(etrRecords.map(r => r.id === selectedRecord.id ? updatedRecord : r));
      setSelectedRecord(updatedRecord);

      // Append to Audit Trail
      const nowStr = new Date().toLocaleString('vi-VN', { hour12: false }).replace(',', '');
      const newLog = {
        time: nowStr,
        actor: 'Academic Staff',
        action: 'UPDATE',
        desc: `Xóa minh chứng ${fileName} khỏi hồ sơ ETR ${selectedRecord.id}`
      };
      setAuditTrail([newLog, ...auditTrail]);
    }
  };

  const handleToggleFileSelect = (fileName, e) => {
    e.stopPropagation();
    if (selectedFiles.includes(fileName)) {
      setSelectedFiles(selectedFiles.filter(name => name !== fileName));
    } else {
      setSelectedFiles([...selectedFiles, fileName]);
    }
  };

  const handleToggleSelectAll = (filtered) => {
    if (selectedFiles.length === filtered.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filtered.map(f => f.name));
    }
  };

  // ETR Filter Logic
  const filteredRecords = etrRecords.filter((rec) => {
    const matchesSearch =
      rec.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.studentCode.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && rec.status === statusFilter;
  });

  // Evidence Specific Counts and Filters
  const totalCount = selectedRecord ? selectedRecord.evidenceList.length : 0;
  const imgCount = selectedRecord ? selectedRecord.evidenceList.filter(f => f.type === 'PHOTO' || f.type === 'IMAGE').length : 0;
  const pdfCount = selectedRecord ? selectedRecord.evidenceList.filter(f => f.type === 'PDF DOC' || f.type === 'PDF').length : 0;
  const sigCount = selectedRecord ? selectedRecord.evidenceList.filter(f => f.type === 'SIGNATURE').length : 0;

  const filteredFiles = selectedRecord ? selectedRecord.evidenceList.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(fileSearchQuery.toLowerCase()) || 
                          file.tag.toLowerCase().includes(fileSearchQuery.toLowerCase());
    
    if (fileCategoryFilter === 'ALL') return matchesSearch;
    if (fileCategoryFilter === 'IMAGE') return matchesSearch && (file.type === 'PHOTO' || file.type === 'IMAGE');
    if (fileCategoryFilter === 'PDF') return matchesSearch && (file.type === 'PDF DOC' || file.type === 'PDF');
    if (fileCategoryFilter === 'SIGNATURE') return matchesSearch && file.type === 'SIGNATURE';
    
    return matchesSearch;
  }) : [];

  // Conditional Sub-view for Evidence Management
  if (viewMode === 'evidence' && selectedRecord) {
    return (
      <div className="evidence-management-page flex flex-col justify-start items-start w-full relative bg-[#f5f7fa]" style={{ display: 'flex', flexDirection: 'column', gap: '0px', minHeight: '100vh' }}>
        <div className="flex flex-col-reverse justify-start items-start self-stretch flex-grow overflow-hidden" style={{ width: '100%' }}>
          
          {/* Content Pane */}
          <div className="flex flex-col justify-start items-start self-stretch flex-grow overflow-hidden gap-6 p-8" style={{ width: '100%' }}>
            
            {/* Header section (breadcrumbs and title) */}
            <div className="flex justify-between items-end self-stretch flex-grow-0 flex-shrink-0 pb-4" style={{ width: '100%' }}>
              <div className="flex flex-col justify-start items-start flex-grow-0 flex-shrink-0 relative gap-4">
                
                {/* Breadcrumbs */}
                <div className="flex justify-start items-center self-stretch flex-grow-0 flex-shrink-0 gap-2">
                  <p className="text-[10px] font-bold text-left uppercase text-[#002147]/50" style={{ margin: 0 }}>
                    ACADEMIC PORTAL
                  </p>
                  <svg width={4} height={6} viewBox="0 0 4 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.3 3L0 0.7L0.7 0L3.7 3L0.7 6L0 5.3L2.3 3Z" fill="#002147" fillOpacity="0.5" />
                  </svg>
                  
                  <p className="text-[10px] font-bold text-left uppercase text-[#002147]/50 cursor-pointer hover:text-[#c5a059]" onClick={() => setViewMode('list')} style={{ margin: 0 }}>
                    ETR LOGS
                  </p>
                  <svg width={4} height={6} viewBox="0 0 4 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.3 3L0 0.7L0.7 0L3.7 3L0.7 6L0 5.3L2.3 3Z" fill="#002147" fillOpacity="0.5" />
                  </svg>
                  
                  <p className="text-[10px] font-bold text-left uppercase text-[#c5a059]" style={{ margin: 0 }}>
                    EVIDENCE MANAGEMENT
                  </p>
                </div>

                {/* Main page titles */}
                <div className="flex items-baseline gap-2">
                  <h1 className="text-3xl font-bold text-left text-[#002147]" style={{ margin: 0, padding: 0, fontSize: '30px' }}>
                    Quản lý Minh chứng
                  </h1>
                  <span className="text-3xl italic text-left text-[#c5a059] font-light" style={{ fontSize: '30px' }}>
                    / Evidence Management
                  </span>
                </div>

                {/* Badge Info */}
                <div className="flex justify-start items-center self-stretch flex-grow-0 flex-shrink-0 gap-6">
                  <div className="flex justify-start items-center gap-2 px-4 py-2 rounded-lg bg-[#002147]/5 border border-[#002147]/10">
                    <p className="text-[10px] font-bold text-left uppercase text-[#002147]/60" style={{ margin: 0 }}>
                      ETR ID
                    </p>
                    <p className="text-sm font-bold text-left text-[#002147]" style={{ margin: 0 }}>
                      {selectedRecord.id}
                    </p>
                  </div>
                  <div className="flex justify-start items-center gap-2 px-4 py-2 rounded-lg bg-[#002147]/5 border border-[#002147]/10">
                    <p className="text-[10px] font-bold text-left uppercase text-[#002147]/60" style={{ margin: 0 }}>
                      HỌC VIÊN
                    </p>
                    <p className="text-sm font-bold text-left text-[#002147]" style={{ margin: 0 }}>
                      {selectedRecord.studentName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons (filter and upload) */}
              <div className="flex justify-start items-center gap-3">
                <div 
                  className="flex justify-start items-center gap-2 px-5 py-2.5 rounded-lg bg-white border-2 border-[#002147] cursor-pointer hover:bg-slate-50 transition"
                  onClick={() => setFileCategoryFilter(fileCategoryFilter === 'ALL' ? 'PDF' : fileCategoryFilter === 'PDF' ? 'IMAGE' : fileCategoryFilter === 'IMAGE' ? 'SIGNATURE' : 'ALL')}
                >
                  <svg width={14} height={9} viewBox="0 0 14 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.25 9V7.5H8.25V9H5.25ZM2.25 5.25V3.75H11.25V5.25H2.25ZM0 1.5V0H13.5V1.5H0Z" fill="#002147" />
                  </svg>
                  <p className="text-xs font-bold text-center uppercase text-[#002147]" style={{ margin: 0, lineHeight: 1.1 }}>
                    LỌC LOẠI: {fileCategoryFilter}
                  </p>
                </div>

                <div 
                  className="flex justify-start items-center gap-3 px-6 py-2.5 rounded-lg bg-[#002147] cursor-pointer hover:bg-[#002147]/90 transition"
                  onClick={() => {
                    setUploadFileName('');
                    setUploadFileType('PDF DOC');
                    setUploadFileTag(selectedRecord.course);
                    setIsEvidenceUploadOpen(true);
                  }}
                  style={{ minHeight: '44px' }}
                >
                  <svg width={12} height={12} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.25 9V2.8875L3.3 4.8375L2.25 3.75L6 0L9.75 3.75L8.7 4.8375L6.75 2.8875V9H5.25ZM1.5 12C1.0875 12 0.734375 11.8531 0.440625 11.5594C0.146875 11.2656 0 10.9125 0 10.5V8.25H1.5V10.5H10.5V8.25H12V10.5C12 10.9125 11.8531 11.2656 11.5594 11.5594C11.2656 11.8531 10.9125 12 10.5 12H1.5Z" fill="white" />
                  </svg>
                  <p className="text-xs font-bold text-center uppercase text-white" style={{ margin: 0, lineHeight: 1.1 }}>
                    TẢI LÊN EVIDENCE
                  </p>
                </div>
              </div>
            </div>

            {/* Filter toolbar card */}
            <div 
              className="flex justify-between items-center self-stretch flex-grow-0 flex-shrink-0 p-5 rounded-xl bg-white border border-slate-200"
              style={{ boxShadow: '0px 1px 2px 0 rgba(0,0,0,0.05)', width: '100%' }}
            >
              {/* Category tabs */}
              <div className="flex justify-start items-center gap-2">
                <div 
                  className={`flex flex-col justify-center items-center px-5 py-2 rounded-lg cursor-pointer transition ${fileCategoryFilter === 'ALL' ? 'bg-[#c5a059]' : 'bg-white border border-slate-200'}`}
                  onClick={() => setFileCategoryFilter('ALL')}
                >
                  <p className={`text-xs font-bold text-center uppercase ${fileCategoryFilter === 'ALL' ? 'text-[#002147]' : 'text-[#002147]/60'}`} style={{ margin: 0 }}>
                    TẤT CẢ ({totalCount})
                  </p>
                </div>
                <div 
                  className={`flex flex-col justify-center items-center px-5 py-2 rounded-lg cursor-pointer transition ${fileCategoryFilter === 'IMAGE' ? 'bg-[#c5a059]' : 'bg-white border border-slate-200'}`}
                  onClick={() => setFileCategoryFilter('IMAGE')}
                >
                  <p className={`text-xs font-bold text-center uppercase ${fileCategoryFilter === 'IMAGE' ? 'text-[#002147]' : 'text-[#002147]/60'}`} style={{ margin: 0 }}>
                    HÌNH ẢNH ({imgCount})
                  </p>
                </div>
                <div 
                  className={`flex flex-col justify-center items-center px-5 py-2 rounded-lg cursor-pointer transition ${fileCategoryFilter === 'PDF' ? 'bg-[#c5a059]' : 'bg-white border border-slate-200'}`}
                  onClick={() => setFileCategoryFilter('PDF')}
                >
                  <p className={`text-xs font-bold text-center uppercase ${fileCategoryFilter === 'PDF' ? 'text-[#002147]' : 'text-[#002147]/60'}`} style={{ margin: 0 }}>
                    TÀI LIỆU PDF ({pdfCount})
                  </p>
                </div>
                <div 
                  className={`flex flex-col justify-center items-center px-5 py-2 rounded-lg cursor-pointer transition ${fileCategoryFilter === 'SIGNATURE' ? 'bg-[#c5a059]' : 'bg-white border border-slate-200'}`}
                  onClick={() => setFileCategoryFilter('SIGNATURE')}
                >
                  <p className={`text-xs font-bold text-center uppercase ${fileCategoryFilter === 'SIGNATURE' ? 'text-[#002147]' : 'text-[#002147]/60'}`} style={{ margin: 0 }}>
                    CHỮ KÝ SỐ ({sigCount})
                  </p>
                </div>
              </div>

              {/* Search box */}
              <div className="flex justify-start items-center gap-4">
                <div className="relative">
                  <input
                    type="text"
                    className="pl-10 pr-4 py-2 w-72 rounded-lg bg-[#f5f7fa] border border-slate-200 text-sm focus:outline-none focus:border-[#c5a059] transition"
                    placeholder="Tìm kiếm tài liệu..."
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                  />
                  <div className="absolute left-3.5 top-2.5 text-[#002147]/40">
                    <svg width={16} height={16} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C0.629167 9.85417 0 8.31667 0 6.5C0 4.68333 0.629167 3.14583 1.8875 1.8875C3.14583 0.629167 4.68333 0 6.5 0C8.31667 0 9.85417 0.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z" fill="currentColor" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence List Grid Table */}
            <div 
              className="flex flex-col justify-start items-start self-stretch flex-grow-0 flex-shrink-0 overflow-hidden rounded-xl bg-white border border-slate-200"
              style={{ boxShadow: '0px 1px 2px 0 rgba(0,0,0,0.05)', width: '100%' }}
            >
              <div className="table-responsive-scroll" style={{ width: '100%' }}>
                {/* Table Header */}
                <div className="table-header evidence-table-grid bg-[#002147]/5 border-b border-slate-200" style={{ color: '#002147', fontWeight: 'bold' }}>
                  <div className="flex justify-start items-center">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 cursor-pointer rounded border-slate-300 accent-[#002147]"
                      checked={filteredFiles.length > 0 && selectedFiles.length === filteredFiles.length}
                      onChange={handleToggleSelectAll}
                    />
                  </div>
                  <div>PHÂN LOẠI</div>
                  <div>TÊN TẬP TIN</div>
                  <div>NGÀY TẢI</div>
                  <div style={{ textAlign: 'center' }}>TRẠNG THÁI</div>
                  <div style={{ textAlign: 'right', paddingRight: '24px' }}>THAO TÁC</div>
                </div>

                {/* Table Body */}
                <div className="table-body">
                  {filteredFiles.length > 0 ? (
                    filteredFiles.map((file, idx) => {
                      const isFileChecked = selectedFiles.includes(file.name);
                      return (
                        <div 
                          key={idx} 
                          className="table-row evidence-table-grid" 
                          style={{ borderTop: idx > 0 ? '1px solid #e2e8f0' : 'none', backgroundColor: isFileChecked ? 'rgba(197, 160, 89, 0.03)' : '#ffffff' }}
                        >
                          {/* Checkbox */}
                          <div className="flex justify-start items-center">
                            <input 
                              type="checkbox" 
                              className="w-5 h-5 cursor-pointer rounded border-slate-300 accent-[#002147]"
                              checked={isFileChecked}
                              onChange={(e) => handleToggleFileSelect(file.name, e)}
                            />
                          </div>

                          {/* Category Badge Column */}
                          <div className="flex justify-start items-center gap-3">
                            <div className={`flex justify-center items-center w-10 h-10 rounded-xl ${
                              file.type === 'PDF DOC' || file.type === 'PDF' ? 'bg-red-50 text-red-600' :
                              file.type === 'PHOTO' || file.type === 'IMAGE' ? 'bg-orange-50 text-orange-600' :
                              'bg-blue-50 text-blue-600'
                            }`} style={{ boxShadow: '0px 1px 2px 0 rgba(0,0,0,0.05)' }}>
                              {file.type === 'PDF DOC' || file.type === 'PDF' ? (
                                <svg width={18} height={18} viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M7 10.5H8V8.5H9C9.28333 8.5 9.52083 8.40417 9.7125 8.2125C9.90417 8.02083 10 7.78333 10 7.5V6.5C10 6.21667 9.90417 5.97917 9.7125 5.7875C9.52083 5.59583 9.28333 5.5 9 5.5H7V10.5ZM8 7.5V6.5H9V7.5H8ZM11 10.5H13C13.2833 10.5 13.5208 10.4042 13.7125 10.2125C13.9042 10.0208 14 9.78333 14 9.5V6.5C14 6.21667 13.9042 5.97917 13.7125 5.7875C13.5208 5.59583 13.2833 5.5 13 5.5H11V10.5ZM12 9.5V6.5H13V9.5H12ZM15 10.5H16V8.5H17V7.5H16V6.5H17V5.5H15V10.5ZM6 16C5.45 16 4.97917 15.8042 4.5875 15.4125C4.19583 15.0208 4 14.55 4 14V2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H6ZM6 14H18V2H6V14ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4H2V18H16V20H2ZM6 2V14V2Z" />
                                </svg>
                              ) : file.type === 'PHOTO' || file.type === 'IMAGE' ? (
                                <svg width={18} height={18} viewBox="0 0 18 18" fill="currentColor">
                                  <path d="M2 18C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0208 0 16.55 0 16V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H16C16.55 0 17.0208 0.195833 17.4125 0.5875C17.8042 0.979167 18 1.45 18 2V16C18 16.55 17.8042 17.0208 17.4125 17.4125C17.0208 17.8042 16.55 18 16 18H2ZM2 16H16V2H2V16ZM3 14H15L11.25 9L8.25 13L6 10L3 14ZM2 16V2V16Z" />
                                </svg>
                              ) : (
                                <svg width={18} height={18} viewBox="0 0 19 18" fill="currentColor">
                                  <path d="M1 18V13.75L14.175 0.6C14.375 0.4 14.6 0.25 14.85 0.15C15.1 0.05 15.35 0 15.6 0C15.8667 0 16.1208 0.05 16.3625 0.15C16.6042 0.25 16.8167 0.4 17 0.6L18.4 2C18.6 2.18333 18.75 2.39583 18.85 2.6375C18.95 2.87917 19 3.13333 19 3.4C19 3.65 18.95 3.9 18.85 4.15C18.75 4.4 18.6 4.625 18.4 4.825L5.25 18H1ZM3 16H4.4L14.225 6.2L13.525 5.475L12.8 4.775L3 14.6V16ZM17 3.425L15.575 2L17 3.425ZM13.525 5.475L12.8 4.775L14.225 6.2L13.525 5.475ZM11 18C12.2333 18 13.375 17.6917 14.425 17.075C15.475 16.4583 16 15.6 16 14.5C16 13.9 15.8417 13.3833 15.525 12.95C15.2083 12.5167 14.7833 12.1417 14.25 11.825L12.775 13.3C13.1583 13.4667 13.4583 13.65 13.675 13.85C13.8917 14.05 14 14.2667 14 14.5C14 14.8833 13.6958 15.2292 13.0875 15.5375C12.4792 15.8458 11.7833 16 11 16C10.7167 16 10.4792 16.0958 10.2875 16.2875C10.0958 16.4792 10 16.7167 10 17C10 17.2833 10.0958 17.5208 10.2875 17.7125C10.4792 17.9042 10.7167 18 11 18ZM1.575 10.35L3.075 8.85C2.74167 8.71667 2.47917 8.57917 2.2875 8.4375C2.09583 8.29583 2 8.15 2 8C2 7.8 2.15 7.6 2.45 7.4C2.75 7.2 3.38333 6.89167 4.35 6.475C5.81667 5.84167 6.79167 5.26667 7.275 4.75C7.75833 4.23333 8 3.65 8 3C8 2.08333 7.63333 1.35417 6.9 0.8125C6.16667 0.270833 5.2 0 4 0C3.25 0 2.57917 0.133333 1.9875 0.4C1.39583 0.666667 0.941667 0.991667 0.625 1.375C0.441667 1.59167 0.366667 1.83333 0.4 2.1C0.433333 2.36667 0.558333 2.58333 0.775 2.75C0.991667 2.93333 1.23333 3.00833 1.5 2.975C1.76667 2.94167 1.99167 2.83333 2.175 2.65C2.40833 2.41667 2.66667 2.25 2.95 2.15C3.23333 2.05 3.58333 2 4 2C4.68333 2 5.1875 2.1 5.5125 2.3C5.8375 2.5 6 2.73333 6 3C6 3.23333 5.85417 3.44583 5.5625 3.6375C5.27083 3.82917 4.6 4.16667 3.55 4.65C2.21667 5.23333 1.29167 5.7625 0.775 6.2375C0.258333 6.7125 0 7.3 0 8C0 8.53333 0.141667 8.9875 0.425 9.3625C0.708333 9.7375 1.09167 10.0667 1.575 10.35Z" />
                                </svg>
                              )}
                            </div>
                            <span className="text-xs font-bold text-[#002147]">
                              {file.type}
                            </span>
                          </div>

                          {/* File Name & Detail info */}
                          <div className="flex flex-col gap-1 pr-4">
                            <span className="text-sm font-bold text-[#002147] truncate" title={file.name}>
                              {file.name}
                            </span>
                            <span className="text-[10px] font-semibold text-[#002147]/40 uppercase truncate">
                              {file.size} • {file.tag}
                            </span>
                          </div>

                          {/* Date Uploaded */}
                          <div className="text-xs font-bold text-[#002147]">
                            {file.date}
                          </div>

                          {/* QA Status */}
                          <div className="flex items-center justify-center">
                            {file.status === 'Verified' ? (
                              <div className="flex justify-start items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
                                <svg width={10} height={10} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M4.3 7.3L7.825 3.775L7.125 3.075L4.3 5.9L2.875 4.475L2.175 5.175L4.3 7.3ZM5 10C4.30833 10 3.65833 9.86875 3.05 9.60625C2.44167 9.34375 1.9125 8.9875 1.4625 8.5375C1.0125 8.0875 0.65625 7.55833 0.39375 6.95C0.13125 6.34167 0 5.69167 0 5C0 4.30833 0.13125 3.65833 0.39375 3.05C0.65625 2.44167 1.0125 1.9125 1.4625 1.4625C1.9125 1.0125 2.44167 0.65625 3.05 0.39375C3.65833 0.13125 4.30833 0 5 0C5.69167 0 6.34167 0.13125 6.95 0.39375C7.55833 0.65625 8.0875 1.0125 8.5375 1.4625C8.9875 1.9125 9.34375 2.44167 9.60625 3.05C9.86875 3.65833 10 4.30833 10 5C10 5.69167 9.86875 6.34167 9.60625 6.95C9.34375 7.55833 8.9875 8.0875 8.5375 8.5375C8.0875 8.9875 7.55833 9.34375 6.95 9.60625C6.34167 9.86875 5.69167 10 5 10ZM5 9C6.11667 9 7.0625 8.6125 7.8375 7.8375C8.6125 7.0625 9 6.11667 9 5C9 3.88333 8.6125 2.9375 7.8375 2.1625C7.0625 1.3875 6.11667 1 5 1C3.88333 1 2.9375 1.3875 2.1625 2.1625C1.3875 2.9375 1 3.88333 1 5C1 6.11667 1.3875 7.0625 2.1625 7.8375C2.9375 8.6125 3.88333 9 5 9Z" fill="#15803D" />
                                </svg>
                                <span className="text-[11px] font-bold text-[#15803D] uppercase">Verified</span>
                              </div>
                            ) : file.status === 'Pending QA' ? (
                              <div className="flex justify-start items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                                <svg width={10} height={10} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M6.65 7.35L7.35 6.65L5.5 4.8V2.5H4.5V5.2L6.65 7.35ZM5 10C4.30833 10 3.65833 9.86875 3.05 9.60625C2.44167 9.34375 1.9125 8.9875 1.4625 8.5375C1.0125 8.0875 0.65625 7.55833 0.39375 6.95C0.13125 6.34167 0 5.69167 0 5C0 4.30833 0.13125 3.65833 0.39375 3.05C0.65625 2.44167 1.0125 1.9125 1.4625 1.4625C1.9125 1.0125 2.44167 0.65625 3.05 0.39375C3.65833 0.13125 4.30833 0 5 0C5.69167 0 6.34167 0.13125 6.95 0.39375C7.55833 0.65625 8.0875 1.0125 8.5375 1.4625C8.9875 1.9125 9.34375 2.44167 9.60625 3.05C9.86875 3.65833 10 4.30833 10 5C10 5.69167 9.86875 6.34167 9.60625 6.95C9.34375 7.55833 8.9875 8.0875 8.5375 8.5375C8.0875 8.9875 7.55833 9.34375 6.95 9.60625C6.34167 9.86875 5.69167 10 5 10ZM5 9C6.10833 9 7.05208 8.61042 7.83125 7.83125C8.61042 7.05208 9 6.10833 9 5C9 3.89167 8.61042 2.94792 7.83125 2.16875C7.05208 1.38958 6.10833 1 5 1C3.89167 1 2.94792 1.38958 2.16875 2.16875C1.38958 2.94792 1 3.89167 1 5C1 6.10833 1.38958 7.05208 2.16875 7.83125C2.94792 8.61042 3.89167 9 5 9Z" fill="#B45309" />
                                </svg>
                                <span className="text-[11px] font-bold text-[#B45309] uppercase">Pending QA</span>
                              </div>
                            ) : (
                              <div className="relative-tooltip-container flex items-center justify-center">
                                <div className="flex justify-start items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
                                  <svg width={10} height={10} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5 7.5C5.14167 7.5 5.26042 7.45208 5.35625 7.35625C5.45208 7.26042 5.5 7.14167 5.5 7C5.5 6.85833 5.45208 6.73958 5.35625 6.64375C5.26042 6.54792 5.14167 6.5 5 6.5C4.85833 6.5 4.73958 6.54792 4.64375 6.64375C4.54792 6.73958 4.5 6.85833 4.5 7C4.5 7.14167 4.54792 7.26042 4.64375 7.35625C4.73958 7.45208 4.85833 7.5 5 7.5ZM4.5 5.5H5.5V2.5H4.5V5.5ZM5 10C4.30833 10 3.65833 9.86875 3.05 9.60625C2.44167 9.34375 1.9125 8.9875 1.4625 8.5375C1.0125 8.0875 0.65625 7.55833 0.39375 6.95C0.13125 6.34167 0 5.69167 0 5C0 4.30833 0.13125 3.65833 0.39375 3.05C0.65625 2.44167 1.0125 1.9125 1.4625 1.4625C1.9125 1.0125 2.44167 0.65625 3.05 0.39375C3.65833 0.13125 4.30833 0 5 0C5.69167 0 6.34167 0.13125 6.95 0.39375C7.55833 0.65625 8.0875 1.0125 8.5375 1.4625C8.9875 1.9125 9.34375 2.44167 9.60625 3.05C9.86875 3.65833 10 4.30833 10 5C10 5.69167 9.86875 6.34167 9.60625 6.95C9.34375 7.55833 8.9875 8.0875 8.5375 8.5375C8.0875 8.9875 7.55833 9.34375 6.95 9.60625C6.34167 9.86875 5.69167 10 5 10ZM5 9C6.11667 9 7.0625 8.6125 7.8375 7.8375C8.6125 7.0625 9 6.11667 9 5C9 3.88333 8.6125 2.9375 7.8375 2.1625C7.0625 1.3875 6.11667 1 5 1C3.88333 1 2.9375 1.3875 2.1625 2.1625C1.3875 2.9375 1 3.88333 1 5C1 6.11667 1.3875 7.0625 2.1625 7.8375C2.9375 8.6125 3.88333 9 5 9Z" fill="#B91C1C" />
                                  </svg>
                                  <span className="text-[11px] font-bold text-[#B91C1C] uppercase">Rejected</span>
                                </div>
                                <div className="tooltip-card flex flex-col justify-start items-center p-3 rounded-lg bg-[#002147] border-b-4 border-[#c5a059] shadow-lg w-56">
                                  <p className="text-[11px] text-center text-white leading-normal" style={{ margin: 0 }}>
                                    Lý do: {file.rejectReason || 'Tập tin không đạt yêu cầu.'}
                                  </p>
                                  <div style={{
                                    width: 0,
                                    height: 0,
                                    borderLeft: '6px solid transparent',
                                    borderRight: '6px solid transparent',
                                    borderTop: '6px solid #002147',
                                    position: 'absolute',
                                    top: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)'
                                  }} />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Operations Column */}
                          <div className="flex justify-end items-center gap-3 pr-6">
                            <button 
                              type="button"
                              className="p-2 rounded-lg bg-[#f5f7fa] border border-slate-200 text-[#002147] hover:bg-slate-100 transition shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
                              onClick={() => setPreviewFile(file)}
                              title="Xem chi tiết"
                            >
                              <svg width={15} height={11} viewBox="0 0 19 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9.16667 10C10.2083 10 11.0938 9.63542 11.8229 8.90625C12.5521 8.17708 12.9167 7.29167 12.9167 6.25C12.9167 5.20833 12.5521 4.32292 11.8229 3.59375C11.0938 2.86458 10.2083 2.5 9.16667 2.5C8.125 2.5 7.23958 2.86458 6.51042 3.59375C5.78125 4.32292 5.41667 5.20833 5.41667 6.25C5.41667 7.29167 5.78125 8.17708 6.51042 8.90625C7.23958 9.63542 8.125 10 9.16667 10ZM9.16667 8.5C8.54167 8.5 8.01042 8.28125 7.57292 7.84375C7.13542 7.40625 6.91667 6.875 6.91667 6.25C6.91667 5.625 7.13542 5.09375 7.57292 4.65625C8.01042 4.21875 8.54167 4 9.16667 4C9.79167 4 10.3229 4.21875 10.7604 4.65625C11.1979 5.09375 11.4167 5.625 11.4167 6.25C11.4167 6.875 11.1979 7.40625 10.7604 7.84375C10.3229 8.28125 9.79167 8.5 9.16667 8.5ZM9.16667 12.5C7.13889 12.5 5.29167 11.934 3.625 10.8021C1.95833 9.67014 0.75 8.15278 0 6.25C0.75 4.34722 1.95833 2.82986 3.625 1.69792C5.29167 0.565972 7.13889 0 9.16667 0C11.1944 0 13.0417 0.565972 14.7083 1.69792C16.375 2.82986 17.5833 4.34722 18.3333 6.25C17.5833 8.15278 16.375 9.67014 14.7083 10.8021C13.0417 11.934 11.1944 12.5 9.16667 12.5ZM9.16667 10.8333C10.7361 10.8333 12.1771 10.4201 13.4896 9.59375C14.8021 8.76736 15.8056 7.65278 16.5 6.25C15.8056 4.84722 14.8021 3.73264 13.4896 2.90625C12.1771 2.07986 10.7361 1.66667 9.16667 1.66667C7.59722 1.66667 6.15625 2.07986 4.84375 2.90625C3.53125 3.73264 2.52778 4.84722 1.83333 6.25C2.52778 7.65278 3.53125 8.76736 4.84375 9.59375C6.15625 10.4201 7.59722 10.8333 9.16667 10.8333Z" fill="currentColor" />
                              </svg>
                            </button>
                            <button 
                              type="button"
                              className="p-2 rounded-lg bg-[#f5f7fa] border border-slate-200 text-[#002147] hover:bg-slate-100 transition shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
                              onClick={() => handleDownloadFile(file.name)}
                              title="Tải xuống"
                            >
                              <svg width={14} height={14} viewBox="0 0 14 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5.83333 14.1667H7.5V10.6875L8.83333 12.0208L10 10.8333L6.66667 7.5L3.33333 10.8333L4.52083 12L5.83333 10.6875V14.1667ZM1.66667 16.6667C1.20833 16.6667 0.815972 16.5035 0.489583 16.1771C0.163194 15.8507 0 15.4583 0 15V1.66667C0 1.20833 0.163194 0.815972 0.489583 0.489583C0.815972 0.163194 1.20833 0 1.66667 0H8.33333L13.3333 5V15C13.3333 15.4583 13.1701 15.8507 12.8438 16.1771C12.5174 16.5035 12.125 16.6667 11.6667 16.6667H1.66667ZM7.5 5.83333V1.66667H1.66667V15H11.6667V5.83333H7.5ZM1.66667 1.66667V5.83333V1.66667V5.83333V15V1.66667Z" fill="currentColor" fillOpacity="0.6" />
                              </svg>
                            </button>
                            <button 
                              type="button"
                              className="p-2 rounded-lg bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 transition shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
                              onClick={(e) => handleDeleteFile(file.name, e)}
                              title="Xóa minh chứng"
                            >
                              <svg width={12} height={14} viewBox="0 0 448 512" fill="currentColor" style={{ width: '12px', height: '12px' }}>
                                <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.2 0 46.2-19.7 47.9-45L416 128z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#64748b', backgroundColor: '#ffffff' }}>
                      Không tìm thấy tập tin minh chứng nào khớp với bộ lọc.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ETR evidence branding top header */}
          <div 
            className="flex justify-between items-center self-stretch flex-grow-0 flex-shrink-0 h-20 px-8 bg-white border-b border-slate-200" 
            style={{ width: '100%', borderBottom: '1px solid #e2e8f0' }}
          >
            <div className="flex justify-start items-center gap-3">
              <div className="flex justify-center items-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#c5a059] to-[#d4af37]" style={{ boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' }}>
                <svg width={18} height={18} viewBox="0 0 22 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.6 21L5.7 17.8L2.1 17L2.45 13.3L0 10.5L2.45 7.7L2.1 4L5.7 3.2L7.6 0L11 1.45L14.4 0L16.3 3.2L19.9 4L19.55 7.7L22 10.5L19.55 13.3L19.9 17L16.3 17.8L14.4 21L11 19.55L7.6 21ZM8.45 18.45L11 17.35L13.6 18.45L15 16.05L17.75 15.4L17.5 12.6L19.35 10.5L17.5 8.35L17.75 5.55L15 4.95L13.55 2.55L11 3.65L8.4 2.55L7 4.95L4.25 5.55L4.5 8.35L2.65 10.5L4.5 12.6L4.25 15.45L7 16.05L8.45 18.45ZM9.95 14.05L15.6 8.4L14.2 6.95L9.95 11.2L7.8 9.1L6.4 10.5L9.95 14.05Z" fill="#002147" />
                </svg>
              </div>
              <p className="text-sm font-bold text-left uppercase text-[#002147] tracking-wider" style={{ margin: 0 }}>
                EVIDENCE CERTIFICATION PORTAL
              </p>
            </div>
            
            <div className="flex justify-start items-center gap-6">
              <div className="flex justify-start items-center gap-4">
                <div style={{ textAlign: 'right' }}>
                  <p className="text-sm font-bold text-[#002147]" style={{ margin: 0 }}>Dr. Elena Sterling</p>
                  <p className="text-[10px] font-semibold text-[#c5a059]" style={{ margin: 0 }}>QUALITY ASSURANCE OFFICER</p>
                </div>
                <div className="flex justify-center items-center" style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#002147', color: '#c5a059', fontWeight: 'bold' }}>
                  ES
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Original ETR List View Return Statement
  return (
    <div className="etr-management-page etr-qa-shell flex flex-col justify-start items-start w-full relative bg-[#f4f7fa]">
      <div className="etr-qa-content flex flex-col justify-start items-start self-stretch flex-grow-0 flex-shrink-0 relative gap-6 p-8" style={{ width: '100%' }}>



      {/* Progress Steps Card */}
      {selectedRecord && (
        <section
          className="etr-qa-surface etr-qa-highlight flex flex-col justify-start items-center self-stretch flex-grow-0 flex-shrink-0 relative overflow-hidden gap-10 px-8 pt-8 pb-12 rounded-xl bg-white/95 border border-slate-200 backdrop-blur"
          style={{ boxShadow: '0px 4px 20px -2px rgba(0,33,71,0.05)' }}
        >
          <div className="flex justify-between items-center self-stretch flex-grow-0 flex-shrink-0" style={{ width: '100%' }}>
            <div className="flex flex-col justify-start items-start flex-grow-0 flex-shrink-0 gap-1">
              <div className="flex justify-start items-center self-stretch flex-grow-0 flex-shrink-0 relative gap-3">
                <svg width={25} height={23} viewBox="0 0 25 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.25 22.5V18.75H11.25V6.25H8.75V10H0V0H8.75V3.75H16.25V0H25V10H16.25V6.25H13.75V16.25H16.25V12.5H25V22.5H16.25ZM2.5 2.5V7.5V2.5ZM18.75 15V20V15ZM18.75 2.5V7.5V2.5ZM18.75 7.5H22.5V2.5H18.75V7.5ZM18.75 20H22.5V15H18.75V20ZM2.5 7.5H6.25V2.5H2.5V7.5Z" fill="#C5A059" />
                </svg>
                <p className="text-xl font-black text-left uppercase text-[#002147]" style={{ margin: 0 }}>
                  TIẾN ĐỘ HỒ SƠ ETR
                </p>
              </div>
              <p className="text-xs font-medium text-left text-slate-400" style={{ margin: 0 }}>
                Trạng thái kiểm duyệt hồ sơ đào tạo hiện hành của học viên <strong style={{ color: '#002147' }}>{selectedRecord.studentName}</strong>
              </p>
            </div>
            <div className="flex flex-col justify-start items-start relative px-6 py-2 rounded-lg bg-[#002147] border border-[#c5a059]/30">
              <p className="text-xs font-bold text-left text-[#c5a059]" style={{ margin: 0 }}>
                ID: {selectedRecord.id}
              </p>
            </div>
          </div>

          {/* Workflow Steps Line & Circles */}
          <div className="etr-workflow-container" style={{ position: 'relative', width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '16px', margin: '20px 0 0' }}>
            <div className="etr-workflow-line-bg" style={{ position: 'absolute', top: '24px', left: '48px', right: '48px', height: '2px', backgroundColor: '#e2e8f0' }}>
              <div
                className="etr-workflow-line-fill"
                style={{
                  height: '100%',
                  width: selectedRecord.status === 'APPROVED' ? '100%' : selectedRecord.status === 'PENDING QA' ? '66%' : '33%',
                  background: 'linear-gradient(90deg, #c5a059, #d4af37)',
                  boxShadow: '0px 0px 10px rgba(197, 160, 89, 0.5)'
                }}
              />
            </div>

            <div className="etr-workflow-steps" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
              {/* Step 1 */}
              <div className="workflow-step" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className="step-circle completed" style={{ width: '48px', height: '48px', borderRadius: '12px', border: '2px solid #c5a059', backgroundColor: '#002147', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: '#c5a059' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0Z" fill="currentColor" />
                  </svg>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '900', color: '#002147' }}>HỒ SƠ CÁ NHÂN</span>
              </div>

              {/* Step 2 */}
              <div className="workflow-step" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className={`step-circle ${selectedRecord.steps.attendance ? 'completed' : 'pending'}`} style={{ width: '48px', height: '48px', borderRadius: '12px', border: `2px solid ${selectedRecord.steps.attendance ? '#c5a059' : '#e2e8f0'}`, backgroundColor: selectedRecord.steps.attendance ? '#002147' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedRecord.steps.attendance ? '#c5a059' : '#cbd5e1' }}>
                  <svg width="20" height="17" viewBox="0 0 20 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 16V13.2C0 12.65 0.141667 12.1333 0.425 11.65C0.708333 11.1667 1.1 10.8 1.6 10.55C2.45 10.1167 3.40833 9.75 4.475 9.45C5.54167 9.15 6.71667 9 8 9C8.5 9 8.9875 9.025 9.4625 9.075C9.9375 9.125 10.4 9.2 10.85 9.3L9.1 11.05C8.91667 11.0167 8.7375 11 8.5625 11C8.3875 11 8.2 11 8 11C6.81667 11 5.75417 11.1417 4.8125 11.425C3.87083 11.7083 3.1 12.0167 2.5 12.35C2.35 12.4333 2.22917 12.55 2.1375 12.7C2.04583 12.85 2 13.0167 2 13.2V14H8.25L10.25 16H0ZM13.55 16.4L10.1 12.95L11.5 11.55L13.55 13.6L18.6 8.55L20 9.95L13.55 16.4ZM8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM8 6C8.55 6 9.02083 5.80417 9.4125 5.4125C9.80417 5.02083 10 4.55 10 4C10 3.45 9.80417 2.97917 9.4125 2.5875C9.02083 2.19583 8.55 2 8 2C7.45 2 6.97917 2.19583 6.5875 2.5875C6.19583 2.97917 6 3.45 6 4C6 4.55 6.19583 5.02083 6.5875 5.4125C6.97917 5.80417 7.45 6 8 6Z" fill="currentColor" />
                  </svg>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '900', color: selectedRecord.steps.attendance ? '#002147' : '#94a3b8' }}>ĐIỂM DANH</span>
              </div>

              {/* Step 3 */}
              <div className="workflow-step" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className={`step-circle ${selectedRecord.steps.results ? 'completed' : 'pending'}`} style={{ width: '48px', height: '48px', borderRadius: '12px', border: `2px solid ${selectedRecord.steps.results ? '#c5a059' : '#e2e8f0'}`, backgroundColor: selectedRecord.steps.results ? '#002147' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedRecord.steps.results ? '#c5a059' : '#cbd5e1' }}>
                  <svg width="20" height="19" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.85 14.825L10 12.925L13.15 14.85L12.325 11.25L15.1 8.85L11.45 8.525L10 5.125L8.55 8.5L4.9 8.825L7.675 11.25L6.85 14.825ZM3.825 19L5.45 11.975L0 7.25L7.2 6.625L10 0L12.8 6.625L20 7.25L14.55 11.975L16.175 19L10 15.275L3.825 19Z" fill="currentColor" />
                  </svg>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '900', color: selectedRecord.steps.results ? '#002147' : '#94a3b8' }}>KẾT QUẢ</span>
              </div>

              {/* Step 4 */}
              <div className="workflow-step" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className={`step-circle ${selectedRecord.steps.evidence ? 'completed' : 'pending'}`} style={{ width: '48px', height: '48px', borderRadius: '12px', border: `2px solid ${selectedRecord.steps.evidence ? '#c5a059' : '#e2e8f0'}`, backgroundColor: selectedRecord.steps.evidence ? '#002147' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedRecord.steps.evidence ? '#c5a059' : '#cbd5e1' }}>
                  <svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.6 12.7L12.9 10.95L15.2 12.7L14.35 9.85L16.65 8H13.8L12.9 5.2L12 8H9.15L11.45 9.85L10.6 12.7ZM2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H8L10 2H18C18.55 2 19.0208 2.19583 19.4125 2.5875C19.8042 2.97917 20 3.45 20 4V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H2ZM2 14H18V4H9.175L7.175 2H2V14ZM2 14V2V4V14Z" fill="currentColor" />
                  </svg>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '900', color: selectedRecord.steps.evidence ? '#002147' : '#94a3b8' }}>MINH CHỨNG</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ETR Table List Section */}
      <section
        className="etr-qa-surface etr-qa-list-card flex flex-col justify-start items-start self-stretch flex-grow-0 flex-shrink-0 overflow-hidden rounded-xl bg-white border border-slate-200"
        style={{ boxShadow: '0px 1px 2px 0 rgba(0,0,0,0.05)' }}
      >
        <div className="flex justify-between items-center self-stretch flex-grow-0 flex-shrink-0 p-6 bg-slate-50/50 border-t-0 border-r-0 border-b border-l-0 border-slate-200" style={{ width: '100%' }}>
          <div className="flex justify-start items-center flex-grow-0 flex-shrink-0 gap-4">
            <p className="text-lg font-bold text-left uppercase text-[#002147]" style={{ margin: 0 }}>
              DANH SÁCH HỒ SƠ ĐÀO TẠO ĐIỆN TỬ
            </p>
            <div className="flex flex-col justify-start items-start px-3 py-1 rounded-md bg-[#002147]">
              <p className="text-[10px] font-black text-left uppercase text-[#c5a059]" style={{ margin: 0 }}>
                {etrRecords.length} HỒ SƠ
              </p>
            </div>
          </div>

          <div className="flex justify-start items-start gap-3">
            <div className="search-box" style={{ marginRight: '8px' }}>
              <input
                type="text"
                className="search-input"
                style={{ width: '220px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                placeholder="Tìm ETR, học viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex justify-start items-center relative gap-2 px-5 py-2.5 rounded-lg border border-slate-200 cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'ALL' ? 'APPROVED' : statusFilter === 'APPROVED' ? 'PENDING QA' : statusFilter === 'PENDING QA' ? 'UNDER REVIEW' : 'ALL')}>
              <svg width={14} height={9} viewBox="0 0 14 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.25 9V7.5H8.25V9H5.25ZM2.25 5.25V3.75H11.25V5.25H2.25ZM0 1.5V0H13.5V1.5H0Z" fill="#002147" />
              </svg>
              <p className="text-xs font-bold text-center uppercase text-[#002147]" style={{ margin: 0 }}>
                LỌC: {statusFilter}
              </p>
            </div>
            <div
              className="flex justify-start items-center relative gap-2 px-6 py-[11px] rounded-lg cursor-pointer"
              style={{ background: 'linear-gradient(166.97deg, #c5a059 -63.79%, #d4af37 163.79%)' }}
              onClick={() => setIsCreateOpen(true)}
            >
              <svg width={11} height={11} viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.5 6H0V4.5H4.5V0H6V4.5H10.5V6H6V10.5H4.5V6Z" fill="#002147" />
              </svg>
              <p className="text-xs font-black text-center uppercase text-[#002147]" style={{ margin: 0 }}>
                TẠO MỚI ETR
              </p>
            </div>
          </div>
        </div>

        {/* ETR Grid Table */}
        <div className="table-responsive-scroll" style={{ width: '100%' }}>
          <div className="table-header etr-table-grid" style={{ minWidth: '1000px' }}>
            <div>MÃ HỒ SƠ</div>
            <div>HỌC VIÊN</div>
            <div>KHÓA HỌC</div>
            <div>TRẠNG THÁI</div>
            <div>CẬP NHẬT</div>
            <div style={{ textAlign: 'right', paddingRight: '24px' }}>THAO TÁC</div>
          </div>

          <div className="table-body" style={{ minWidth: '1000px' }}>
            {filteredRecords.map((record) => {
              const isSelected = selectedRecord?.id === record.id;
              return (
                <div
                  key={record.id}
                  className={`table-row etr-table-grid ${isSelected ? 'selected-etr-row' : ''}`}
                  onClick={() => handleSelectRecord(record)}
                  style={{ cursor: 'pointer', borderLeft: isSelected ? '4px solid #c5a059' : 'none' }}
                >
                  <div className="col-code" style={{ fontWeight: '700', color: '#002147' }}>{record.id}</div>
                  <div className="col-name" style={{ fontWeight: '600' }}>
                    {record.studentName}
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>{record.studentCode}</div>
                  </div>
                  <div className="col-course" style={{ fontStyle: 'italic', color: '#475569' }}>{record.course}</div>
                  <div className="col-status-badge">
                    <span className={`class-status ${
                      record.status === 'APPROVED' ? 'status-active' :
                      record.status === 'PENDING QA' ? 'status-pending' : 'status-completed'
                    }`} style={{
                      backgroundColor: record.status === 'APPROVED' ? '#dcfce7' : record.status === 'PENDING QA' ? '#fef3c7' : '#f1f5f9',
                      border: record.status === 'APPROVED' ? '1px solid #bbf7d0' : record.status === 'PENDING QA' ? '1px solid #fde68a' : '1px solid #e2e8f0',
                      color: record.status === 'APPROVED' ? '#15803d' : record.status === 'PENDING QA' ? '#d97706' : '#475569',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '900'
                    }}>
                      {record.status}
                    </span>
                  </div>
                  <div className="col-updated" style={{ fontSize: '12px', color: '#64748b' }}>{record.lastUpdated}</div>
                  <div className="col-actions !flex !min-w-0 !flex-row !flex-wrap !items-center !justify-start !gap-2 !pr-0 xl:!justify-end">
                    <button
                      className="outline-btn font-gold-btn !inline-flex !h-9 !w-9 !shrink-0 !items-center !justify-center !gap-0 !rounded-full !border !border-amber-300/60 !bg-white !px-0 !py-0 !text-amber-600 !shadow-sm !transition hover:-translate-y-0.5 hover:!border-amber-400 xl:!w-auto xl:!gap-2 xl:!px-3 xl:!py-2.5"
                      type="button"
                      onClick={(e) => handleOpenEvidence(record, e)}
                      aria-label="Mở minh chứng"
                    >
                      <svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1.33333 12C0.966667 12 0.652778 11.8694 0.391667 11.6083C0.130556 11.3472 0 11.0333 0 10.6667V1.33333C0 0.966667 0.130556 0.652778 0.391667 0.391667C0.652778 0.130556 0.966667 0 1.33333 0H12C12.3667 0 12.6806 0.130556 12.9417 0.391667C13.2028 0.652778 13.3333 0.966667 13.3333 1.33333V10.6667C13.3333 11.0333 13.2028 11.3472 12.9417 11.6083C12.6806 11.8694 12.3667 12 12 12H1.33333ZM1.33333 10.6667H12V1.33333H1.33333V10.6667Z" fill="currentColor" />
                      </svg>
                      <span className="sr-only xl:not-sr-only xl:whitespace-nowrap xl:text-[10px] xl:font-semibold xl:leading-none">MINH CHỨNG</span>
                    </button>
                    <button
                      className="create-btn gold-gradient-btn !inline-flex !h-9 !w-9 !shrink-0 !items-center !justify-center !gap-0 !rounded-full !border-0 !bg-[#002147] !px-0 !py-0 !text-[#c5a059] !shadow-sm !transition hover:-translate-y-0.5 hover:!bg-[#003366] xl:!w-auto xl:!gap-2 xl:!px-3 xl:!py-2.5"
                      type="button"
                      onClick={(e) => handleOpenFinalView(record, e)}
                      aria-label="Xem final"
                    >
                      <svg width="14" height="10" viewBox="0 0 15 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.33333 8C8.16667 8 8.875 7.70833 9.45833 7.125C10.0417 6.54167 10.3333 5.83333 10.3333 5C10.3333 4.16667 10.0417 3.45833 9.45833 2.875C8.875 2.29167 8.16667 2 7.33333 2C6.5 2 5.79167 2.29167 5.20833 2.875C4.625 3.45833 4.33333 4.16667 4.33333 5C4.33333 5.83333 4.625 6.54167 5.20833 7.125C5.79167 7.70833 6.5 8 7.33333 8ZM7.33333 10C5.71111 10 4.23333 9.54722 2.9 8.64167C1.56667 7.73611 0.6 6.52222 0 5C0.6 3.47778 1.56667 2.26389 2.9 1.35833C4.23333 0.452778 5.71111 0 7.33333 0C8.95556 0 10.4333 0.452778 11.7667 1.35833C13.1 2.26389 14.0667 3.47778 14.6667 5C14.0667 6.52222 13.1 7.73611 11.7667 8.64167C10.4333 9.54722 8.95556 10 7.33333 10Z" fill="#c5a059" />
                      </svg>
                      <span className="sr-only xl:not-sr-only xl:whitespace-nowrap xl:text-[10px] xl:font-semibold xl:leading-none xl:text-[#c5a059]">VIEW FINAL</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom Section: Audit Trail table */}
      <section
        className="etr-qa-surface etr-qa-list-card flex flex-col justify-start items-start self-stretch flex-grow-0 flex-shrink-0 overflow-hidden rounded-xl bg-white border border-slate-200"
        style={{ boxShadow: '0px 1px 2px 0 rgba(0,0,0,0.05)' }}
      >
        <div className="flex justify-start items-center self-stretch flex-grow-0 flex-shrink-0 gap-3 p-5 bg-slate-50/50 border-t-0 border-r-0 border-b border-l-0 border-slate-200" style={{ width: '100%' }}>
          <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18C6.7 18 4.69583 17.2375 2.9875 15.7125C1.27917 14.1875 0.3 12.2833 0.05 10H2.1C2.33333 11.7333 3.10417 13.1667 4.4125 14.3C5.72083 15.4333 7.25 16 9 16C10.95 16 12.6042 15.3208 13.9625 13.9625C15.3208 12.6042 16 10.95 16 9C16 7.05 15.3208 5.39583 13.9625 4.0375C12.6042 2.67917 10.95 2 9 2C7.85 2 6.775 2.26667 5.775 2.8C4.775 3.33333 3.93333 4.06667 3.25 5H6V7H0V1H2V3.35C2.85 2.28333 3.8875 1.45833 5.1125 0.875C6.3375 0.291667 7.63333 0 9 0C10.25 0 11.4208 0.2375 12.5125 0.7125C13.6042 1.1875 14.5542 1.82917 15.3625 2.6375C16.1708 3.44583 16.8125 4.39583 17.2875 5.4875C17.7625 6.57917 18 7.75 18 9C18 10.25 17.7625 11.4208 17.2875 12.5125C16.8125 13.6042 16.1708 14.5542 15.3625 15.3625C14.5542 16.1708 13.6042 16.8125 12.5125 17.2875C11.4208 17.7625 10.25 18 9 18ZM11.8 13.2L8 9.4V4H10V8.6L13.2 11.8L11.8 13.2Z" fill="#C5A059" />
          </svg>
          <p className="text-sm font-black text-left uppercase text-[#002147]" style={{ margin: 0 }}>
            AUDIT TRAIL (LỊCH SỬ THAO TÁC)
          </p>
        </div>

        <div className="table-responsive-scroll" style={{ width: '100%' }}>
          {/* Audit header */}
          <div className="table-header audit-table-grid" style={{ minWidth: '800px', backgroundColor: '#002147', color: '#ffffff' }}>
            <div>THỜI GIAN</div>
            <div>NGƯỜI THỰC HIỆN</div>
            <div>HÀNH ĐỘNG</div>
            <div>NỘI DUNG THAY ĐỔI</div>
          </div>

          <div className="table-body" style={{ minWidth: '800px' }}>
            {auditTrail.map((log, idx) => (
              <div key={idx} className="table-row audit-table-grid">
                <div style={{ fontSize: '12px', color: '#64748b' }}>{log.time}</div>
                <div style={{ fontWeight: '700', color: '#002147' }}>{log.actor}</div>
                <div>
                  <span className={`class-status ${
                    log.action === 'UPDATE' ? 'status-active' : 'status-pending'
                  }`} style={{
                    backgroundColor: log.action === 'UPDATE' ? '#eff6ff' : '#fef3c7',
                    border: log.action === 'UPDATE' ? '1px solid #dbeafe' : '1px solid #fde68a',
                    color: log.action === 'UPDATE' ? '#1d4ed8' : '#d97706',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontWeight: '900'
                  }}>
                    {log.action}
                  </span>
                </div>
                <div style={{ color: '#475569', fontSize: '13px' }}>{log.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal - Tạo mới ETR */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ width: '600px' }}>
            <header className="modal-header">
              <h2>TẠO MỚI HỒ SƠ ETR</h2>
              <button className="close-btn" type="button" onClick={() => setIsCreateOpen(false)} aria-label="Đóng">
                &times;
              </button>
            </header>

            <form onSubmit={handleCreateEtr}>
              <div className="modal-body" style={{ padding: '24px' }}>
                <div className="form-group">
                  <label htmlFor="etr-student-name">Tên học viên</label>
                  <input
                    id="etr-student-name"
                    type="text"
                    placeholder="Ví dụ: Nguyễn Văn Bình"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row" style={{ marginTop: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="etr-student-code">Mã học viên</label>
                    <input
                      id="etr-student-code"
                      type="text"
                      placeholder="Ví dụ: AM-2409-005"
                      value={newStudentCode}
                      onChange={(e) => setNewStudentCode(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="etr-course-select">Khóa học đào tạo</label>
                    <select
                      id="etr-course-select"
                      value={newCourse}
                      onChange={(e) => setNewCourse(e.target.value)}
                      required
                    >
                      <option value="Propulsion Systems">Propulsion Systems</option>
                      <option value="Propulsion Systems & Engines">Propulsion Systems &amp; Engines</option>
                      <option value="A320 Maintenance Basics">A320 Maintenance Basics</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label htmlFor="etr-status-select">Trạng thái phê duyệt ban đầu</label>
                  <select
                    id="etr-status-select"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    required
                  >
                    <option value="UNDER REVIEW">UNDER REVIEW</option>
                    <option value="PENDING QA">PENDING QA</option>
                    <option value="APPROVED">APPROVED</option>
                  </select>
                </div>
              </div>

              <footer className="modal-footer">
                <button className="modal-cancel-btn" type="button" onClick={() => setIsCreateOpen(false)}>
                  Hủy bỏ
                </button>
                <button className="modal-submit-btn" type="submit">
                  Khởi tạo ETR
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Upload Evidence */}
      {isEvidenceUploadOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ width: '550px' }}>
            <header className="modal-header">
              <h2>Tải lên Minh chứng mới</h2>
              <button className="close-btn" type="button" onClick={() => setIsEvidenceUploadOpen(false)} aria-label="Đóng">
                &times;
              </button>
            </header>

            <form onSubmit={handleUploadEvidence}>
              <div className="modal-body" style={{ padding: '24px' }}>
                <div className="form-group">
                  <label htmlFor="upload-file-name">Tên tập tin</label>
                  <input
                    id="upload-file-name"
                    type="text"
                    placeholder="Ví dụ: Bao-Cao-Mon-Hoc.pdf"
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row" style={{ marginTop: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="upload-file-type">Phân loại</label>
                    <select
                      id="upload-file-type"
                      value={uploadFileType}
                      onChange={(e) => setUploadFileType(e.target.value)}
                      required
                    >
                      <option value="PDF DOC">PDF DOC (Tài liệu)</option>
                      <option value="PHOTO">PHOTO (Hình ảnh)</option>
                      <option value="SIGNATURE">SIGNATURE (Chữ ký số)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="upload-file-size">Dung lượng</label>
                    <input
                      id="upload-file-size"
                      type="text"
                      placeholder="Ví dụ: 1.5 MB"
                      value={uploadFileSize}
                      onChange={(e) => setUploadFileSize(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label htmlFor="upload-file-tag">Lĩnh vực / Nhãn (Tag)</label>
                  <input
                    id="upload-file-tag"
                    type="text"
                    placeholder="Ví dụ: AEROSPACE STRUCTURAL ANALYSIS"
                    value={uploadFileTag}
                    onChange={(e) => setUploadFileTag(e.target.value)}
                    required
                  />
                </div>
              </div>

              <footer className="modal-footer">
                <button className="modal-cancel-btn" type="button" onClick={() => setIsEvidenceUploadOpen(false)}>
                  Hủy bỏ
                </button>
                <button className="modal-submit-btn" type="submit">
                  Tải lên minh chứng
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal - File Preview */}
      {previewFile && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ width: '650px', maxWidth: '95%' }}>
            <header className="modal-header">
              <h2>XEM TRƯỚC TÀI LIỆU MINH CHỨNG</h2>
              <button className="close-btn" type="button" onClick={() => setPreviewFile(null)} aria-label="Đóng">
                &times;
              </button>
            </header>

            <div className="modal-body" style={{ padding: '24px', backgroundColor: '#f8fafc' }}>
              {/* File Info Header */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm" style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                <div className={`flex justify-center items-center w-12 h-12 rounded-xl flex-shrink-0 ${
                  previewFile.type === 'PDF DOC' || previewFile.type === 'PDF' ? 'bg-red-50 text-red-600' :
                  previewFile.type === 'PHOTO' || previewFile.type === 'IMAGE' ? 'bg-orange-50 text-orange-600' :
                  'bg-blue-50 text-blue-600'
                }`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {previewFile.type === 'PDF DOC' || previewFile.type === 'PDF' ? (
                    <svg width={24} height={24} viewBox="0 0 20 20" fill="currentColor">
                      <path d="M7 10.5H8V8.5H9C9.28333 8.5 9.52083 8.40417 9.7125 8.2125C9.90417 8.02083 10 7.78333 10 7.5V6.5C10 6.21667 9.90417 5.97917 9.7125 5.7875C9.52083 5.59583 9.28333 5.5 9 5.5H7V10.5ZM8 7.5V6.5H9V7.5H8ZM11 10.5H13C13.2833 10.5 13.5208 10.4042 13.7125 10.2125C13.9042 10.0208 14 9.78333 14 9.5V6.5C14 6.21667 13.9042 5.97917 13.7125 5.7875C13.5208 5.59583 13.2833 5.5 13 5.5H11V10.5ZM12 9.5V6.5H13V9.5H12ZM15 10.5H16V8.5H17V7.5H16V6.5H17V5.5H15V10.5ZM6 16C5.45 16 4.97917 15.8042 4.5875 15.4125C4.19583 15.0208 4 14.55 4 14V2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H6ZM6 14H18V2H6V14ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4H2V18H16V20H2ZM6 2V14V2Z" />
                    </svg>
                  ) : previewFile.type === 'PHOTO' || previewFile.type === 'IMAGE' ? (
                    <svg width={24} height={24} viewBox="0 0 18 18" fill="currentColor">
                      <path d="M2 18C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0208 0 16.55 0 16V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H16C16.55 0 17.0208 0.195833 17.4125 0.5875C17.8042 0.979167 18 1.45 18 2V16C18 16.55 17.8042 17.4125 17.4125 17.4125C17.0208 17.8042 16.55 18 16 18H2ZM2 16H16V2H2V16ZM3 14H15L11.25 9L8.25 13L6 10L3 14ZM2 16V2V16Z" />
                    </svg>
                  ) : (
                    <svg width={24} height={24} viewBox="0 0 19 18" fill="currentColor">
                      <path d="M1 18V13.75L14.175 0.6C14.375 0.4 14.6 0.25 14.85 0.15C15.1 0.05 15.35 0 15.6 0C15.8667 0 16.1208 0.05 16.3625 0.15C16.6042 0.25 16.8167 0.4 17 0.6L18.4 2C18.6 2.18333 18.75 2.39583 18.85 2.6375C18.95 2.87917 19 3.13333 19 3.4C19 3.65 18.95 3.9 18.85 4.15C18.75 4.4 18.6 4.625 18.4 4.825L5.25 18H1ZM3 16H4.4L14.225 6.2L13.525 5.475L12.8 4.775L3 14.6V16ZM17 3.425L15.575 2L17 3.425ZM13.525 5.475L12.8 4.775L14.225 6.2L13.525 5.475ZM11 18C12.2333 18 13.375 17.6917 14.425 17.075C15.475 16.4583 16 15.6 16 14.5C16 13.9 15.8417 13.3833 15.525 12.95C15.2083 12.5167 14.7833 12.1417 14.25 11.825L12.775 13.3C13.1583 13.4667 13.4583 13.65 13.675 13.85C13.8917 14.05 14 14.2667 14 14.5C14 14.8833 13.6958 15.2292 13.0875 15.5375C12.4792 15.8458 11.7833 16 11 16C10.7167 16 10.4792 16.0958 10.2875 16.2875C10.0958 16.4792 10 16.7167 10 17C10 17.2833 10.0958 17.5208 10.2875 17.7125C10.4792 17.9042 10.7167 18 11 18ZM1.575 10.35L3.075 8.85C2.74167 8.71667 2.47917 8.57917 2.2875 8.4375C2.09583 8.29583 2 8.15 2 8C2 7.8 2.15 7.6 2.45 7.4C2.75 7.2 3.38333 6.89167 4.35 6.475C5.81667 5.84167 6.79167 5.26667 7.275 4.75C7.75833 4.23333 8 3.65 8 3C8 2.08333 7.63333 1.35417 6.9 0.8125C6.16667 0.270833 5.2 0 4 0C3.25 0 2.57917 0.133333 1.9875 0.4C1.39583 0.666667 0.941667 0.991667 0.625 1.375C0.441667 1.59167 0.366667 1.83333 0.4 2.1C0.433333 2.36667 0.558333 2.58333 0.775 2.75C0.991667 2.93333 1.23333 3.00833 1.5 2.975C1.76667 2.94167 1.99167 2.83333 2.175 2.65C2.40833 2.41667 2.66667 2.25 2.95 2.15C3.23333 2.05 3.58333 2 4 2C4.68333 2 5.1875 2.1 5.5125 2.3C5.8375 2.5 6 2.73333 6 3C6 3.23333 5.85417 3.44583 5.5625 3.6375C5.27083 3.82917 4.6 4.16667 3.55 4.65C2.21667 5.23333 1.29167 5.7625 0.775 6.2375C0.258333 6.7125 0 7.3 0 8C0 8.53333 0.141667 8.9875 0.425 9.3625C0.708333 9.7375 1.09167 10.0667 1.575 10.35Z" />
                    </svg>
                  )}
                </div>
                <div style={{ flexGrow: 1, minWidth: 0, paddingLeft: '16px' }}>
                  <h3 className="text-base font-bold text-[#002147] truncate" style={{ margin: 0 }} title={previewFile.name}>{previewFile.name}</h3>
                  <p className="text-xs text-[#002147]/60 font-semibold uppercase mt-0.5" style={{ margin: 0 }}>{previewFile.size} • {previewFile.tag}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className={`inline-block px-3 py-1 rounded text-xs font-black ${
                    previewFile.status === 'Verified' ? 'bg-green-100 text-green-800' :
                    previewFile.status === 'Pending QA' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {previewFile.status.toUpperCase()}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold" style={{ margin: 0 }}>{previewFile.date}</p>
                </div>
              </div>

              {/* QA Rejection Reason Box */}
              {previewFile.status === 'Rejected' && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col gap-1.5 shadow-sm" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
                  <h4 className="text-xs font-black text-red-800 uppercase tracking-wide" style={{ margin: 0 }}>Lý do từ chối (QA Rejection Reason)</h4>
                  <p className="text-xs text-red-700 font-medium leading-relaxed" style={{ margin: 0 }}>
                    {previewFile.rejectReason || 'Hình ảnh mờ, không rõ chữ ký hoặc thông tin không trùng khớp.'}
                  </p>
                </div>
              )}

              {/* Stylized Visual Mockup Document Box */}
              <div className="flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 shadow-inner p-6 min-h-[300px] relative overflow-hidden" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifycontent: 'center', minHeight: '300px', marginTop: '16px' }}>
                {/* PDF DOC Visual View */}
                {(previewFile.type === 'PDF DOC' || previewFile.type === 'PDF') && (
                  <div className="w-full max-w-[400px] border border-slate-200 rounded-lg shadow bg-slate-50 flex flex-col" style={{ minHeight: '260px', display: 'flex', flexDirection: 'column' }}>
                    <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center justify-between px-4 rounded-t-lg" style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center', height: '40px', padding: '0 16px' }}>
                      <span className="text-[11px] font-bold text-slate-500">Document Reader v2.0</span>
                      <span className="text-[10px] font-bold text-slate-400">Page 1 / 1</span>
                    </div>
                    <div className="p-6 flex-grow flex flex-col gap-4 bg-white" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', flexGrow: 1 }}>
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-3" style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                        <svg width={32} height={32} viewBox="0 0 20 20" fill="currentColor" className="text-red-500">
                          <path d="M7 10.5H8V8.5H9C9.28333 8.5 9.52083 8.40417 9.7125 8.2125C9.90417 8.02083 10 7.78333 10 7.5V6.5C10 6.21667 9.90417 5.97917 9.7125 5.7875C9.52083 5.59583 9.28333 5.5 9 5.5H7V10.5ZM8 7.5V6.5H9V7.5H8ZM11 10.5H13C13.2833 10.5 13.5208 10.4042 13.7125 10.2125C13.9042 10.0208 14 9.78333 14 9.5V6.5C14 6.21667 13.9042 5.97917 13.7125 5.7875C13.5208 5.59583 13.2833 5.5 13 5.5H11V10.5ZM12 9.5V6.5H13V9.5H12ZM15 10.5H16V8.5H17V7.5H16V6.5H17V5.5H15V10.5ZM6 16C5.45 16 4.97917 15.8042 4.5875 15.4125C4.19583 15.0208 4 14.55 4 14V2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H6ZM6 14H18V2H6V14ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4H2V18H16V20H2ZM6 2V14V2Z" />
                        </svg>
                        <div>
                          <div className="text-xs font-bold text-slate-800">ETR TRAINING SYSTEM</div>
                          <div className="text-[10px] font-bold text-slate-400" style={{ margin: 0 }}>OFFICIAL TRAINING RECORD</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="h-3 w-3/4 bg-slate-100 rounded" style={{ height: '12px', width: '75%', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
                        <div className="h-3 w-5/6 bg-slate-100 rounded" style={{ height: '12px', width: '83.33%', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
                        <div className="h-3 w-2/3 bg-slate-100 rounded" style={{ height: '12px', width: '66.67%', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
                        <div className="h-3 w-1/2 bg-slate-100 rounded" style={{ height: '12px', width: '50%', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
                      </div>
                      <div className="mt-auto border-t border-slate-100 pt-3 flex justify-between items-center text-[10px] font-bold text-slate-400" style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
                        <span>Học viên: {selectedRecord.studentName}</span>
                        <span>Mã: {selectedRecord.studentCode}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* PHOTO Visual View */}
                {(previewFile.type === 'PHOTO' || previewFile.type === 'IMAGE') && (
                  <div className="w-full max-w-[450px] border border-slate-200 rounded-lg shadow bg-slate-900 flex flex-col items-center justify-center p-4 relative" style={{ minHeight: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifycontent: 'center', padding: '16px', position: 'relative' }}>
                    <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '16px 16px', position: 'absolute' }} />
                    <svg width="220" height="150" viewBox="0 0 200 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 text-[#c5a059]" style={{ position: 'relative', zIndex: 10 }}>
                      <path d="M20 60 L100 20 L180 50 L100 110 Z" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" fill="rgba(197,160,89,0.05)" />
                      <line x1="100" y1="20" x2="100" y2="110" stroke="currentColor" strokeWidth="1" />
                      <line x1="20" y1="60" x2="180" y2="50" stroke="currentColor" strokeWidth="1" />
                      <circle cx="100" cy="55" r="30" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" />
                      <path d="M20 75 L20 85 M180 65 L180 75" stroke="currentColor" strokeWidth="0.8" />
                      <path d="M20 80 L180 70" stroke="currentColor" strokeWidth="0.8" />
                      <text x="75" y="92" fill="currentColor" fontSize="8" fontFamily="monospace">SPAN: 34.1m</text>
                      <rect x="135" y="95" width="60" height="30" fill="none" stroke="currentColor" strokeWidth="0.5" />
                      <text x="140" y="105" fill="currentColor" fontSize="5" fontFamily="monospace">DWG NO: AM-0892</text>
                      <text x="140" y="112" fill="currentColor" fontSize="5" fontFamily="monospace">SCALE: 1:100</text>
                      <text x="140" y="119" fill="currentColor" fontSize="5" fontFamily="monospace">DATE: 2024-08</text>
                    </svg>
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[9px] font-bold text-slate-500 z-10" style={{ display: 'flex', justifycontent: 'space-between', width: '100%', position: 'absolute', bottom: '8px', padding: '0 8px' }}>
                      <span>Camera: INSPECTION UNIT A3</span>
                      <span>ISO 200 • 1/120s • f/4.0</span>
                    </div>
                  </div>
                )}

                {/* SIGNATURE Visual View */}
                {previewFile.type === 'SIGNATURE' && (
                  <div className="w-full max-w-[400px] border-2 border-dashed border-[#c5a059]/40 rounded-xl bg-[#002147]/5 p-6 flex flex-col items-center justify-center gap-4 text-center" style={{ minHeight: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifycontent: 'center', gap: '16px', padding: '24px' }}>
                    <div className="w-14 h-14 rounded-full bg-[#002147]/10 flex items-center justify-center text-[#002147]" style={{ width: '56px', height: '56px', borderRadius: '50%', display: 'flex', justifycontent: 'center', alignItems: 'center', color: '#002147', backgroundColor: 'rgba(0,33,71,0.1)' }}>
                      <svg width={28} height={28} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M2.166 4.9C2.044 5.02 2 5.19 2 5.37v9.26c0 .18.044.35.166.47.66.66 2.052 1.9 4.334 1.9 2.282 0 3.674-1.24 4.334-1.9.122-.12.166-.29.166-.47V5.37c0-.18-.044-.35-.166-.47C10.174 4.24 8.782 3 6.5 3c-2.282 0-3.674 1.24-4.334 1.9zm13.168.03c-.2-.06-.412-.03-.59.09-.176.12-.278.33-.278.55v9.12c0 .24.12.46.326.58.156.09.336.12.504.07 1.488-.41 2.376-.14 3.012.38.12.1.28.15.44.15.38 0 .7-.32.7-.7V6.04c0-.28-.16-.54-.42-.64-1.04-.4-2.58-.62-3.804-.47z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-black text-[#002147] tracking-wider" style={{ fontWeight: 'bold' }}>CERTIFIED DIGITAL ID SIGNATURE</div>
                      <div className="text-[10px] font-bold text-[#c5a059] uppercase mt-1" style={{ color: '#c5a059' }}>ETR CERTIFICATION TRUST</div>
                    </div>
                    
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-left font-mono text-[9px] w-full text-slate-500 flex flex-col gap-1 shadow-sm" style={{ fontFamily: 'monospace', fontSize: '9px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                      <div><strong>ISSUER:</strong> Dr. Elena Sterling / QA Officer</div>
                      <div><strong>TIMESTAMP:</strong> {previewFile.date} @ 14:20:05 GMT+7</div>
                      <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}><strong>HASH:</strong> SHA256:7f9b8c3a1e5d7f8a9c2b0d3e5f6a7b8c9d0e1f</div>
                      <div><strong>KEY STATUS:</strong> VALIDATED & ACTIVE</div>
                    </div>

                    <div className="flex items-center gap-2 mt-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {previewFile.status === 'Verified' ? (
                        <div className="flex items-center gap-1 text-green-700 font-bold text-xs bg-green-50 border border-green-200 px-3 py-1 rounded-full" style={{ color: '#15803d', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 12px', borderRadius: '9999px', fontSize: '11px', fontWeight: 'bold' }}>
                          ✓ TRUSTED ROOT SIGNATURE
                        </div>
                      ) : previewFile.status === 'Pending' || previewFile.status === 'Pending QA' ? (
                        <div className="flex items-center gap-1 text-amber-700 font-bold text-xs bg-amber-50 border border-amber-200 px-3 py-1 rounded-full" style={{ color: '#b45309', backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '4px 12px', borderRadius: '9999px', fontSize: '11px', fontWeight: 'bold' }}>
                          ⌛ WAITING QA COMPLIANCE
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-700 font-bold text-xs bg-red-50 border border-red-200 px-3 py-1 rounded-full" style={{ color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '4px 12px', borderRadius: '9999px', fontSize: '11px', fontWeight: 'bold' }}>
                          ✗ UNTRUSTED OR INVALID
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <footer className="modal-footer">
              <button 
                className="modal-cancel-btn" 
                type="button" 
                onClick={() => {
                  setPreviewFile(null);
                }}
              >
                Đóng
              </button>
              <button 
                className="modal-submit-btn" 
                type="button" 
                onClick={() => {
                  handleDownloadFile(previewFile.name);
                  setPreviewFile(null);
                }}
              >
                Tải Xuống Minh Chứng
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Modal - ETR Final View Sheet */}
      {isFinalViewOpen && finalViewRecord && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ width: '750px', maxWidth: '95%' }}>
            <header className="modal-header">
              <h2>HỒ SƠ ĐÀO TẠO ĐIỆN TỬ HOÀN CHỈNH (ETR FINAL SHEET)</h2>
              <button className="close-btn" type="button" onClick={() => setIsFinalViewOpen(false)} aria-label="Đóng">
                &times;
              </button>
            </header>

            <div className="modal-body" style={{ padding: '32px', maxHeight: '75vh', overflowY: 'auto', backgroundColor: '#fdfdfd' }}>
              {/* ETR Header Title */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#002147', textTransform: 'uppercase', margin: '0' }}>ETR TRAINING ACADEMY</h3>
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#c5a059', margin: '4px 0 0', letterSpacing: '0.05em' }}>ELECTRONIC TRAINING RECORD (ETR)</h4>
                <div style={{ width: '60px', height: '2px', backgroundColor: '#c5a059', margin: '12px auto 0' }} />
              </div>

              {/* Grid 2 column Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', border: '1px solid #e0e4e8', borderRadius: '8px', padding: '24px', backgroundColor: '#ffffff', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 900, color: 'rgba(0, 33, 71, 0.4)', textTransform: 'uppercase' }}>MÃ ETR HỒ SƠ</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#c5a059', marginTop: '4px' }}>{finalViewRecord.id}</div>

                  <div style={{ fontSize: '11px', fontWeight: 900, color: 'rgba(0, 33, 71, 0.4)', textTransform: 'uppercase', marginTop: '16px' }}>HỌC VIÊN ĐÀO TẠO</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#002147', marginTop: '4px' }}>{finalViewRecord.studentName}</div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 900, color: 'rgba(0, 33, 71, 0.4)', textTransform: 'uppercase' }}>KHÓA ĐÀO TẠO</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#002147', marginTop: '4px' }}>{finalViewRecord.course}</div>

                  <div style={{ fontSize: '11px', fontWeight: 900, color: 'rgba(0, 33, 71, 0.4)', textTransform: 'uppercase', marginTop: '16px' }}>MÃ SỐ HỌC VIÊN</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#002147', marginTop: '4px' }}>{finalViewRecord.studentCode}</div>
                </div>
              </div>

              {/* Progress and status summary */}
              <div style={{ border: '1px solid #e0e4e8', borderRadius: '8px', padding: '20px', backgroundColor: '#ffffff', marginBottom: '24px' }}>
                <div style={{ fontWeight: '700', fontSize: '12px', color: '#002147', textTransform: 'uppercase', marginBottom: '12px' }}>CHI TIẾT KIỂM DUYỆT CÁC BƯỚC HỒ SƠ</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>1. Hồ sơ thông tin cá nhân:</span>
                    <span style={{ color: '#15803d', fontWeight: 'bold' }}>✓ ĐÃ XÁC THỰC</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>2. Điểm danh / Chuyên cần:</span>
                    <span style={{ color: finalViewRecord.steps.attendance ? '#15803d' : '#d97706', fontWeight: 'bold' }}>
                      {finalViewRecord.steps.attendance ? '✓ ĐÃ XÁC THỰC' : '⌛ ĐANG CHỜ'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>3. Điểm số kết quả kiểm tra:</span>
                    <span style={{ color: finalViewRecord.steps.results ? '#15803d' : '#d97706', fontWeight: 'bold' }}>
                      {finalViewRecord.steps.results ? '✓ ĐÃ XÁC THỰC' : '⌛ ĐANG CHỜ'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>4. Minh chứng đính kèm hồ sơ:</span>
                    <span style={{ color: finalViewRecord.steps.evidence ? '#15803d' : '#d97706', fontWeight: 'bold' }}>
                      {finalViewRecord.steps.evidence ? '✓ ĐÃ XÁC THỰC' : '⌛ ĐANG CHỜ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures mock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '40px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Cán bộ học vụ</div>
                  <div style={{ height: '60px' }} />
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#002147' }}>Academic Staff</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Đã xác nhận điện tử</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Cán bộ quản lý QA</div>
                  <div style={{ height: '60px' }}>
                    {finalViewRecord.status === 'APPROVED' && (
                      <span style={{ color: '#15803d', border: '2px solid #15803d', padding: '4px 12px', borderRadius: '4px', display: 'inline-block', transform: 'rotate(-5deg)', fontWeight: 'bold', fontSize: '11px' }}>
                        APPROVED E-SIGN
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#002147' }}>{finalViewRecord.status === 'APPROVED' ? 'QA Officer' : '________________'}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{finalViewRecord.status === 'APPROVED' ? 'Đã ký số' : 'Chưa ký duyệt'}</div>
                </div>
              </div>
            </div>

            <footer className="modal-footer">
              <button className="modal-submit-btn" type="button" onClick={() => setIsFinalViewOpen(false)}>
                ĐÓNG HỒ SƠ
              </button>
            </footer>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default EtrManagement;
