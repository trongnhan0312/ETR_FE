import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import "./instructor.scss";

const InstructorAttendance = () => {
  const [classesData, setClassesData] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  
  // Student list and attendance records
  const [students, setStudents] = useState([]);
  const [sessionAttendance, setSessionAttendance] = useState([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedBy, setConfirmedBy] = useState("");
  
  // Note remarks modal state
  const [remarkModalStudent, setRemarkModalStudent] = useState(null);
  const [remarkText, setRemarkText] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load all assigned classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      try {
        const [apiClasses, apiCourses] = await Promise.all([
          api.get("/classes").catch(() => []),
          api.get("/courses").catch(() => [])
        ]);

        const mapped = apiClasses.map((cls, idx) => {
          const course = apiCourses.find(c => c.courseId === cls.courseId);
          return {
            classId: cls.classId,
            stt: String(idx + 1).padStart(2, "0"),
            code: cls.classCode || `CL-${cls.classId}`,
            name: cls.className || "Lớp đào tạo",
            subName: course ? course.courseName : "Chuyên đề huấn luyện",
            courseKey: course ? String(course.courseId) : "N/A",
            schedule: cls.schedule || "Chưa sắp lịch",
            time: cls.time || "08:00 - 11:30",
            studentsCount: "0/0",
            status: cls.status || "Đang diễn ra"
          };
        });
        setClassesData(mapped);
        if (mapped.length > 0) {
          setSelectedClassId(mapped[0].classId);
        }
      } catch (err) {
        console.error("Lỗi khi tải danh sách lớp học:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  // Fetch sessions when a class is selected
  useEffect(() => {
    if (!selectedClassId) return;
    const fetchSessions = async () => {
      try {
        const apiSessions = await api.get("/sessions").catch(() => []);
        const filtered = apiSessions.filter(s => s.classId === parseInt(selectedClassId));
        
        // Map session attendance counts
        const mapped = await Promise.all(filtered.map(async (s, idx) => {
          const rawDate = s.sessionDate;
          let dateStr = "N/A";
          if (rawDate) {
            const d = new Date(rawDate);
            dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
          }
          
          return {
            sessionId: s.sessionId,
            stt: String(idx + 1).padStart(2, "0"),
            date: dateStr,
            name: s.sessionTitle || "Buổi học",
            room: s.location || "Phòng học",
            instructor: "Nguyễn Văn A",
            attendance: s.isConfirmed ? "Đã chốt" : "Chưa chốt",
            isConfirmed: s.isConfirmed || false,
            rate: 100
          };
        }));
        setSessions(mapped);
      } catch (err) {
        console.error("Lỗi khi tải danh sách buổi học:", err);
      }
    };
    fetchSessions();
  }, [selectedClassId]);

  // Load students and attendance records when a session is selected
  const loadAttendance = async (session) => {
    setSelectedSession(session);
    setLoading(true);
    try {
      // 1. Get class details and enrollments to get students
      const [allEnrollments, allProfiles] = await Promise.all([
        api.get("/enrollments").catch(() => []),
        api.get("/userprofiles").catch(() => [])
      ]);
      
      const classEnrollments = allEnrollments.filter(e => e.classId === parseInt(selectedClassId));
      const mappedStudents = classEnrollments.map((en, idx) => {
        const profile = allProfiles.find(p => p.accountId === en.accountId);
        return {
          code: profile ? profile.employeeCode || `HV${en.accountId}` : `HV${en.accountId}`,
          name: profile ? profile.fullName : "Học viên",
          accountId: en.accountId,
          enrollmentId: en.enrollmentId,
          classStudentId: en.enrollmentId
        };
      });
      setStudents(mappedStudents);

      // 2. Fetch attendance records
      const attendanceRecords = await api.get("/attendance").catch(() => []);
      const sessionRecords = attendanceRecords.filter(a => a.sessionId === session.sessionId);
      
      // Determine if session is confirmed
      const sessionDetails = await api.get(`/sessions/${session.sessionId}`).catch(() => null);
      const isSessionLocked = sessionDetails ? sessionDetails.isConfirmed : false;
      setIsConfirmed(isSessionLocked);

      const mappedAttendance = mappedStudents.map(student => {
        const record = sessionRecords.find(r => r.accountId === student.accountId);
        return {
          code: student.code,
          name: student.name,
          accountId: student.accountId,
          classStudentId: student.classStudentId,
          status: record ? record.status : "P",
          remarks: record ? record.remarks || "" : "",
          attendanceRecordId: record ? record.attendanceRecordId || record.id : null
        };
      });
      setSessionAttendance(mappedAttendance);
    } catch (err) {
      console.error("Lỗi khi tải bảng điểm danh:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (code, status) => {
    if (isConfirmed) return; // Locked
    setSessionAttendance(prev =>
      prev.map(s => s.code === code ? { ...s, status } : s)
    );
  };

  const handleSaveAttendance = async () => {
    if (isConfirmed) return;
    setSaving(true);
    try {
      await Promise.all(
        sessionAttendance.map(async (record) => {
          const payload = {
            sessionId: selectedSession.sessionId,
            classStudentId: record.classStudentId || 1,
            status: record.status,
            remarks: record.remarks || ""
          };

          if (record.attendanceRecordId) {
            // Update
            return api.put(`/attendance/${record.attendanceRecordId}`, {
              status: record.status,
              remarks: record.remarks || ""
            });
          } else {
            // Create
            return api.post("/attendance/record", payload);
          }
        })
      );
      
      alert("Lưu thông tin điểm danh thành công!");
      // Reload records to fetch new IDs
      loadAttendance(selectedSession);
    } catch (err) {
      console.error("Lỗi khi lưu điểm danh:", err);
      alert("Đã xảy ra lỗi khi lưu: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAttendance = async () => {
    if (isConfirmed) return;
    if (!window.confirm("Bạn có chắc chắn muốn chốt và khóa bảng điểm danh? Sau khi chốt sẽ không thể sửa đổi.")) return;
    
    setSaving(true);
    try {
      // First save any unsaved changes
      await Promise.all(
        sessionAttendance.map(async (record) => {
          const payload = {
            sessionId: selectedSession.sessionId,
            classStudentId: record.classStudentId || 1,
            status: record.status,
            remarks: record.remarks || ""
          };

          if (record.attendanceRecordId) {
            return api.put(`/attendance/${record.attendanceRecordId}`, {
              status: record.status,
              remarks: record.remarks || ""
            });
          } else {
            return api.post("/attendance/record", payload);
          }
        })
      );

      // Confirm / Lock session
      await api.post(`/attendance/sessions/${selectedSession.sessionId}/confirm`);
      setIsConfirmed(true);
      alert("Đã xác nhận và khóa bảng điểm danh thành công!");
      
      // Update local sessions state
      setSessions(prev => prev.map(s => s.sessionId === selectedSession.sessionId ? { ...s, isConfirmed: true, attendance: "Đã chốt" } : s));
    } catch (err) {
      console.error("Lỗi khi chốt điểm danh:", err);
      alert("Đã xảy ra lỗi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedClass = useMemo(() => {
    return classesData.find(c => c.classId === parseInt(selectedClassId));
  }, [classesData, selectedClassId]);

  // Attendance Sheet View
  if (selectedSession) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <nav className="breadcrumb-nav">
          <span className="breadcrumb-item" onClick={() => setSelectedSession(null)} style={{ cursor: 'pointer' }}>ĐIỂM DANH</span>
          <svg width="4" height="6" viewBox="0 0 4 6" fill="none"><path d="M2.3 3L0 0.7L0.7 0L3.7 3L0.7 6L0 5.3L2.3 3Z" fill="currentColor" /></svg>
          <span className="breadcrumb-item active">{selectedSession.name}</span>
        </nav>

        <section className="content-header">
          <div className="header-left">
            <h1>Điểm danh — {selectedSession.name}</h1>
            <div className="divider-gold" />
            <p className="header-description">{selectedSession.date} · {selectedSession.room} · Lớp: {selectedClass ? selectedClass.code : "N/A"}</p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={handleSaveAttendance}
              className="create-btn"
              type="button"
              disabled={isConfirmed || saving}
              style={{
                opacity: isConfirmed ? 0.6 : 1,
                cursor: isConfirmed ? "not-allowed" : "pointer"
              }}
            >
              <span>LƯU ĐIỂM DANH</span>
            </button>

            <button
              onClick={handleConfirmAttendance}
              className="create-btn"
              type="button"
              disabled={isConfirmed || saving}
              style={{
                background: isConfirmed ? "linear-gradient(159.93deg, #475569 -27.55%, #334155 127.55%)" : "linear-gradient(159.93deg, #e11d48 -27.55%, #be123c 127.55%)",
                opacity: isConfirmed ? 0.9 : 1,
                cursor: isConfirmed ? "not-allowed" : "pointer"
              }}
            >
              <span>{isConfirmed ? "ĐÃ KHÓA ĐIỂM DANH" : "CHỐT ĐIỂM DANH"}</span>
            </button>
          </div>
        </section>

        {/* Legend status indicators */}
        <div style={{ display: 'flex', gap: '20px', padding: '12px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: '700' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#22c55e', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>P</span>
            <span style={{ color: 'rgba(0,33,71,0.6)' }}>Present (Có mặt)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#eab308', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>AE</span>
            <span style={{ color: 'rgba(0,33,71,0.6)' }}>Absent Excused (Vắng có phép)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#ef4444', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>AU</span>
            <span style={{ color: 'rgba(0,33,71,0.6)' }}>Absent Unexcused (Vắng không phép)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#3b82f6', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>T</span>
            <span style={{ color: 'rgba(0,33,71,0.6)' }}>Tardy (Đi muộn)</span>
          </div>
        </div>

        {/* Attendance Sheet Table */}
        <section className="table-card">
          <div style={{
            display: 'grid', gridTemplateColumns: '60px 140px 1fr 180px 140px 100px',
            alignItems: 'center', gap: '12px',
            background: 'linear-gradient(135deg, #06234a 0%, #041b39 100%)',
            color: '#ffffff', padding: '14px 20px', fontSize: '11px', fontWeight: '700',
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            <div style={{ textAlign: 'center' }}>STT</div>
            <div>Mã học viên</div>
            <div>Học viên</div>
            <div style={{ textAlign: 'center' }}>Trạng thái điểm danh</div>
            <div style={{ textAlign: 'center' }}>Đánh giá nhận xét</div>
            <div style={{ textAlign: 'center' }}>Khóa sửa</div>
          </div>

          <div className="table-body">
            {sessionAttendance.map((student, idx) => (
              <div key={student.code} className="table-row" style={{
                display: 'grid', gridTemplateColumns: '60px 140px 1fr 180px 140px 100px',
                alignItems: 'center', gap: '12px', padding: '14px 20px'
              }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(0,33,71,0.4)', textAlign: 'center' }}>{String(idx + 1).padStart(2, "0")}</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#002147' }}>{student.code}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#002147' }}>{student.name}</span>
                
                {/* Status Toggles */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div className="attendance-toggle-group" style={{ maxWidth: '140px' }}>
                    {['P', 'AE', 'AU', 'T'].map(status => (
                      <button
                        key={status}
                        onClick={() => handleToggleStatus(student.code, status)}
                        className={`status-${status.toLowerCase()}${student.status === status ? ' active' : ''}`}
                        disabled={isConfirmed}
                        style={{
                          cursor: isConfirmed ? "not-allowed" : "pointer"
                        }}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Remarks Button */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => {
                      setRemarkModalStudent(student);
                      setRemarkText(student.remarks || "");
                    }}
                    style={{
                      padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                      border: '1px solid #dfe6f1', backgroundColor: student.remarks ? '#fffbeb' : '#f8fafc',
                      color: student.remarks ? '#d97706' : '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    <span>{student.remarks ? "Xem Note" : "Thêm Note"}</span>
                  </button>
                </div>

                {/* Lock Status */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {isConfirmed ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: '#be123c' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      Khóa
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: '#16a34a' }}>
                      Mở
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Remarks Custom Modal Overlay */}
        {remarkModalStudent && (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100 }}>
            <div className="dashboard-panel" style={{ width: '480px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
              <div className="panel-header">
                <h2>Ghi chú nhận xét — {remarkModalStudent.name}</h2>
                <div className="panel-action" onClick={() => setRemarkModalStudent(null)} style={{ cursor: 'pointer' }}>Đóng</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                <textarea
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  disabled={isConfirmed}
                  placeholder="Nhập ghi chú nhận xét về học viên..."
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #dfe6f1',
                    fontSize: '13px', outline: 'none', minHeight: '120px', resize: 'vertical'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'end', gap: '12px', marginTop: '8px' }}>
                  <button
                    onClick={() => setRemarkModalStudent(null)}
                    type="button"
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #dfe6f1', backgroundColor: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
                  >
                    HỦY BỎ
                  </button>
                  <button
                    onClick={() => {
                      if (!isConfirmed) {
                        setSessionAttendance(prev => prev.map(s => s.code === remarkModalStudent.code ? { ...s, remarks: remarkText } : s));
                      }
                      setRemarkModalStudent(null);
                    }}
                    type="button"
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#c5a059', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
                  >
                    CẬP NHẬT
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Session Selector List
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <section className="content-header">
        <div className="header-left">
          <h1>Điểm danh lớp học</h1>
          <div className="divider-gold" />
          <p className="header-description">
            Chọn lớp học và buổi học cụ thể để thực hiện điểm danh học viên.
          </p>
        </div>
      </section>

      {/* Class Selector Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px',
        background: '#ffffff', border: '1px solid #dfe6f1', borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0,33,71,0.04)',
      }}>
        <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Chọn lớp:
        </label>
        <select
          style={{
            padding: '8px 12px', borderRadius: '8px', border: '1px solid #d9e1ec',
            fontSize: '12px', fontWeight: '700', color: '#002147', outline: 'none', cursor: 'pointer'
          }}
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
        >
          {classesData.map(c => (
            <option key={c.classId} value={c.classId}>{c.name} ({c.code})</option>
          ))}
        </select>
      </div>

      {/* Sessions list */}
      <section className="table-card">
        <div className="table-header" style={{
          display: 'grid', gridTemplateColumns: '60px 120px 1fr 160px 140px 140px',
          alignItems: 'center', gap: '12px',
          background: 'linear-gradient(135deg, #06234a 0%, #041b39 100%)',
          color: '#ffffff', padding: '12px 20px', fontSize: '11px', fontWeight: '700',
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          <div style={{ textAlign: 'center' }}>STT</div>
          <div>Ngày học</div>
          <div>Chuyên đề / Buổi học</div>
          <div>Địa điểm / Phòng</div>
          <div style={{ textAlign: 'center' }}>Trạng thái chốt</div>
          <div style={{ textAlign: 'right', paddingRight: '24px' }}>Thao tác</div>
        </div>

        <div className="table-body">
          {sessions.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(0,33,71,0.4)', fontStyle: 'italic' }}>
              Không tìm thấy buổi học nào cho lớp học hiện tại.
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.sessionId}
                className="table-row"
                style={{
                  display: 'grid', gridTemplateColumns: '60px 120px 1fr 160px 140px 140px',
                  alignItems: 'center', gap: '12px', padding: '14px 20px'
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(0,33,71,0.4)', textAlign: 'center' }}>{session.stt}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#002147' }}>{session.date}</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#002147' }}>{session.name}</span>
                <span style={{ fontSize: '12px', color: 'rgba(0,33,71,0.6)' }}>{session.room}</span>
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '999px',
                    backgroundColor: session.isConfirmed ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)',
                    color: session.isConfirmed ? '#ef4444' : '#16a34a'
                  }}>
                    {session.attendance}
                  </span>
                </div>
                <div style={{ textAlign: 'right', paddingRight: '12px' }}>
                  <button
                    onClick={() => loadAttendance(session)}
                    className="ghost-btn"
                    style={{
                      padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                      backgroundColor: '#c5a059', color: 'white', border: 'none', cursor: 'pointer',
                      textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(197, 160, 89, 0.2)'
                    }}
                  >
                    Điểm danh
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default InstructorAttendance;
