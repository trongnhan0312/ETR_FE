import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useToast } from '../components/Toast';
import { useLanguage } from '../context/LanguageContext';

const SubjectManagement = () => {
  const { tr } = useLanguage();
  const toast = useToast();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [cSubjectCode, setCSubjectCode] = useState('');
  const [cSubjectName, setCSubjectName] = useState('');
  const [cSubjectType, setCSubjectType] = useState('Theory');
  const [cDefaultHours, setCDefaultHours] = useState(20);
  const [cAssessmentMethod, setCAssessmentMethod] = useState('Written Exam');
  const [cDescription, setCDescription] = useState('');
  const [cStatus, setCStatus] = useState('Active');

  const [eSubjectCode, setESubjectCode] = useState('');
  const [eSubjectName, setESubjectName] = useState('');
  const [eSubjectType, setESubjectType] = useState('Theory');
  const [eDefaultHours, setEDefaultHours] = useState(20);
  const [eAssessmentMethod, setEAssessmentMethod] = useState('Written Exam');
  const [eDescription, setEDescription] = useState('');
  const [eStatus, setEStatus] = useState('Active');

  const SUBJECT_TYPES = ['Theory', 'Practical'];
  const ASSESSMENT_METHODS = ['Written Exam', 'Practical Checklist'];
  const STATUSES = ['Active', 'Inactive'];

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const data = await api.get('/Subjects').catch(() => []);
      const arr = Array.isArray(data) ? data : [];
      setSubjects(arr);
    } catch (err) {
      console.error('Error loading subjects:', err);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const filteredSubjects = subjects.filter((s) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (s.subjectCode || '').toLowerCase().includes(q) ||
      (s.subjectName || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const resetCreateForm = () => {
    setCSubjectCode('');
    setCSubjectName('');
    setCSubjectType('Theory');
    setCDefaultHours(20);
    setCAssessmentMethod('Written Exam');
    setCDescription('');
    setCStatus('Active');
    setFormError('');
  };

  const resetEditForm = () => {
    setESubjectCode('');
    setESubjectName('');
    setESubjectType('Theory');
    setEDefaultHours(20);
    setEAssessmentMethod('Written Exam');
    setEDescription('');
    setEStatus('Active');
    setFormError('');
  };

  const handleOpenCreate = () => {
    resetCreateForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (subject) => {
    setEditingSubject(subject);
    setESubjectCode(subject.subjectCode || '');
    setESubjectName(subject.subjectName || '');
    setESubjectType(subject.subjectType || 'Theory');
    setEDefaultHours(subject.defaultHours ?? 20);
    setEAssessmentMethod(subject.assessmentMethod || 'Written Exam');
    setEDescription(subject.description || '');
    setEStatus(subject.status || 'Active');
    setIsEditOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!cSubjectCode.trim() || !cSubjectName.trim()) {
      setFormError(tr('Vui lòng nhập Mã môn học và Tên môn học.'));
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/Subjects', {
        subjectCode: cSubjectCode.trim(),
        subjectName: cSubjectName.trim(),
        subjectType: cSubjectType,
        defaultHours: Number(cDefaultHours),
        assessmentMethod: cAssessmentMethod,
        description: cDescription.trim() || null,
        status: cStatus,
      });
      await loadSubjects();
      setIsCreateOpen(false);
      resetCreateForm();
      toast.success(tr('Tạo môn học thành công!'));
    } catch (err) {
      console.error('Failed to create subject:', err);
      setFormError(tr('Tạo môn học thất bại.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!eSubjectCode.trim() || !eSubjectName.trim()) {
      setFormError(tr('Vui lòng nhập Mã môn học và Tên môn học.'));
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/Subjects/${editingSubject.subjectId}`, {
        subjectCode: eSubjectCode.trim(),
        subjectName: eSubjectName.trim(),
        subjectType: eSubjectType,
        defaultHours: Number(eDefaultHours),
        assessmentMethod: eAssessmentMethod,
        description: eDescription.trim() || null,
        status: eStatus,
      });
      await loadSubjects();
      setIsEditOpen(false);
      setEditingSubject(null);
      resetEditForm();
      toast.success(tr('Cập nhật môn học thành công!'));
    } catch (err) {
      console.error('Failed to update subject:', err);
      setFormError(tr('Cập nhật môn học thất bại.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (subject) => {
    try {
      await api.delete(`/Subjects/${subject.subjectId}`);
      await loadSubjects();
      toast.success(tr('Xóa môn học thành công!'));
    } catch (err) {
      console.error('Failed to delete subject:', err);
      toast.error(tr('Xóa môn học thất bại.'));
    }
  };

  const SubjectCard = ({ subject }) => (
    <div className="subject-card">
      <div className="subject-card-header">
        <div className="subject-card-title">
          <span className="subject-code-badge">{subject.subjectCode}</span>
          <h3>{subject.subjectName}</h3>
        </div>
        <span
          className="subject-status-badge"
          style={{
            backgroundColor: subject.status === 'Active' ? '#dcfce7' : '#fef2f2',
            border: `1px solid ${subject.status === 'Active' ? '#bbf7d0' : '#fecaca'}`,
            color: subject.status === 'Active' ? '#15803d' : '#b91c1c',
          }}
        >
          {subject.status}
        </span>
      </div>
      <div className="subject-card-body">
        <div className="subject-field">
          <span className="subject-field-label">{tr('Loại')}</span>
          <span
            className="subject-field-value"
            style={{
              backgroundColor: subject.subjectType === 'Theory' ? '#eff6ff' : '#f0fdf4',
              border: `1px solid ${subject.subjectType === 'Theory' ? '#dbeafe' : '#bbf7d0'}`,
              color: subject.subjectType === 'Theory' ? '#1d4ed8' : '#15803d',
            }}
          >
            {subject.subjectType}
          </span>
        </div>
        <div className="subject-field">
          <span className="subject-field-label">{tr('Số giờ')}</span>
          <span className="subject-field-value">{subject.defaultHours}h</span>
        </div>
        <div className="subject-field">
          <span className="subject-field-label">{tr('Đánh giá')}</span>
          <span className="subject-field-value">{subject.assessmentMethod || '—'}</span>
        </div>
        <div className="subject-field subject-field-full">
          <span className="subject-field-label">{tr('Mô tả')}</span>
          <span className="subject-field-value" style={{ color: '#64748b' }}>
            {subject.description || '—'}
          </span>
        </div>
      </div>
      <div className="subject-card-actions">
        <button className="auditor-btn-sm" onClick={() => handleOpenEdit(subject)}>
          {tr('Chỉnh sửa')}
        </button>
        <button
          className="auditor-btn-sm"
          style={{ color: '#ef4444', borderColor: '#fca5a5', background: '#fff5f5' }}
          onClick={() => handleDelete(subject)}
        >
          {tr('Xóa')}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <section className="content-header">
        <div className="header-left">
          <h1>{tr('Chủ đề môn học')}</h1>
          <div className="divider-gold" />
          <p className="header-description">
            {tr('Quản lý danh sách môn học: tạo mới, cập nhật thông tin và xóa mềm.')}
          </p>
        </div>
        <button className="create-btn" type="button" onClick={handleOpenCreate}>
          + {tr('Tạo môn học')}
        </button>
      </section>

      <section className="table-card">
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
                placeholder={tr('Tìm theo mã, tên, mô tả...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="toolbar-right" style={{ flexWrap: 'wrap' }}>
            {['ALL', 'Active', 'Inactive'].map((s) => (
              <button
                key={s}
                type="button"
                className={`filter-btn${statusFilter === s ? ' active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'ALL' ? tr('Tất cả') : s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="empty-table-state">{tr('Đang tải danh sách môn học...')}</div>
        ) : filteredSubjects.length === 0 ? (
          <div className="empty-table-state">{tr('Không tìm thấy môn học nào.')}</div>
        ) : (
          <div className="subjects-grid">
            {filteredSubjects.map((s) => (
              <SubjectCard key={s.subjectId} subject={s} />
            ))}
          </div>
        )}

        <div className="table-footer">
          <div className="footer-info">
            {tr('Hiển thị')} {filteredSubjects.length} {tr('trên tổng số')} {subjects.length} {tr('môn học')}
          </div>
        </div>
      </section>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ width: '560px' }}>
            <header className="modal-header">
              <h2>{tr('Tạo mới môn học')}</h2>
              <button className="close-btn" type="button" onClick={() => { setIsCreateOpen(false); resetCreateForm(); }} aria-label="Đóng">
                &times;
              </button>
            </header>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body" style={{ padding: '24px' }}>
                {formError && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px' }}>
                    {formError}
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="subj-code">{tr('Mã môn học *')}</label>
                  <input id="subj-code" type="text" value={cSubjectCode} onChange={(e) => setCSubjectCode(e.target.value)} placeholder={tr('Ví dụ: SJ-REG')} required style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }} />
                </div>
                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label htmlFor="subj-name">{tr('Tên môn học *')}</label>
                  <input id="subj-name" type="text" value={cSubjectName} onChange={(e) => setCSubjectName(e.target.value)} placeholder={tr('Ví dụ: Aviation Regulations')} required style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div className="form-group">
                    <label htmlFor="subj-type">{tr('Loại môn học')}</label>
                    <select id="subj-type" value={cSubjectType} onChange={(e) => setCSubjectType(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', transition: 'border-color 0.2s' }}>
                      {SUBJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="subj-hours">{tr('Số giờ mặc định')}</label>
                    <input id="subj-hours" type="number" min="1" max="200" value={cDefaultHours} onChange={(e) => setCDefaultHours(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div className="form-group">
                    <label htmlFor="subj-assess">{tr('Phương pháp đánh giá')}</label>
                    <select id="subj-assess" value={cAssessmentMethod} onChange={(e) => setCAssessmentMethod(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', transition: 'border-color 0.2s' }}>
                      {ASSESSMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="subj-status">{tr('Trạng thái')}</label>
                    <select id="subj-status" value={cStatus} onChange={(e) => setCStatus(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', transition: 'border-color 0.2s' }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label htmlFor="subj-desc">{tr('Mô tả')}</label>
                  <textarea id="subj-desc" value={cDescription} onChange={(e) => setCDescription(e.target.value)} placeholder={tr('Mô tả môn học (tùy chọn)')} rows={3} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', transition: 'border-color 0.2s' }} />
                </div>
              </div>
              <footer className="modal-footer">
                <button className="modal-cancel-btn" type="button" onClick={() => { setIsCreateOpen(false); resetCreateForm(); }}>
                  {tr('Hủy bỏ')}
                </button>
                <button className="modal-submit-btn" type="submit" disabled={submitting}>
                  {submitting ? tr('Đang tạo...') : tr('Tạo môn học')}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && editingSubject && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ width: '560px' }}>
            <header className="modal-header">
              <h2>{tr('Chỉnh sửa môn học')}</h2>
              <button className="close-btn" type="button" onClick={() => { setIsEditOpen(false); setEditingSubject(null); resetEditForm(); }} aria-label="Đóng">
                &times;
              </button>
            </header>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body" style={{ padding: '24px' }}>
                {formError && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px' }}>
                    {formError}
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="esubj-code">{tr('Mã môn học *')}</label>
                  <input id="esubj-code" type="text" value={eSubjectCode} onChange={(e) => setESubjectCode(e.target.value)} placeholder={tr('Ví dụ: SJ-REG')} required style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }} />
                </div>
                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label htmlFor="esubj-name">{tr('Tên môn học *')}</label>
                  <input id="esubj-name" type="text" value={eSubjectName} onChange={(e) => setESubjectName(e.target.value)} placeholder={tr('Ví dụ: Aviation Regulations')} required style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div className="form-group">
                    <label htmlFor="esubj-type">{tr('Loại môn học')}</label>
                    <select id="esubj-type" value={eSubjectType} onChange={(e) => setESubjectType(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', transition: 'border-color 0.2s' }}>
                      {SUBJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="esubj-hours">{tr('Số giờ mặc định')}</label>
                    <input id="esubj-hours" type="number" min="1" max="200" value={eDefaultHours} onChange={(e) => setEDefaultHours(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div className="form-group">
                    <label htmlFor="esubj-assess">{tr('Phương pháp đánh giá')}</label>
                    <select id="esubj-assess" value={eAssessmentMethod} onChange={(e) => setEAssessmentMethod(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', transition: 'border-color 0.2s' }}>
                      {ASSESSMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="esubj-status">{tr('Trạng thái')}</label>
                    <select id="esubj-status" value={eStatus} onChange={(e) => setEStatus(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', transition: 'border-color 0.2s' }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label htmlFor="esubj-desc">{tr('Mô tả')}</label>
                  <textarea id="esubj-desc" value={eDescription} onChange={(e) => setEDescription(e.target.value)} placeholder={tr('Mô tả môn học (tùy chọn)')} rows={3} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', transition: 'border-color 0.2s' }} />
                </div>
              </div>
              <footer className="modal-footer">
                <button className="modal-cancel-btn" type="button" onClick={() => { setIsEditOpen(false); setEditingSubject(null); resetEditForm(); }}>
                  {tr('Hủy bỏ')}
                </button>
                <button className="modal-submit-btn" type="submit" disabled={submitting}>
                  {submitting ? tr('Đang lưu...') : tr('Lưu thay đổi')}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      <toast.ToastContainer />
    </div>
  );
};

export default SubjectManagement;