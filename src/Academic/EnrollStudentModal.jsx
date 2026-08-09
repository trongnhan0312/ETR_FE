import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const EnrollStudentModal = ({ classes = [], initialClassId = null, onSave, onCancel }) => {
  const { tr } = useLanguage();
  const isClassCompletedOrCancelled = (cls) => {
    const st = (cls?.statusRaw || cls?.status || '').toLowerCase();
    return st === 'completed' || st === 'đã kết thúc' || st === 'cancelled' || st === 'đã hủy';
  };

  const eligibleClasses = classes.filter((c) => !isClassCompletedOrCancelled(c));
  const initialValidId = initialClassId && !isClassCompletedOrCancelled(classes.find(c => String(c.classId) === String(initialClassId)) || {})
    ? initialClassId
    : (eligibleClasses[0]?.classId || classes[0]?.classId || '');

  const [selectedClassId, setSelectedClassId] = useState(initialValidId);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [students, setStudents] = useState([]);
  const [ongoingEtrMap, setOngoingEtrMap] = useState({}); // courseId -> Set(accountId)
  const [enrolledClassMap, setEnrolledClassMap] = useState({}); // classId -> Set(accountId)
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [courseSubjectWarning, setCourseSubjectWarning] = useState('');
  const [courseHasNoSubjects, setCourseHasNoSubjects] = useState(false);

  // Fetch Accounts, UserProfiles, Enrollments & Etr records to detect ongoing ETRs
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingStudents(true);
        const [accounts, profiles, enrollments, etrRecords, allClasses] = await Promise.all([
          api.get('/Accounts').catch(() => []),
          api.get('/UserProfiles/learners').catch(() => []),
          api.get('/Enrollments').catch(() => []),
          api.get('/Etr').catch(() => []),
          api.get('/Classes').catch(() => [])
        ]);

        const accsArr = Array.isArray(accounts) ? accounts : [];
        const profsArr = Array.isArray(profiles) ? profiles : [];
        const enrsArr = Array.isArray(enrollments) ? enrollments : [];
        const etrsArr = Array.isArray(etrRecords) ? etrRecords : [];
        const classesArr = Array.isArray(allClasses) ? allClasses : [];

        // 1. Filter student accounts (roleId === 6 or role === 'student')
        const studentAccs = accsArr.filter((acc) => {
          const rId = Number(acc.roleId);
          const mappedRole = (acc.role || acc.roleName || '').toLowerCase();
          return rId === 6 || mappedRole === 'student';
        });

        const mappedStudents = studentAccs.map((acc) => {
          const prof = profsArr.find((p) => String(p.accountId) === String(acc.accountId));
          return {
            accountId: acc.accountId,
            username: acc.username,
            fullName: prof?.fullName || acc.username || `Học viên #${acc.accountId}`,
            userCode: prof?.userCode || 'N/A',
            email: prof?.email || acc.username
          };
        });

        setStudents(mappedStudents);

        // 2. Build ongoing ETR map: courseId -> Set of accountIds with ongoing (!isLocked) ETR
        const courseOngoingAccountMap = {}; // courseId -> Set(accountId)

        etrsArr.forEach((etr) => {
          const isOngoing = !etr.isLocked && etr.status !== 'Completed';
          if (!isOngoing) return;

          // Find associated enrollment
          const enr = enrsArr.find((e) => String(e.enrollmentId) === String(etr.enrollmentId));
          const accId = enr?.accountId || etr.accountId;
          const clsId = enr?.classId || etr.classId;

          // Find courseId from class
          const cls = classesArr.find((c) => String(c.classId) === String(clsId));
          const cId = cls?.courseId || etr.courseId;

          if (accId && cId) {
            const courseKey = String(cId);
            if (!courseOngoingAccountMap[courseKey]) {
              courseOngoingAccountMap[courseKey] = new Set();
            }
            courseOngoingAccountMap[courseKey].add(Number(accId));
          }
        });

        setOngoingEtrMap(courseOngoingAccountMap);

        // 3. Build enrolled-in-class map: classId -> Set of accountIds already enrolled (not withdrawn/deleted)
        const classEnrolledMap = {}; // classId -> Set(accountId)
        enrsArr.forEach((enr) => {
          const st = (enr.status || '').toLowerCase();
          if (st === 'withdrawn' || st === 'deleted' || enr.isDeleted) return;
          if (!enr.accountId || !enr.classId) return;
          const clsKey = String(enr.classId);
          if (!classEnrolledMap[clsKey]) classEnrolledMap[clsKey] = new Set();
          classEnrolledMap[clsKey].add(Number(enr.accountId));
        });
        setEnrolledClassMap(classEnrolledMap);
      } catch (err) {
        console.error('Error fetching data for Enrollment Modal:', err);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchData();
  }, []);

  // Compute selected class object and target course ID
  const selectedClassObj = useMemo(() => {
    return classes.find((c) => String(c.classId) === String(selectedClassId));
  }, [classes, selectedClassId]);

  const targetCourseId = selectedClassObj?.courseId;

  // Compute students list with hasOngoingEtr + alreadyEnrolledInClass flags for current selected class/course
  const studentListWithStatus = useMemo(() => {
    const courseKey = targetCourseId ? String(targetCourseId) : null;
    const ongoingAccSet = courseKey ? (ongoingEtrMap[courseKey] || new Set()) : new Set();
    const classKey = selectedClassId ? String(selectedClassId) : null;
    const enrolledAccSet = classKey ? (enrolledClassMap[classKey] || new Set()) : new Set();

    return students.map((stu) => ({
      ...stu,
      hasOngoingEtr: ongoingAccSet.has(Number(stu.accountId)),
      alreadyEnrolledInClass: enrolledAccSet.has(Number(stu.accountId))
    }));
  }, [students, targetCourseId, selectedClassId, ongoingEtrMap, enrolledClassMap]);

  // Auto select first eligible student (without ongoing ETR or duplicate in this class) when class changes
  useEffect(() => {
    if (studentListWithStatus.length === 0) return;

    const currentSelected = studentListWithStatus.find(s => String(s.accountId) === String(selectedAccountId));
    if (!currentSelected || currentSelected.hasOngoingEtr || currentSelected.alreadyEnrolledInClass) {
      const firstEligible = studentListWithStatus.find(s => !s.hasOngoingEtr && !s.alreadyEnrolledInClass);
      if (firstEligible) {
        setSelectedAccountId(String(firstEligible.accountId));
      } else {
        setSelectedAccountId('');
      }
    }
  }, [selectedClassId, studentListWithStatus]);

  // Check course subjects warning
  useEffect(() => {
    setErrorMsg('');
    setCourseSubjectWarning('');
    setCourseHasNoSubjects(false);
    if (!selectedClassId) return;

    if (selectedClassObj) {
      if (isClassCompletedOrCancelled(selectedClassObj)) {
        setCourseSubjectWarning(tr('⛔ Lớp học này ở trạng thái Đã kết thúc / Đã hủy — Không thể ghi danh.'));
        return;
      }        if (selectedClassObj.courseId) {
          api.get(`/Courses/${selectedClassObj.courseId}`).then((cDetail) => {
            if (cDetail && Array.isArray(cDetail.courseSubjects) && cDetail.courseSubjects.length === 0) {
              setCourseSubjectWarning(`⚠️ ${tr('Khóa học')} "${cDetail.courseName || selectedClassObj.name}" (ID: ${selectedClassObj.courseId}) ${tr('chưa được cấu hình môn học (Subject). Theo quy tắc nghiệp vụ ETR, không thể ghi danh vào khóa chưa có môn học.')}`);
              setCourseHasNoSubjects(true);
            }
          }).catch(() => {});
        }
    }
  }, [selectedClassId, selectedClassObj]);

  const parseEnrollmentError = (err) => {
    if (!err) return tr('Ghi danh thất bại. Vui lòng thử lại.');
    const raw = err.message || String(err);

    if (raw.includes('already enrolled') || raw.includes('ongoing ETR') || raw.includes('active class for this course')) {
      return tr('❌ Quy tắc tuân thủ ETR Hàng không (Business Rule Violation): Học viên này đã được ghi danh vào một Lớp học thuộc Khóa học này và đang có Hồ sơ ETR chưa hoàn thành (InProgress). Theo quy định ETR, mỗi học viên chỉ được có 01 Hồ sơ ETR đang diễn ra cho 01 Khóa học tại một thời điểm. Vui lòng chọn Học viên khác.');
    }
    if (raw.includes('OperationCanceledException') || raw.includes('TaskCanceledException') || raw.includes('operation was canceled')) {
      return tr('ℹ️ Thao tác ghi danh bị hủy do ngắt kết nối giữa chừng hoặc chuyển trang. Vui lòng thực hiện lại.');
    }
    if (raw.includes('no subjects configured') || raw.includes('has no subjects') || raw.includes('BusinessRuleViolationException')) {
      const matchCourseId = raw.match(/Course \(ID: (\d+)\)/);
      const courseIdStr = matchCourseId ? ` (Course ID: ${matchCourseId[1]})` : '';
      return `${tr('❌ Quy tắc tuân thủ (Business Rule Violation): Khóa học')}${courseIdStr} ${tr('chưa được cấu hình môn học (Subject). Theo quy định ETR hàng không, Khóa học phải có ít nhất 1 môn học trước khi mở ghi danh. Vui lòng chọn Khóa học đã cấu hình môn học.')}`;
    }
    if (raw.includes('completed') || raw.includes('đã kết thúc')) {
      return tr('❌ Quy tắc nghiệp vụ: Lớp học đã kết thúc không được phép ghi danh mới.');
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed.message) return parsed.message;
      if (parsed.title) return parsed.title;
    } catch {}

    return raw;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedClassId || !selectedAccountId) {
      setErrorMsg(tr('Vui lòng chọn đầy đủ Lớp học và Học viên khả dụng.'));
      return;
    }

    if (selectedClassObj && isClassCompletedOrCancelled(selectedClassObj)) {
      setErrorMsg(tr('❌ Quy tắc nghiệp vụ: Lớp học ở trạng thái "Đã kết thúc" hoặc "Đã hủy" KHÔNG được phép ghi danh học viên mới.'));
      return;
    }

    if (courseHasNoSubjects) {
      setErrorMsg(tr('❌ Quy tắc tuân thủ (Business Rule Violation): Khóa học này chưa được cấu hình môn học (Subject). Theo quy định ETR hàng không, Khóa học phải có ít nhất 1 môn học trước khi mở ghi danh.'));
      return;
    }

    const selectedStu = studentListWithStatus.find(s => String(s.accountId) === String(selectedAccountId));
    if (selectedStu && selectedStu.alreadyEnrolledInClass) {
      setErrorMsg(tr('❌ Quy tắc nghiệp vụ: Học viên này đã được ghi danh vào đúng Lớp học này. Không cho phép ghi danh trùng lặp.'));
      return;
    }
    if (selectedStu && selectedStu.hasOngoingEtr) {
      setErrorMsg(tr('❌ Quy tắc tuân thủ ETR: Học viên này đang có Hồ sơ ETR chưa đóng bằng (InProgress) cho Khóa học này. Vui lòng chọn Học viên chưa có ETR đang diễn ra.'));
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        classId: Number(selectedClassId),
        accountId: Number(selectedAccountId)
      });
    } catch (err) {
      setErrorMsg(parseEnrollmentError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedStudentObj = studentListWithStatus.find((s) => String(s.accountId) === String(selectedAccountId));
  const isSelectedClassDisabled = selectedClassObj && isClassCompletedOrCancelled(selectedClassObj);
  const eligibleStudentsCount = studentListWithStatus.filter(s => !s.hasOngoingEtr && !s.alreadyEnrolledInClass).length;

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
          <h2>{tr('GHI DANH HỌC VIÊN VÀO LỚP HỌC')}</h2>
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
                padding: '14px 18px',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '20px',
                lineHeight: '1.6',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <strong>{tr('Thông báo từ Hệ thống ETR:')}</strong>
                <div style={{ marginTop: '4px' }}>{errorMsg}</div>
              </div>
            )}

            {courseSubjectWarning && !errorMsg && (
              <div style={{
                backgroundColor: '#fff7ed',
                borderLeft: '4px solid #f97316',
                color: '#c2410c',
                padding: '12px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '20px',
                lineHeight: '1.5'
              }}>
                {courseSubjectWarning}
              </div>
            )}

            {/* Class selection */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="enroll-class-select" style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                {tr('Chọn Lớp học đào tạo *')}
              </label>
              <select
                id="enroll-class-select"
                className="premium-input"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #e0e4e8', fontSize: '14px', outline: 'none' }}
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                required
              >
                {classes.map((cls) => {
                  const disabled = isClassCompletedOrCancelled(cls);
                  return (
                    <option key={cls.classId} value={cls.classId} disabled={disabled} style={{ color: disabled ? '#94a3b8' : 'inherit' }}>
                      {cls.code || cls.classCode} - {cls.name || cls.className} ({cls.status}) {disabled ? `⛔ [${tr('ĐÃ KẾT THÚC')}]` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Student selection with ongoing ETR status */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="enroll-student-select" style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  {tr('Chọn Học viên ghi danh *')}
                </label>
                <span style={{ fontSize: '12px', fontWeight: '600', color: eligibleStudentsCount > 0 ? '#16a34a' : '#dc2626' }}>
                  {eligibleStudentsCount > 0 ? `✓ ${tr('Có')} ${eligibleStudentsCount} ${tr('học viên hợp lệ')}` : tr('⚠️ Tất cả học viên đã ghi danh')}
                </span>
              </div>

              {loadingStudents ? (
                <div style={{ fontSize: '13px', color: '#64748b', padding: '8px 0' }}>{tr('Đang tải & lọc danh sách học viên...')}</div>
              ) : (
                <select
                  id="enroll-student-select"
                  className="premium-input"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #e0e4e8', fontSize: '14px', outline: 'none' }}
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  required
                >
                  {studentListWithStatus.length === 0 ? (
                    <option value="">{tr('Không có học viên nào khả dụng trong hệ thống')}</option>
                  ) : (
                    studentListWithStatus.map((stu) => {
                      const isBlocked = stu.hasOngoingEtr || stu.alreadyEnrolledInClass;
                      return (
                        <option
                          key={stu.accountId}
                          value={stu.accountId}
                          disabled={isBlocked}
                          style={{
                            color: isBlocked ? '#dc2626' : '#0f172a',
                            backgroundColor: isBlocked ? '#fef2f2' : '#ffffff'
                          }}
                        >
                          [{stu.userCode}] {stu.fullName} ({stu.email}) {stu.hasOngoingEtr ? `⛔ [${tr('ĐÃ CÓ HỒ SƠ ETR ĐANG HỌC')}]` : stu.alreadyEnrolledInClass ? `⛔ [${tr('ĐÃ GHI DANH LỚP NÀY')}]` : ''}
                        </option>
                      );
                    })
                  )}
                </select>
              )}
            </div>

            {/* Selected Student info preview card */}
            {selectedStudentObj && (
              <div style={{
                backgroundColor: (selectedStudentObj.hasOngoingEtr || selectedStudentObj.alreadyEnrolledInClass) ? '#fef2f2' : '#f8fafc',
                border: `1px solid ${(selectedStudentObj.hasOngoingEtr || selectedStudentObj.alreadyEnrolledInClass) ? '#fca5a5' : '#e2e8f0'}`,
                borderRadius: '6px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#002147', textTransform: 'uppercase' }}>
                    {tr('Thông tin học viên được chọn')}
                  </div>
                  {(selectedStudentObj.hasOngoingEtr || selectedStudentObj.alreadyEnrolledInClass) && (
                    <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>
                      {selectedStudentObj.hasOngoingEtr ? tr('⛔ ĐÃ CÓ ETR ĐANG HỌC') : tr('⛔ ĐÃ GHI DANH LỚP NÀY')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  <div><strong>{tr('Họ và tên')}:</strong> {selectedStudentObj.fullName}</div>
                  <div><strong>{tr('Mã HV')}:</strong> {selectedStudentObj.userCode}</div>
                  <div><strong>Email/Username:</strong> {selectedStudentObj.email}</div>
                  <div><strong>{tr('Tài khoản ID')}:</strong> #{selectedStudentObj.accountId}</div>
                </div>
              </div>
            )}

            <div style={{ fontSize: '12px', color: '#475569', backgroundColor: '#f1f5f9', padding: '12px 16px', borderRadius: '6px', lineHeight: '1.6' }}>
              💡 <strong>{tr('Quy tắc nghiệp vụ ghi danh ETR bắt buộc (Compliance Rules):')}</strong><br />
              • {tr('Khóa học phải có ít nhất 1 môn học (Subject) được cấu hình trước khi ghi danh.')}<br />
              • {tr('Lớp học ở trạng thái')} <code>InProgress</code> {tr('hoặc')} <code>Planned</code> {tr('mới được ghi danh.')}<br />
              • <strong>{tr('Một Học viên chỉ có 01 Hồ sơ ETR đang học (InProgress) cho 01 Khóa học tại một thời điểm. Các học viên đã có ETR chưa đóng bằng sẽ bị khóa lựa chọn.')}</strong>
            </div>
          </div>

          <footer className="modal-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e0e4e9' }}>
            <button className="cancel-btn" type="button" onClick={onCancel} disabled={submitting}>
              {tr('HỦY BỎ')}
            </button>
            <button
              className="save-btn gold-gradient-btn"
              type="submit"
              disabled={submitting || eligibleStudentsCount === 0 || isSelectedClassDisabled || courseHasNoSubjects || (selectedStudentObj && (selectedStudentObj.hasOngoingEtr || selectedStudentObj.alreadyEnrolledInClass))}
            >
              {submitting ? tr('ĐANG GHI DANH...') : tr('XÁC NHẬN GHI DANH')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
};

export default EnrollStudentModal;
