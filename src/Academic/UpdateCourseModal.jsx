import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useToast } from '../components/Toast';
import { useLanguage } from '../context/LanguageContext';
import CompletionRequirementsSection from './CompletionRequirementsSection';

const UpdateCourseModal = ({ course, onSave, onCancel }) => {
  const { tr } = useLanguage();
  const toast = useToast();
  const [courseCode, setCourseCode] = useState(course.code || course.courseCode || '');
  const [courseName, setCourseName] = useState(course.name || course.courseName || '');
  const [description, setDescription] = useState(course.description || '');
  const [status, setStatus] = useState(course.status || 'Active');

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [subjectCriteria, setSubjectCriteria] = useState({}); // subjectId -> { requiredHours, isMandatory, passingScore, sequenceNo }
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [departmentLoadError, setDepartmentLoadError] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchSubjectsAndDepartments = async () => {
      try {
        setLoadingSubjects(true);
        setLoadingDepartments(true);
        setDepartmentLoadError(false);
        let deptErr = false;
        const [subList, cDetail, deptList] = await Promise.all([
          api.get('/Subjects').catch(() => []),
          api.get(`/Courses/${course.courseId}`).catch(() => null),
          api.get('/Departments').catch((err) => {
            console.error('Error fetching departments:', err);
            deptErr = true;
            return [];
          })
        ]);

        if (deptErr) {
          setDepartmentLoadError(true);
        }

        const subs = Array.isArray(subList) ? subList : [];
        setAvailableSubjects(subs);

        // Filter training audience departments
        const deptsArr = Array.isArray(deptList) ? deptList : [];
        const audienceDepts = deptsArr.filter((d) => {
          if (d.isTrainingAudience === false) return false;
          const code = (d.departmentCode || '').toUpperCase();
          const name = (d.departmentName || '').toLowerCase();
          return (
            code !== 'ADM' &&
            code !== 'TRN' &&
            !name.includes('administration') &&
            !name.includes('training') &&
            !name.includes('hành chính')
          );
        });
        setAvailableDepartments(audienceDepts);

        // Load existing course departments
        const existingDeptIds = cDetail?.departmentIds || course.departmentIds || [];
        setSelectedDepartmentIds(existingDeptIds.map(String));

        let existingMappings = null;
        const detailSubs = Array.isArray(cDetail?.subjects)
          ? cDetail.subjects
          : (Array.isArray(cDetail?.courseSubjects) ? cDetail.courseSubjects : null);
        if (detailSubs && detailSubs.length > 0) {
          existingMappings = detailSubs;
          setSelectedSubjectIds(existingMappings.map((cs) => String(cs.subjectId)));
        } else if (course.subjects && Array.isArray(course.subjects)) {
          existingMappings = course.subjects;
          setSelectedSubjectIds(existingMappings.map((s) => String(s.subjectId)));
        } else {
          setSelectedSubjectIds(subs.map((s) => String(s.subjectId)));
        }

        // Initialize criteria from existing mappings or subject defaults
        const criteria = {};
        const sourceList = existingMappings || subs;
        sourceList.forEach((cs, idx) => {
          const subIdStr = String(cs.subjectId);
          const subObj = subs.find((s) => String(s.subjectId) === subIdStr);
          criteria[subIdStr] = {
            sequenceNo: cs.sequenceNo ?? cs.sequenceNo ?? idx + 1,
            requiredHours: cs.requiredHours ?? subObj?.defaultHours ?? 0,
            requiredSessions: cs.requiredSessions ?? subObj?.minSessions ?? 1,
            isMandatory: cs.isMandatory !== undefined ? cs.isMandatory : true,
            passingScore: cs.passingScore ?? 5
          };
        });
        setSubjectCriteria(criteria);
      } catch (err) {
        console.error('Error loading subjects/departments for UpdateCourseModal:', err);
      } finally {
        setLoadingSubjects(false);
        setLoadingDepartments(false);
      }
    };
    fetchSubjectsAndDepartments();
  }, [course.courseId, course.subjects, course.departmentIds]);

  const handleSubjectToggle = (subIdStr) => {
    setSelectedSubjectIds((prev) => {
      if (prev.includes(subIdStr)) {
        return prev.filter((id) => id !== subIdStr);
      } else {
        return [...prev, subIdStr];
      }
    });
  };

  const updateSubjectCriteria = (subIdStr, field, value) => {
    setSubjectCriteria((prev) => ({
      ...prev,
      [subIdStr]: { ...(prev[subIdStr] || { requiredHours: 0, requiredSessions: 1, isMandatory: true, passingScore: 5, sequenceNo: 1 }), [field]: value }
    }));
  };

  // Số giờ môn học chỉ nhận số nguyên không âm — kẹp ngay khi nhập để tổng
  // thời lượng khóa học không bao giờ âm hay thập phân.
  const toNonNegativeInt = (raw) =>
    Math.max(0, Math.floor(Number(raw) || 0));

  // Thời lượng khóa học = tổng số giờ các môn đã chọn (tự động tính, không nhập tay).
  // Kẹp từng môn về số nguyên không âm để dữ liệu cũ (âm/thập phân) cũng cho tổng hợp lệ.
  const durationHours = selectedSubjectIds.reduce(
    (sum, idStr) =>
      sum + Math.max(0, Math.floor(Number(subjectCriteria[idStr]?.requiredHours) || 0)),
    0,
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (selectedSubjectIds.length === 0) {
      setErrorMsg(tr('❌ Quy tắc tuân thủ (Business Rule): Khóa học bắt buộc phải được cấu hình ít nhất 1 Môn học (Subject).'));
      return;
    }

    // Mỗi môn trong khóa phải có số giờ >= 1 (lớn hơn 0)
    const hasZeroHourSubject = selectedSubjectIds.some((idStr) => {
      const crit = subjectCriteria[idStr];
      return !(Number(crit?.requiredHours) >= 1);
    });
    if (hasZeroHourSubject) {
      const msg = tr('subject default hours must be larger than 0');
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    // Thời lượng khóa học = tổng giờ các môn → phải là số nguyên dương
    if (!Number.isInteger(durationHours) || durationHours <= 0) {
      setErrorMsg(tr('Thời lượng khóa học phải là số nguyên dương (tổng số giờ các môn học). Vui lòng kiểm tra số giờ từng môn.'));
      return;
    }

    const subjectsPayload = selectedSubjectIds.map((idStr, idx) => {
      const crit = subjectCriteria[idStr] || { requiredHours: 0, requiredSessions: 1, isMandatory: true, passingScore: 5 };
      return {
        subjectId: Number(idStr),
        sequenceNo: crit.sequenceNo ?? idx + 1,
        requiredHours: toNonNegativeInt(crit.requiredHours),
        requiredSessions: Number(crit.requiredSessions) || 1,
        isMandatory: !!crit.isMandatory,
        passingScore: Number(crit.passingScore) || 0
      };
    });

    setSubmitting(true);
    try {
      await onSave(course.courseId, {
        courseId: course.courseId,
        courseCode: courseCode.trim(),
        courseName: courseName.trim(),
        description: description.trim(),
        durationHours,
        status: status,
        departmentIds: selectedDepartmentIds.map(Number),
        subjects: subjectsPayload
      });
    } catch (err) {
      setErrorMsg(err?.message || tr('Cập nhật khóa học thất bại. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  const hasClasses = (Array.isArray(course.classes) && course.classes.length > 0) || (Number(course.activeClassesCount) > 0);

  const modalJSX = (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 33, 71, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="modal-container" style={{ width: '700px', maxWidth: '95vw', maxHeight: '90vh', margin: 'auto' }}>
        <header className="modal-header">
          <h2>
            {tr('CẬP NHẬT THÔNG TIN KHÓA HỌC #')}{course.courseId}
            <span className="version-badge" style={{ fontSize: '12px', verticalAlign: 'middle', marginLeft: '8px' }}>
              v{course.versionNo || 1}
            </span>
          </h2>
          <button className="close-btn" type="button" onClick={onCancel} aria-label={tr('Đóng')}>
            &times;
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '24px' }}>
            {errorMsg && (
              <div style={{
                backgroundColor: '#fef2f2',
                borderLeft: '4px solid #ef4444',
                color: '#991b1b',
                padding: '12px 16px',
                borderRadius: '4px',
                fontSize: '13px',
                marginBottom: '20px'
              }}>
                <strong>{tr('Lỗi Cập Nhật: ')}</strong>{errorMsg}
              </div>
            )}

            {course.status === 'Active' && hasClasses && (
              <div style={{
                backgroundColor: '#eff6ff',
                borderLeft: '4px solid #3b82f6',
                color: '#1e40af',
                padding: '12px 16px',
                borderRadius: '4px',
                fontSize: '12px',
                marginBottom: '16px',
                lineHeight: '1.5'
              }}>
                ℹ️ <strong>{tr('Lưu ý phiên bản giáo trình:')}</strong> {tr('Khóa học này đã được kích hoạt và có lớp học liên kết. Cấu hình môn học (Syllabus) được bảo vệ bất biến để đảm bảo tính toàn vẹn hồ sơ đào tạo ETR. Nếu bạn muốn điều chỉnh danh sách môn học hoặc thời lượng, hãy sử dụng tính năng')} <strong>{tr('🔄 Tạo bản mới (Clone Version)')}</strong> {tr('tại bảng danh sách.')}
              </div>
            )}

            {/* Basic Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e0e4e9', paddingBottom: '6px' }}>
                {tr('Thông tin khóa học')}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="update-course-code" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                    {tr('Mã khóa học *')}
                  </label>
                  <input
                    id="update-course-code"
                    type="text"
                    className="premium-input"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="update-course-duration" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                    {tr('Thời lượng (Giờ) *')} {tr('(Tự động = tổng giờ các môn)')}
                  </label>
                  <input
                    id="update-course-duration"
                    type="number"
                    className="premium-input"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', cursor: 'not-allowed', opacity: '0.8' }}
                    value={durationHours}
                    readOnly
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="update-course-name" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                  {tr('Tên khóa học *')}
                </label>
                <input
                  id="update-course-name"
                  type="text"
                  className="premium-input"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="update-course-desc" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                  {tr('Mô tả chương trình')}
                </label>
                <textarea
                  id="update-course-desc"
                  className="premium-textarea"
                  style={{ width: '100%', height: '70px', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* PHÒNG BAN / ĐỐI TƯỢNG ĐÀO TẠO ĐƯỢC PHÉP HỌC */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: '20px',
                backgroundColor: '#f8fafc',
                padding: '14px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #cbd5e1',
                  paddingBottom: '6px',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#002147',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {tr('Phòng ban / Đối tượng đào tạo')}
                  </span>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                    {tr('Để trống = Mọi phòng ban đều được phép học.')}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: selectedDepartmentIds.length > 0 ? '#e0f2fe' : '#f1f5f9',
                    color: selectedDepartmentIds.length > 0 ? '#0369a1' : '#475569',
                    border: selectedDepartmentIds.length > 0 ? '1px solid #bae6fd' : '1px solid #cbd5e1',
                  }}
                >
                  {selectedDepartmentIds.length > 0
                    ? `🎯 ${tr('Đã giới hạn')} (${selectedDepartmentIds.length})`
                    : `🌐 ${tr('Tất cả phòng ban')}`}
                </span>
              </div>

              {loadingDepartments ? (
                <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                  {tr('Đang tải danh sách phòng ban...')}
                </div>
              ) : departmentLoadError ? (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#dc2626',
                    backgroundColor: '#fef2f2',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #fecaca',
                  }}
                >
                  ⚠️ {tr('Không thể tải danh sách phòng ban do lỗi máy chủ (Database chưa áp dụng Migration). Vui lòng thử lại sau.')}
                </div>
              ) : availableDepartments.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                  {tr('Không có danh mục phòng ban. Khóa học mở cho mọi học viên.')}
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '8px',
                    marginTop: '2px',
                  }}
                >
                  {availableDepartments.map((dept) => {
                    const isChecked = selectedDepartmentIds.includes(String(dept.departmentId));
                    return (
                      <label
                        key={dept.departmentId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          backgroundColor: isChecked ? '#eff6ff' : '#ffffff',
                          border: isChecked ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: isChecked ? 600 : 400,
                          color: isChecked ? '#1d4ed8' : '#334155',
                          transition: 'all 0.15s ease-in-out',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const strId = String(dept.departmentId);
                            setSelectedDepartmentIds((prev) =>
                              prev.includes(strId)
                                ? prev.filter((id) => id !== strId)
                                : [...prev, strId]
                            );
                          }}
                          style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                        />
                        <span>{dept.departmentName}</span>
                        {dept.departmentCode && (
                          <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: 'auto' }}>
                            {dept.departmentCode}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Course Subjects Configuration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e4e9', paddingBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {tr('Cấu hình Môn học (COURSE_SUBJECTS) *')}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: selectedSubjectIds.length > 0 ? '#16a34a' : '#dc2626' }}>
                  {selectedSubjectIds.length > 0 ? `${tr('✓ Đã chọn')} ${selectedSubjectIds.length} ${tr('môn')}` : tr('❌ Chọn ít nhất 1 môn')}
                </span>
              </div>

              {loadingSubjects ? (
                <div style={{ fontSize: '12px', color: '#64748b' }}>{tr('Đang tải danh sách môn học...')}</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  {availableSubjects.map((sub) => {
                    const subIdStr = String(sub.subjectId);
                    const isChecked = selectedSubjectIds.includes(subIdStr);
                    return (
                      <label key={sub.subjectId} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSubjectToggle(subIdStr)}
                        />
                        <span style={{ fontWeight: isChecked ? 700 : 400, color: isChecked ? '#002147' : '#475569' }}>
                          [{sub.subjectCode}] {sub.subjectName}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {selectedSubjectIds.length > 0 && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', background: '#f1f5f9', fontSize: '11px', fontWeight: 700, color: '#002147', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {tr('⚙️ Tiêu chí từng môn học (Thời gian học, Điểm đạt, Bắt buộc)')}
                  </div>
                  {availableSubjects
                    .filter((s) => selectedSubjectIds.includes(String(s.subjectId)))
                    .map((sub, idx) => {
                      const subIdStr = String(sub.subjectId);
                      const crit = subjectCriteria[subIdStr] || { requiredHours: 0, isMandatory: true, passingScore: 5 };
                      return (
                        <div key={sub.subjectId} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 0.8fr 0.6fr', gap: '10px', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fbfdff' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>
                            <span style={{ color: '#c5a059', fontWeight: 800 }}>#{idx + 1}</span> [{sub.subjectCode}] {sub.subjectName}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{tr('Số giờ cần học')}</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={crit.requiredHours}
                              onChange={(e) => updateSubjectCriteria(subIdStr, 'requiredHours', toNonNegativeInt(e.target.value))}
                              style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', outline: 'none' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{tr('Điểm để pass')} (0-100)</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={crit.passingScore}
                              onChange={(e) => {
                                const v = parseInt(e.target.value) || 0;
                                updateSubjectCriteria(subIdStr, 'passingScore', Math.min(100, Math.max(0, v)));
                              }}
                              style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', outline: 'none' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{tr('Số buổi yêu cầu')} *</span>
                            <input
                              type="number"
                              min="1"
                              value={crit.requiredSessions ?? 1}
                              onChange={(e) => updateSubjectCriteria(subIdStr, 'requiredSessions', parseInt(e.target.value) || 1)}
                              style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', outline: 'none' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{tr('Bắt buộc')}</span>
                            <input
                              type="checkbox"
                              checked={!!crit.isMandatory}
                              onChange={(e) => updateSubjectCriteria(subIdStr, 'isMandatory', e.target.checked)}
                              style={{ width: '15px', height: '15px' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Status */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="update-course-status" style={{ fontSize: '12px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                {tr('Trạng thái Khóa học *')}
              </label>
              <select
                id="update-course-status"
                className="premium-input"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Draft">{tr('🟡 Draft (Bản nháp - đang biên soạn)')}</option>
                <option value="Active">{tr('🟢 Active (Kích hoạt - sẵn sàng mở lớp)')}</option>
                <option value="Archived">{tr('⚪ Archived (Lưu trữ / Ngừng mở lớp)')}</option>
              </select>
            </div>

            {/* Completion Requirements Section (Phase 1 & Phase 4) */}
            <CompletionRequirementsSection
              courseId={course.courseId}
              isLocked={course.status === 'Active' && hasClasses}
              versionNo={course.versionNo || 1}
            />
          </div>

          <footer className="modal-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e0e4e9' }}>
            <button className="cancel-btn" type="button" onClick={onCancel} disabled={submitting}>
              {tr('HỦY BỎ')}
            </button>
            <button className="save-btn gold-gradient-btn" type="submit" disabled={submitting || selectedSubjectIds.length === 0}>
              {submitting ? tr('ĐANG LƯU...') : tr('LƯU THAY ĐỔI KHÓA HỌC')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
};

export default UpdateCourseModal;
