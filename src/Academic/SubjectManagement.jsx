import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, parseApiError } from '../utils/api';
import { announce } from '../utils/crudNotify';
import { useToast } from '../components/Toast';
import { useLanguage } from '../context/LanguageContext';
import { usePagination } from '../utils/usePagination';
import Pagination from '../components/Pagination';

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
  const [cMinSessions, setCMinSessions] = useState(1);
  const [cMaxSessions, setCMaxSessions] = useState(20);
  const [cAssessmentMethod, setCAssessmentMethod] = useState('Written Exam');
  const [cDescription, setCDescription] = useState('');
  const [cStatus, setCStatus] = useState('Active');

  const [eSubjectCode, setESubjectCode] = useState('');
  const [eSubjectName, setESubjectName] = useState('');
  const [eSubjectType, setESubjectType] = useState('Theory');
  const [eDefaultHours, setEDefaultHours] = useState(20);
  const [eMinSessions, setEMinSessions] = useState(1);
  const [eMaxSessions, setEMaxSessions] = useState(20);
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

  const { page, setPage, pageCount, pageItems, total } = usePagination(filteredSubjects, {
    pageSize: 10,
    resetKey: `${searchTerm}|${statusFilter}`,
  });

  const resetCreateForm = () => {
    setCSubjectCode('');
    setCSubjectName('');
    setCSubjectType('Theory');
    setCDefaultHours(20);
    setCMinSessions(1);
    setCMaxSessions(20);
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
    setEMinSessions(1);
    setEMaxSessions(20);
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
    setEMinSessions(subject.minSessions ?? 1);
    setEMaxSessions(subject.maxSessions ?? 20);
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
      // MinSessions/MaxSessions bắt buộc theo CreateSubjectRequest mới của BE
      if (Number(cMinSessions) < 1 || Number(cMaxSessions) < 1 || Number(cMinSessions) > Number(cMaxSessions)) {
        setFormError(tr('Số buổi tối thiểu phải >= 1 và không được lớn hơn số buổi tối đa.'));
        return;
      }
      await api.post('/Subjects', {
        subjectCode: cSubjectCode.trim(),
        subjectName: cSubjectName.trim(),
        subjectType: cSubjectType,
        defaultHours: Number(cDefaultHours),
        minSessions: Number(cMinSessions),
        maxSessions: Number(cMaxSessions),
        assessmentMethod: cAssessmentMethod,
        description: cDescription.trim() || null,
        status: cStatus,
      });
      await loadSubjects();
      setIsCreateOpen(false);
      resetCreateForm();
      toast.success(tr('Tạo môn học thành công!'), announce('add', tr('Môn học')));
    } catch (err) {
      console.error('Failed to create subject:', err);
      toast.error(parseApiError(err, tr('Tạo môn học thất bại.')));
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
      if (Number(eMinSessions) < 1 || Number(eMaxSessions) < 1 || Number(eMinSessions) > Number(eMaxSessions)) {
        setFormError(tr('Số buổi tối thiểu phải >= 1 và không được lớn hơn số buổi tối đa.'));
        return;
      }
      await api.put(`/Subjects/${editingSubject.subjectId}`, {
        subjectCode: eSubjectCode.trim(),
        subjectName: eSubjectName.trim(),
        subjectType: eSubjectType,
        defaultHours: Number(eDefaultHours),
        minSessions: Number(eMinSessions),
        maxSessions: Number(eMaxSessions),
        assessmentMethod: eAssessmentMethod,
        description: eDescription.trim() || null,
        status: eStatus,
      });
      await loadSubjects();
      setIsEditOpen(false);
      setEditingSubject(null);
      resetEditForm();
      toast.success(tr('Cập nhật môn học thành công!'), announce('edit', tr('Môn học')));
    } catch (err) {
      console.error('Failed to update subject:', err);
      toast.error(parseApiError(err, tr('Cập nhật môn học thất bại.')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (subject) => {
    try {
      await api.delete(`/Subjects/${subject.subjectId}`);
      await loadSubjects();
      toast.success(tr('Xóa môn học thành công!'), announce('delete', tr('Môn học')));
    } catch (err) {
      console.error('Failed to delete subject:', err);
      toast.error(parseApiError(err, tr('Xóa môn học thất bại.')));
    }
  };

  const gridCols = '1.1fr 1.3fr 0.9fr 0.7fr 1.2fr 1.5fr 0.9fr 0.9fr';

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

      <section className="table-card" style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              {tr('Tất cả môn học')} ({filteredSubjects.length})
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="search-box" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span className="search-icon" style={{ position: 'absolute', left: '10px', pointerEvents: 'none', color: '#94a3b8' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                placeholder={tr('Tìm theo mã, tên, mô tả...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '8px 14px 8px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', width: '260px' }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: 'white' }}
            >
              <option value="ALL">{tr('Tất cả')}</option>
              <option value="Active">{tr('Active')}</option>
              <option value="Inactive">{tr('Inactive')}</option>
            </select>
          </div>
        </div>

        <div className="data-table" style={{ width: '100%' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              padding: '12px 16px',
              background: '#002147',
              color: '#fff',
              borderRadius: '8px 8px 0 0',
              fontWeight: '600',
              fontSize: '12px',
              letterSpacing: '0.03em',
            }}
          >
            <div>{tr('Mã môn học')}</div>
            <div>{tr('Tên môn học')}</div>
            <div>{tr('Loại')}</div>
            <div>{tr('Số giờ')}</div>
            <div>{tr('Đánh giá')}</div>
            <div>{tr('Mô tả')}</div>
            <div>{tr('Trạng thái')}</div>
            <div style={{ textAlign: 'right' }}>{tr('Thao tác')}</div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
              {tr('Đang tải danh sách môn học...')}
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontStyle: 'italic' }}>
              {searchTerm ? tr('Không tìm thấy môn học phù hợp.') : tr('Chưa có môn học nào trong hệ thống.')}
            </div>
          ) : (
            pageItems.map((s) => (
              <div
                key={s.subjectId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  padding: '12px 16px',
                  borderBottom: '1px solid #f1f5f9',
                  alignItems: 'center',
                  fontSize: '13px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div style={{ fontWeight: '700', color: '#002147', fontFamily: 'monospace', fontSize: '13px' }}>{s.subjectCode}</div>
                <div style={{ fontWeight: '600', color: '#0f172a' }}>{s.subjectName}</div>
                <div>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '900',
                      backgroundColor: s.subjectType === 'Theory' ? '#eff6ff' : '#f0fdf4',
                      border: `1px solid ${s.subjectType === 'Theory' ? '#dbeafe' : '#bbf7d0'}`,
                      color: s.subjectType === 'Theory' ? '#1d4ed8' : '#15803d',
                    }}
                  >
                    {s.subjectType}
                  </span>
                </div>
                <div style={{ color: '#475569', fontWeight: '600' }}>{s.defaultHours}</div>
                <div style={{ fontSize: '12px', color: '#475569' }}>{s.assessmentMethod || '—'}</div>
                <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description || '—'}</div>
                <div>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '900',
                      backgroundColor: s.status === 'Active' ? '#dcfce7' : '#fef2f2',
                      border: `1px solid ${s.status === 'Active' ? '#bbf7d0' : '#fecaca'}`,
                      color: s.status === 'Active' ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {s.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(s)}
                    style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', cursor: 'pointer' }}
                  >
                    {tr('Chỉnh sửa')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s)}
                    style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fff5f5', color: '#ef4444', cursor: 'pointer' }}
                  >
                    {tr('Xóa')}
                  </button>
                </div>
              </div>
            ))
          )}
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

      {/* CREATE MODAL */}
      {isCreateOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-container" style={{ width: '560px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <header className="modal-header">
              <h2>{tr('Tạo mới môn học')}</h2>
              <button className="close-btn" type="button" onClick={() => { setIsCreateOpen(false); resetCreateForm(); }} aria-label={tr('Đóng')}>&times;</button>
            </header>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                {formError && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px' }}>{formError}</div>
                )}
                <div className="form-group">
                  <label htmlFor="subj-code">{tr('Mã môn học *')}</label>
                  <input id="subj-code" type="text" value={cSubjectCode} onChange={(e) => setCSubjectCode(e.target.value)} placeholder={tr('Ví dụ: SJ-REG')} required style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                </div>
                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label htmlFor="subj-name">{tr('Tên môn học *')}</label>
                  <input id="subj-name" type="text" value={cSubjectName} onChange={(e) => setCSubjectName(e.target.value)} placeholder={tr('Ví dụ: Aviation Regulations')} required style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div className="form-group">
                    <label htmlFor="subj-type">{tr('Loại môn học')}</label>
                    <select id="subj-type" value={cSubjectType} onChange={(e) => setCSubjectType(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}>
                      {SUBJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="subj-hours">{tr('Số giờ mặc định')}</label>
                    <input id="subj-hours" type="number" min="1" max="200" value={cDefaultHours} onChange={(e) => setCDefaultHours(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div className="form-group">
                    <label htmlFor="subj-min-sessions">{tr('Số buổi tối thiểu (MinSessions) *')}</label>
                    <input id="subj-min-sessions" type="number" min="1" value={cMinSessions} onChange={(e) => setCMinSessions(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="subj-max-sessions">{tr('Số buổi tối đa (MaxSessions) *')}</label>
                    <input id="subj-max-sessions" type="number" min="1" value={cMaxSessions} onChange={(e) => setCMaxSessions(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div className="form-group">
                    <label htmlFor="subj-assess">{tr('Phương pháp đánh giá')}</label>
                    <select id="subj-assess" value={cAssessmentMethod} onChange={(e) => setCAssessmentMethod(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}>
                      {ASSESSMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="subj-status">{tr('Trạng thái')}</label>
                    <select id="subj-status" value={cStatus} onChange={(e) => setCStatus(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label htmlFor="subj-desc">{tr('Mô tả')}</label>
                  <textarea id="subj-desc" value={cDescription} onChange={(e) => setCDescription(e.target.value)} placeholder={tr('Mô tả môn học (tùy chọn)')} rows={3} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical' }} />
                </div>
              </div>
              <footer className="modal-footer" style={{ flexShrink: 0 }}>
                <button className="modal-cancel-btn" type="button" onClick={() => { setIsCreateOpen(false); resetCreateForm(); }}>{tr('Hủy bỏ')}</button>
                <button className="modal-submit-btn" type="submit" disabled={submitting}>{submitting ? tr('Đang tạo...') : tr('Tạo môn học')}</button>
              </footer>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT MODAL */}
      {isEditOpen && editingSubject && createPortal(
        <div className="modal-overlay">
          <div className="modal-container" style={{ width: '560px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <header className="modal-header">
              <h2>{tr('Chỉnh sửa môn học')}</h2>
              <button className="close-btn" type="button" onClick={() => { setIsEditOpen(false); setEditingSubject(null); resetEditForm(); }} aria-label={tr('Đóng')}>&times;</button>
            </header>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                {formError && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px' }}>{formError}</div>
                )}
                <div className="form-group">
                  <label htmlFor="esubj-code">{tr('Mã môn học *')}</label>
                  <input id="esubj-code" type="text" value={eSubjectCode} onChange={(e) => setESubjectCode(e.target.value)} placeholder={tr('Ví dụ: SJ-REG')} required style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                </div>
                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label htmlFor="esubj-name">{tr('Tên môn học *')}</label>
                  <input id="esubj-name" type="text" value={eSubjectName} onChange={(e) => setESubjectName(e.target.value)} placeholder={tr('Ví dụ: Aviation Regulations')} required style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div className="form-group">
                    <label htmlFor="esubj-type">{tr('Loại môn học')}</label>
                    <select id="esubj-type" value={eSubjectType} onChange={(e) => setESubjectType(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}>
                      {SUBJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="esubj-hours">{tr('Số giờ mặc định')}</label>
                    <input id="esubj-hours" type="number" min="1" max="200" value={eDefaultHours} onChange={(e) => setEDefaultHours(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div className="form-group">
                    <label htmlFor="esubj-min-sessions">{tr('Số buổi tối thiểu (MinSessions) *')}</label>
                    <input id="esubj-min-sessions" type="number" min="1" value={eMinSessions} onChange={(e) => setEMinSessions(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="esubj-max-sessions">{tr('Số buổi tối đa (MaxSessions) *')}</label>
                    <input id="esubj-max-sessions" type="number" min="1" value={eMaxSessions} onChange={(e) => setEMaxSessions(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div className="form-group">
                    <label htmlFor="esubj-assess">{tr('Phương pháp đánh giá')}</label>
                    <select id="esubj-assess" value={eAssessmentMethod} onChange={(e) => setEAssessmentMethod(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}>
                      {ASSESSMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="esubj-status">{tr('Trạng thái')}</label>
                    <select id="esubj-status" value={eStatus} onChange={(e) => setEStatus(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label htmlFor="esubj-desc">{tr('Mô tả')}</label>
                  <textarea id="esubj-desc" value={eDescription} onChange={(e) => setEDescription(e.target.value)} placeholder={tr('Mô tả môn học (tùy chọn)')} rows={3} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical' }} />
                </div>
              </div>
              <footer className="modal-footer" style={{ flexShrink: 0 }}>
                <button className="modal-cancel-btn" type="button" onClick={() => { setIsEditOpen(false); setEditingSubject(null); resetEditForm(); }}>{tr('Hủy bỏ')}</button>
                <button className="modal-submit-btn" type="submit" disabled={submitting}>{submitting ? tr('Đang lưu...') : tr('Lưu thay đổi')}</button>
              </footer>
            </form>
          </div>
        </div>,
        document.body
      )}

      <toast.ToastContainer />
    </div>
  );
};

export default SubjectManagement;