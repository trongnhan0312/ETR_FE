import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';

const CreateCourse = ({ onSave, onCancel, nextCourseCode }) => {
  const { tr } = useLanguage();
  const [code, setCode] = useState(nextCourseCode || 'AV-MNT-102');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [duration, setDuration] = useState(0);
  const [description, setDescription] = useState('');
  const toast = useToast();

  // Subjects selection state (Business Rule: Course MUST have at least 1 Subject)
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Grade weights
  const [theory, setTheory] = useState(40);
  const [practice, setPractice] = useState(40);
  const [assignment, setAssignment] = useState(10);
  const [attendance, setAttendance] = useState(10);

  const [status, setStatus] = useState('HOẠT ĐỘNG');

  const totalWeight = theory + practice + assignment + attendance;
  const isWeightValid = totalWeight === 100;
  const isSubjectValid = selectedSubjectIds.length > 0;

  // Load available subjects from API
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const data = await api.get('/Subjects').catch(() => []);
        const subjectsArr = Array.isArray(data) ? data : [];
        
        if (subjectsArr.length > 0) {
          setAvailableSubjects(subjectsArr);
          setSelectedSubjectIds(subjectsArr.map((s) => String(s.subjectId)));
        } else {
          const demoSubjects = [
            { subjectId: 1, subjectCode: 'SJ-REG', subjectName: 'Aviation Regulations & Compliance', defaultHours: 20 },
            { subjectId: 2, subjectCode: 'SJ-SYS', subjectName: 'Aircraft Systems Fundamentals', defaultHours: 40 },
            { subjectId: 3, subjectCode: 'SJ-PRA', subjectName: 'Practical Maintenance Skills', defaultHours: 50 },
            { subjectId: 4, subjectCode: 'SJ-SAF', subjectName: 'Safety & Human Factors', defaultHours: 10 },
          ];
          setAvailableSubjects(demoSubjects);
          setSelectedSubjectIds(demoSubjects.map((s) => String(s.subjectId)));
        }
      } catch (err) {
        console.error('Error fetching subjects for CreateCourse:', err);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, []);

  // Auto-calculate duration from selected subjects' defaultHours
  useEffect(() => {
    const total = availableSubjects
      .filter((s) => selectedSubjectIds.includes(String(s.subjectId)))
      .reduce((sum, s) => sum + (s.defaultHours || 0), 0);
    setDuration(total);
  }, [selectedSubjectIds, availableSubjects]);

  const handleNameChange = (e) => {
    const val = e.target.value;
    if (/[^a-zA-Z0-9\s\-',.()&/]/.test(val)) {
      setNameError(tr('Tên khóa học không được chứa ký tự đặc biệt.'));
    } else {
      setNameError('');
    }
    setName(val);
  };

  const handleSubjectToggle = (subIdStr) => {
    setSelectedSubjectIds((prev) => {
      if (prev.includes(subIdStr)) {
        return prev.filter((id) => id !== subIdStr);
      } else {
        return [...prev, subIdStr];
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (nameError) {
      toast.error(tr('Lỗi xác thực'), tr('Tên khóa học không được chứa ký tự đặc biệt.'));
      return;
    }

    if (!name.trim()) {
      toast.error(tr('Lỗi xác thực'), tr('Vui lòng nhập tên khóa học.'));
      return;
    }

    if (theory < 0 || practice < 0 || assignment < 0 || attendance < 0) {
      toast.error(tr('Lỗi xác thực'), tr('Điểm đánh giá không được âm.'));
      return;
    }

    if (!isWeightValid) {
      toast.warning(tr("Trọng số không hợp lệ"), tr("Tổng trọng số điểm đánh giá phải bằng 100%!"));
      return;
    }

    if (!isSubjectValid) {
      toast.error(
        tr("Quy tắc tuân thủ (Business Rule)"),
        tr("Một Khóa học (COURSE) phải có ít nhất một Môn học (SUBJECT) được cấu hình trước khi mở ghi danh!")
      );
      return;
    }

    const structure = {};
    if (theory > 0) structure.theory = theory;
    if (practice > 0) structure.practice = practice;
    if (assignment > 0) structure.assignment = assignment;
    if (attendance > 0) structure.attendance = attendance;

    const chosenSubjects = availableSubjects.filter((s) =>
      selectedSubjectIds.includes(String(s.subjectId))
    );

    const newCourse = {
      code,
      name: name.trim(),
      duration,
      description,
      structure,
      selectedSubjectIds,
      subjects: chosenSubjects,
      attendanceProgress: 100,
      activeClassesCount: 0,
      classes: [],
      status: status === 'HOẠT ĐỘNG' ? 'Active' : 'Pending'
    };

    onSave(newCourse);
  };

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
      <div className="modal-container" style={{ width: '750px', maxWidth: '95vw', maxHeight: '90vh', margin: 'auto' }}>
        <header className="modal-header">
          <h2>{tr('TẠO KHÓA HỌC MỚI (CẤU HÌNH MÔN HỌC BẮT BUỘC)')}</h2>
          <button className="close-btn" type="button" onClick={onCancel} aria-label={tr('Đóng')}>
            &times;
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '24px' }}>
            
            <div style={{
              backgroundColor: '#eff6ff',
              borderLeft: '4px solid #3b82f6',
              color: '#1e40af',
              padding: '12px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              lineHeight: '1.5',
              marginBottom: '20px'
            }}>
              📌 <strong>{tr('Quy tắc nghiệp vụ ETR bắt buộc (Section 3 - Business Rules):')}</strong><br />
              <i>{tr('"Một Khóa học (COURSE) phải có ít nhất một Môn học (SUBJECT) được cấu hình trong COURSE_SUBJECT trước khi mở ghi danh (Enrollment)."')}</i>
            </div>

            {/* Basic Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#002147', borderBottom: '1px solid #e0e4e9', paddingBottom: '8px' }}>
                {tr('THÔNG TIN CƠ BẢN KHÓA HỌC')}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="course-code">{tr('Mã khóa học *')}</label>
                  <input
                    id="course-code"
                    type="text"
                    placeholder={tr('Ví dụ: AV-MNT-102')}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
               <div className="form-group">
                   <label htmlFor="course-duration">{tr('Thời lượng (Giờ)')} {tr('(Tự động tính từ các môn học đã chọn)')}</label>
                   <input
                     id="course-duration"
                     type="number"
                     value={duration}
                     readOnly
                     style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed', opacity: '0.8' }}
                   />
                 </div>
              </div>

               <div className="form-group">
                 <label htmlFor="course-name">{tr('Tên khóa học *')}</label>
                 <input
                   id="course-name"
                   type="text"
                   placeholder={tr('Nhập tên chương trình khóa học đào tạo (Ví dụ: Kỹ thuật Bảo trì Hệ thống Tàu bay)')}
                   value={name}
                   onChange={handleNameChange}
                   required
                 />
                 {nameError && (
                   <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', fontWeight: '600' }}>
                     {nameError}
                   </div>
                 )}
               </div>

              <div className="form-group">
                <label htmlFor="course-desc">{tr('Mô tả khóa học')}</label>
                <textarea
                  id="course-desc"
                  className="premium-textarea"
                  style={{ height: '70px', padding: '10px 14px', borderRadius: '4px', border: '1px solid #e0e4e8', fontSize: '14px', width: '100%', outline: 'none' }}
                  placeholder={tr('Nhập tóm tắt nội dung chương trình đào tạo...')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* MANDATORY COURSE SUBJECTS CONFIGURATION */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e4e9', paddingBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#002147' }}>
                  {tr('CẤU HÌNH MÔN HỌC KHÓA (COURSE_SUBJECTS) *')}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: isSubjectValid ? '#16a34a' : '#dc2626' }}>
                  {isSubjectValid ? `${tr('✓ Đã chọn')} ${selectedSubjectIds.length} ${tr('môn học (Đạt điều kiện)')}` : tr('❌ Chọn ít nhất 1 môn học')}
                </span>
              </div>

              {loadingSubjects ? (
                <div style={{ fontSize: '13px', color: '#64748b', padding: '8px 0' }}>{tr('Đang tải danh sách môn học...')}</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  {availableSubjects.map((sub) => {
                    const subIdStr = String(sub.subjectId);
                    const isChecked = selectedSubjectIds.includes(subIdStr);
                    return (
                      <label
                        key={sub.subjectId}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '10px 12px',
                          backgroundColor: isChecked ? '#ffffff' : '#f1f5f9',
                          border: isChecked ? '1px solid #c5a059' : '1px solid #cbd5e1',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSubjectToggle(subIdStr)}
                          style={{ marginTop: '3px' }}
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#002147' }}>
                            [{sub.subjectCode}] {sub.subjectName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            {tr('Thời lượng:')} {sub.defaultHours || 20} {tr('giờ')} | {tr('Hình thức:')} {sub.assessmentMethod || 'Exam'}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {!isSubjectValid && (
                <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                  {tr('⚠️ Bắt buộc phải chọn ít nhất 1 môn học. Khóa học không có môn học sẽ bị Backend chặn tuyệt đối khi Ghi danh.')}
                </div>
              )}
            </div>

            {/* Grade Structure */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#002147', borderBottom: '1px solid #e0e4e9', paddingBottom: '8px' }}>
                {tr('CẤU TRÚC ĐIỂM ĐÁNH GIÁ (TỔNG = 100%)')}
              </div>
              
               <div className="form-group">
                   <label htmlFor="course-theory">{tr('Lý thuyết (%)')}</label>
                   <input
                     id="course-theory"
                     type="number"
                     min="0"
                     max="100"
                     value={theory}
                     onChange={(e) => { const v = parseInt(e.target.value) || 0; setTheory(v < 0 ? 0 : v); }}
                     required
                   />
                 </div>
                 <div className="form-group">
                   <label htmlFor="course-practice">{tr('Thực hành (%)')}</label>
                   <input
                     id="course-practice"
                     type="number"
                     min="0"
                     max="100"
                     value={practice}
                     onChange={(e) => { const v = parseInt(e.target.value) || 0; setPractice(v < 0 ? 0 : v); }}
                     required
                   />
                 </div>

               <div className="form-row">
                 <div className="form-group">
                   <label htmlFor="course-assign">{tr('Assignment (%)')}</label>
                   <input
                     id="course-assign"
                     type="number"
                     min="0"
                     max="100"
                     value={assignment}
                     onChange={(e) => { const v = parseInt(e.target.value) || 0; setAssignment(v < 0 ? 0 : v); }}
                     required
                   />
                 </div>
                 <div className="form-group">
                   <label htmlFor="course-attend">{tr('Chuyên cần (%)')}</label>
                   <input
                     id="course-attend"
                     type="number"
                     min="0"
                     max="100"
                     value={attendance}
                     onChange={(e) => { const v = parseInt(e.target.value) || 0; setAttendance(v < 0 ? 0 : v); }}
                     required
                   />
                 </div>
               </div>

              {/* Total weight display */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: isWeightValid ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                border: `1px solid ${isWeightValid ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                borderRadius: '4px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isWeightValid ? '#22c55e' : '#ef4444'
                  }} />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#002147' }}>
                    {tr('TỔNG CỘNG TRỌNG SỐ:')} {totalWeight}%
                  </span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: isWeightValid ? '#16a34a' : '#dc2626' }}>
                  {isWeightValid ? tr('Hợp lệ (100%)') : tr('Trọng số phải bằng 100%')}
                </span>
              </div>
            </div>

            {/* Initial Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#002147', borderBottom: '1px solid #e0e4e9', paddingBottom: '8px' }}>
                {tr('TRẠNG THÁI HOẠT ĐỘNG')}
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#002147', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="course-status"
                    value="HOẠT ĐỘNG"
                    checked={status === 'HOẠT ĐỘNG'}
                    onChange={() => setStatus('HOẠT ĐỘNG')}
                  />
                  <span>{tr('Hoạt động (Sẵn sàng mở lớp & ghi danh)')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#002147', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="course-status"
                    value="TẠM DỪNG"
                    checked={status === 'TẠM DỪNG'}
                    onChange={() => setStatus('TẠM DỪNG')}
                  />
                  <span>{tr('Tạm dừng (Chưa mở ghi danh)')}</span>
                </label>
              </div>
            </div>
          </div>

          <footer className="modal-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e0e4e9' }}>
            <button className="cancel-btn" type="button" onClick={onCancel}>
              {tr('HỦY BỎ')}
            </button>
            <button className="save-btn gold-gradient-btn" type="submit" disabled={!isWeightValid || !isSubjectValid}>
              {tr('TẠO KHÓA HỌC & CẤU HÌNH MÔN HỌC')}
            </button>
          </footer>
        </form>
      </div>

      {/* Toast notifications */}
      <toast.ToastContainer />
    </div>
  );

  return createPortal(modalJSX, document.body);
};

export default CreateCourse;
