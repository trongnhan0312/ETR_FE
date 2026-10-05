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
  const [courses, setCourses] = useState([]); // { courseId, courseCode, courseName, status, subjectIds[] }
  const [classes, setClasses] = useState([]); // { classId, courseId, status }
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [viewingSubject, setViewingSubject] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
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
      const [subData, courseData, classData] = await Promise.all([
        api.get('/Subjects').catch(() => []),
        api.get('/Courses').catch(() => []),
        api.get('/Classes').catch(() => []),
      ]);
      const subArr = Array.isArray(subData) ? subData : [];
      const courseArr = Array.isArray(courseData) ? courseData : [];
      const classArr = Array.isArray(classData) ? classData : [];
      setSubjects(subArr);
      setClasses(classArr);
      // GET /Courses (list) không kèm mapping môn học → lấy subjects qua detail từng khóa.
      // Số lượng khóa học ít nên N+1 ở đây chấp nhận được; lỗi từng khóa → coi như không có môn.
      const details = await Promise.all(
        courseArr.map((c) => api.get(`/Courses/${c.courseId ?? c.id}`).catch(() => null)),
      );
      setCourses(
        courseArr.map((c, idx) => {
          const d = details[idx];
          const detSubs = Array.isArray(d?.subjects)
            ? d.subjects
            : Array.isArray(d?.courseSubjects)
              ? d.courseSubjects
              : [];
          return {
            courseId: c.courseId ?? c.id,
            courseCode: c.courseCode ?? c.code ?? '',
            courseName: c.courseName ?? c.name ?? `Course #${c.courseId ?? c.id}`,
            status: c.status ?? '',
            subjectIds: detSubs.map((s) => String(s.subjectId ?? '')),
          };
        }),
      );
    } catch (err) {
      console.error('Error loading subjects:', err);
      setSubjects([]);
      setCourses([]);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  // Môn học đang được dùng bởi khóa học Active, hoặc bởi khóa học có lớp đang chạy
  // (InProgress/Planned) thì bị KHÓA sửa/xóa. Trả về danh sách khóa học đang giữ môn.
  const LIVE_CLASS_STATUSES = ['InProgress', 'Planned'];
  const getLockingCourses = (subject) => {
    if (!subject) return [];
    const sid = String(subject.subjectId);
    const liveCourseIds = new Set(
      classes
        .filter((cl) => LIVE_CLASS_STATUSES.includes(String(cl.status)))
        .map((cl) => String(cl.courseId ?? '')),
    );
    return courses.filter((c) => {
      if (!c.subjectIds.includes(sid)) return false;
      if (String(c.status).toLowerCase() === 'active') return true;
      return liveCourseIds.has(String(c.courseId));
    });
  };

  const formatLockingCourseNames = (locking) =>
    locking
      .slice(0, 3)
      .map((c) => `"${c.courseName}"`)
      .join(', ') + (locking.length > 3 ? ` (+${locking.length - 3})` : '');

  const notifySubjectLocked = (subject, locking) => {
    const names = formatLockingCourseNames(locking.length > 0 ? locking : getLockingCourses(subject));
    toast.warning(
      tr(`Môn học này đang thuộc khóa học ${names} nên không thể chỉnh sửa hoặc xóa.`),
    );
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

  const handleOpenDetail = async (subject) => {
    setViewingSubject(subject);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/Subjects/${subject.subjectId}`);
      if (res) {
        setViewingSubject((prev) => ({ ...prev, ...res }));
      }
    } catch (err) {
      console.warn('Could not fetch updated subject details, using table data:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenEdit = (subject) => {
    const locking = getLockingCourses(subject);
    if (locking.length > 0) {
      notifySubjectLocked(subject, locking);
      return;
    }
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
    // Số giờ mặc định của môn học phải lớn hơn 0
    if (!(Number(cDefaultHours) >= 1)) {
      const msg = tr('subject default hours must be larger than 0');
      setFormError(msg);
      toast.error(msg);
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
    // Chặn lưu khi môn đã bị khóa trong lúc modal đang mở
    if (getLockingCourses(editingSubject).length > 0) {
      notifySubjectLocked(editingSubject);
      setIsEditOpen(false);
      return;
    }
    if (!eSubjectCode.trim() || !eSubjectName.trim()) {
      setFormError(tr('Vui lòng nhập Mã môn học và Tên môn học.'));
      return;
    }
    // Số giờ mặc định của môn học phải lớn hơn 0
    if (!(Number(eDefaultHours) >= 1)) {
      const msg = tr('subject default hours must be larger than 0');
      setFormError(msg);
      toast.error(msg);
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
    if (getLockingCourses(subject).length > 0) {
      notifySubjectLocked(subject);
      return;
    }
    try {
      await api.delete(`/Subjects/${subject.subjectId}`);
      await loadSubjects();
      toast.success(tr('Xóa môn học thành công!'), announce('delete', tr('Môn học')));
    } catch (err) {
      console.error('Failed to delete subject:', err);
      toast.error(parseApiError(err, tr('Xóa môn học thất bại.')));
    }
  };

  const gridCols = '1fr 1.3fr 0.8fr 0.6fr 1.1fr 1.2fr 0.8fr 1.6fr';

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

        <div className="data-table" style={{ width: '100%', overflowX: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              minWidth: '960px',
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
            pageItems.map((s) => {
              // Môn đang thuộc khóa Active / lớp đang chạy (InProgress/Planned) → xám nút
              const locking = getLockingCourses(s);
              const isLocked = locking.length > 0;
              const lockTitle = isLocked
                ? tr(`Môn học này đang thuộc khóa học ${formatLockingCourseNames(locking)} nên không thể chỉnh sửa hoặc xóa.`)
                : '';
              const lockedBtnStyle = {
                background: '#f1f5f9',
                color: '#94a3b8',
                borderColor: '#e2e8f0',
                cursor: 'not-allowed',
                opacity: 0.7,
              };
              return (
              <div
                key={s.subjectId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  minWidth: '960px',
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
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                  <button
                    type="button"
                    title={tr('Xem chi tiết môn học')}
                    onClick={() => handleOpenDetail(s)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#002147',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    👁️ {tr('Chi tiết')}
                  </button>
                  <button
                    type="button"
                    aria-disabled={isLocked}
                    title={lockTitle || tr('Chỉnh sửa')}
                    onClick={() => (isLocked ? notifySubjectLocked(s, locking) : handleOpenEdit(s))}
                    style={isLocked
                      ? { padding: '4px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap', ...lockedBtnStyle }
                      : { padding: '4px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {tr('Chỉnh sửa')}
                  </button>
                  <button
                    type="button"
                    aria-disabled={isLocked}
                    title={lockTitle || tr('Xóa')}
                    onClick={() => (isLocked ? notifySubjectLocked(s, locking) : handleDelete(s))}
                    style={isLocked
                      ? { padding: '4px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap', ...lockedBtnStyle }
                      : { padding: '4px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fff5f5', color: '#ef4444', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {tr('Xóa')}
                  </button>
                </div>
              </div>
              );
            })
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
                      {SUBJECT_TYPES.map((t) => <option key={t} value={t}>{tr(t)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="subj-hours">{tr('Số giờ mặc định')}</label>
                    <input id="subj-hours" type="number" min="1" max="200" value={cDefaultHours} onChange={(e) => setCDefaultHours(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div className="form-group">
                    <label htmlFor="subj-min-sessions">{tr('Số buổi tối thiểu *')}</label>
                    <input id="subj-min-sessions" type="number" min="1" value={cMinSessions} onChange={(e) => setCMinSessions(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="subj-max-sessions">{tr('Số buổi tối đa *')}</label>
                    <input id="subj-max-sessions" type="number" min="1" value={cMaxSessions} onChange={(e) => setCMaxSessions(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div className="form-group">
                    <label htmlFor="subj-assess">{tr('Phương pháp đánh giá')}</label>
                    <select id="subj-assess" value={cAssessmentMethod} onChange={(e) => setCAssessmentMethod(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}>
                      {ASSESSMENT_METHODS.map((m) => <option key={m} value={m}>{tr(m)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="subj-status">{tr('Trạng thái')}</label>
                    <select id="subj-status" value={cStatus} onChange={(e) => setCStatus(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{tr(s)}</option>)}
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
                      {SUBJECT_TYPES.map((t) => <option key={t} value={t}>{tr(t)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="esubj-hours">{tr('Số giờ mặc định')}</label>
                    <input id="esubj-hours" type="number" min="1" max="200" value={eDefaultHours} onChange={(e) => setEDefaultHours(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div className="form-group">
                    <label htmlFor="esubj-min-sessions">{tr('Số buổi tối thiểu *')}</label>
                    <input id="esubj-min-sessions" type="number" min="1" value={eMinSessions} onChange={(e) => setEMinSessions(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="esubj-max-sessions">{tr('Số buổi tối đa *')}</label>
                    <input id="esubj-max-sessions" type="number" min="1" value={eMaxSessions} onChange={(e) => setEMaxSessions(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div className="form-group">
                    <label htmlFor="esubj-assess">{tr('Phương pháp đánh giá')}</label>
                    <select id="esubj-assess" value={eAssessmentMethod} onChange={(e) => setEAssessmentMethod(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}>
                      {ASSESSMENT_METHODS.map((m) => <option key={m} value={m}>{tr(m)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="esubj-status">{tr('Trạng thái')}</label>
                    <select id="esubj-status" value={eStatus} onChange={(e) => setEStatus(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{tr(s)}</option>)}
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

      {/* DETAIL MODAL */}
      {viewingSubject && createPortal(
        <div className="modal-overlay" onClick={() => setViewingSubject(null)}>
          <div
            className="modal-container"
            style={{ width: '640px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '20px' }}>📖</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', color: '#0f172a', fontWeight: 700 }}>
                    {tr('Chi tiết môn học')}
                  </h2>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {viewingSubject.subjectName}
                  </span>
                </div>
              </div>
              <button
                className="close-btn"
                type="button"
                onClick={() => setViewingSubject(null)}
                aria-label={tr('Đóng')}
                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </header>

            <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header Badge Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {tr('Mã môn học')}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#002147', fontFamily: 'monospace', marginTop: '2px' }}>
                    {viewingSubject.subjectCode}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: viewingSubject.subjectType === 'Theory' ? '#eff6ff' : '#f0fdf4',
                      border: `1px solid ${viewingSubject.subjectType === 'Theory' ? '#dbeafe' : '#bbf7d0'}`,
                      color: viewingSubject.subjectType === 'Theory' ? '#1d4ed8' : '#15803d',
                    }}
                  >
                    {tr(viewingSubject.subjectType)}
                  </span>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: viewingSubject.status === 'Active' ? '#dcfce7' : '#fef2f2',
                      border: `1px solid ${viewingSubject.status === 'Active' ? '#bbf7d0' : '#fecaca'}`,
                      color: viewingSubject.status === 'Active' ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {tr(viewingSubject.status)}
                  </span>
                </div>
              </div>

              {/* Thông tin cấu hình đào tạo */}
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#002147', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚙️</span> {tr('Cấu hình đào tạo')}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{tr('Số giờ mặc định')}</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                      {viewingSubject.defaultHours} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>{tr('giờ')}</span>
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{tr('Số buổi tối thiểu')}</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                      {viewingSubject.minSessions ?? 1} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>{tr('buổi')}</span>
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{tr('Số buổi tối đa')}</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                      {viewingSubject.maxSessions ?? 20} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>{tr('buổi')}</span>
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{tr('Phương pháp đánh giá')}</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                      {tr(viewingSubject.assessmentMethod || '—')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mô tả */}
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#002147', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📝</span> {tr('Mô tả')}
                </h3>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', color: viewingSubject.description ? '#334155' : '#94a3b8', lineHeight: 1.6, fontStyle: viewingSubject.description ? 'normal' : 'italic' }}>
                  {viewingSubject.description || tr('Không có mô tả')}
                </div>
              </div>

              {/* Danh sách Khóa học đang sử dụng môn học */}
              {(() => {
                const sid = String(viewingSubject.subjectId);
                const linkedCourses = courses.filter((c) => c.subjectIds && c.subjectIds.includes(sid));
                const locking = getLockingCourses(viewingSubject);
                const isLocked = locking.length > 0;
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#002147', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📚</span> {tr('Khóa học áp dụng')} ({linkedCourses.length})
                      </h3>
                      {isLocked && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title={tr('Môn học đang được dùng bởi khóa học Hoạt động hoặc lớp đang chạy, không thể sửa/xóa')}
                        >
                          🔒 {tr('Môn học đang được bảo vệ (khóa chỉnh sửa/xóa)')}
                        </span>
                      )}
                    </div>

                    {linkedCourses.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '18px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '13px' }}>
                        {tr('Chưa có khóa học nào sử dụng môn học này.')}
                      </div>
                    ) : (
                      <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                              <th style={{ padding: '8px 12px', width: '120px' }}>{tr('Mã khóa học')}</th>
                              <th style={{ padding: '8px 12px' }}>{tr('Tên khóa học')}</th>
                              <th style={{ padding: '8px 12px', textAlign: 'right', width: '110px' }}>{tr('Trạng thái')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linkedCourses.map((c, cIdx) => (
                              <tr key={c.courseId ?? cIdx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: cIdx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                <td style={{ padding: '8px 12px', fontWeight: 700, color: '#002147', fontFamily: 'monospace' }}>{c.courseCode}</td>
                                <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>{c.courseName}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: String(c.status).toLowerCase() === 'active' ? '#dcfce7' : '#f1f5f9',
                                    color: String(c.status).toLowerCase() === 'active' ? '#15803d' : '#475569',
                                    border: `1px solid ${String(c.status).toLowerCase() === 'active' ? '#bbf7d0' : '#cbd5e1'}`
                                  }}>
                                    {tr(c.status || 'Active')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <footer className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
              {(() => {
                const locking = getLockingCourses(viewingSubject);
                const isLocked = locking.length > 0;
                return (
                  <>
                    <button
                      type="button"
                      disabled={isLocked}
                      title={isLocked ? tr('Môn học đang bị khóa sửa/xóa bởi khóa học đang hoạt động') : tr('Chỉnh sửa môn học')}
                      onClick={() => {
                        const target = viewingSubject;
                        setViewingSubject(null);
                        handleOpenEdit(target);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: isLocked ? '1px solid #e2e8f0' : '1px solid #cbd5e1',
                        background: isLocked ? '#f1f5f9' : '#ffffff',
                        color: isLocked ? '#94a3b8' : '#002147',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ✏️ {tr('Chỉnh sửa')}
                    </button>
                    <button
                      className="modal-submit-btn"
                      type="button"
                      onClick={() => setViewingSubject(null)}
                      style={{ padding: '8px 18px', borderRadius: '6px', backgroundColor: '#002147', color: '#ffffff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {tr('Đóng')}
                    </button>
                  </>
                );
              })()}
            </footer>
          </div>
        </div>,
        document.body
      )}

      <toast.ToastContainer />
    </div>
  );
};

export default SubjectManagement;