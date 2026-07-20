import { useState, useEffect } from 'react';
import CreateCourse from './CreateCourse';
import CreateClass from './CreateClass';
import ClassAttendanceHistory from './ClassAttendanceHistory';
import { api } from '../utils/api';

const CourseClassManagement = () => {
  const [courses, setCourses] = useState([]);
  const [allCoursesRaw, setAllCoursesRaw] = useState([]);
  const [allClassesRaw, setAllClassesRaw] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourses, setExpandedCourses] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form rendering states
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [selectedClassForHistory, setSelectedClassForHistory] = useState(null);

  // Load all data from APIs on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [courseData, classData, subjectData, sessionData, statsData] = await Promise.all([
          api.get("/Courses").catch(() => []),
          api.get("/Classes").catch(() => []),
          api.get("/Subjects").catch(() => []),
          api.get("/Sessions").catch(() => []),
          api.get("/Dashboard/stats").catch(() => ({}))
        ]);

        const coursesArr = Array.isArray(courseData) ? courseData : [];
        const classesArr = Array.isArray(classData) ? classData : [];
        const subjectsArr = Array.isArray(subjectData) ? subjectData : [];
        const sessionsArr = Array.isArray(sessionData) ? sessionData : [];

        setAllCoursesRaw(coursesArr);
        setAllClassesRaw(classesArr);
        setAllSubjects(subjectsArr);
        setAllSessions(sessionsArr);

        // Merge courses + classes into display format
        const mergedCourses = mergeCourseData(coursesArr, classesArr, sessionsArr, statsData);
        setCourses(mergedCourses);

        // Auto-expand first course
        if (mergedCourses.length > 0) {
          setExpandedCourses({ [mergedCourses[0].code]: true });
        }
      } catch (error) {
        console.error("Error loading course data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const mergeCourseData = (coursesArr, classesArr, sessionsArr, statsData) => {
    return coursesArr.map((course) => {
      const courseClasses = classesArr.filter((c) => c.courseId === course.courseId);
      const sessionCount = sessionsArr.filter((s) => 
        courseClasses.some((cc) => cc.classId === s.classId)
      ).length;

      return {
        courseId: course.courseId,
        code: course.courseCode,
        name: course.courseName,
        description: course.description || '',
        duration: course.durationHours || 0,
        structure: { theory: 40, practice: 40, assignment: 10, attendance: 10 },
        attendanceProgress: Math.min(100, sessionCount > 0 ? 100 : 0),
        activeClassesCount: courseClasses.filter((c) => c.status === 'Active' || c.status === 'Đang diễn ra').length,
        classes: courseClasses.map((cls) => ({
          classId: cls.classId,
          code: cls.classCode,
          name: cls.className,
          startDate: cls.startDate ? new Date(cls.startDate).toLocaleDateString('vi-VN') : '',
          endDate: cls.endDate ? new Date(cls.endDate).toLocaleDateString('vi-VN') : '',
          status: cls.status === 'Active' ? 'Đang diễn ra' : cls.status === 'Upcoming' ? 'Sắp diễn ra' : cls.status === 'Completed' ? 'Đã kết thúc' : cls.status,
          attendanceRate: 0,
          instructor: 'Đang cập nhật'
        }))
      };
    });
  };

  const refreshData = async () => {
    try {
      const [courseData, classData, sessionData] = await Promise.all([
        api.get("/Courses").catch(() => []),
        api.get("/Classes").catch(() => []),
        api.get("/Sessions").catch(() => [])
      ]);

      const coursesArr = Array.isArray(courseData) ? courseData : [];
      const classesArr = Array.isArray(classData) ? classData : [];
      const sessionsArr = Array.isArray(sessionData) ? sessionData : [];

      setAllCoursesRaw(coursesArr);
      setAllClassesRaw(classesArr);
      setCourses(mergeCourseData(coursesArr, classesArr, sessionsArr, {}));
    } catch (error) {
      console.error("Error refreshing course data:", error);
    }
  };

  const toggleCourseExpand = (courseCode) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseCode]: !prev[courseCode]
    }));
  };

  const handleSaveCourse = async (newCourse) => {
    try {
      await api.post("/Courses", {
        courseCode: newCourse.code,
        courseName: newCourse.name,
        description: newCourse.description || '',
        durationHours: parseInt(newCourse.duration) || 0,
        status: 'Active'
      });
      await refreshData();
      setIsCreatingCourse(false);
    } catch (error) {
      console.error("Error creating course:", error);
      alert("Tạo khóa học thất bại: " + (error.message || "Lỗi không xác định"));
    }
  };

  const handleSaveClass = async (parentCourseId, newClass) => {
    try {
      await api.post("/Classes", {
        courseId: parentCourseId,
        classCode: newClass.code,
        className: newClass.name,
        startDate: new Date(newClass.startDate).toISOString(),
        endDate: new Date(newClass.endDate).toISOString(),
        location: '',
        capacity: 30,
        status: newClass.status === 'Đang diễn ra' ? 'Active' : newClass.status === 'Sắp diễn ra' ? 'Upcoming' : 'Completed'
      });
      await refreshData();
      setIsCreatingClass(false);

      // Auto expand the parent course
      const course = courses.find(c => c.courseId === parentCourseId);
      if (course) {
        setExpandedCourses((prev) => ({ ...prev, [course.code]: true }));
      }
    } catch (error) {
      console.error("Error creating class:", error);
      alert("Tạo lớp học thất bại: " + (error.message || "Lỗi không xác định"));
    }
  };

  // Filter & Search Logic
  const filteredCourses = courses.map((course) => {
    const matchesCourseSearch =
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchedClasses = course.classes.filter((cls) => {
      const matchesClassSearch =
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.instructor.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === 'ALL') return matchesClassSearch;
      if (statusFilter === 'ACTIVE') return matchesClassSearch && cls.status === 'Đang diễn ra';
      if (statusFilter === 'UPCOMING') return matchesClassSearch && cls.status === 'Sắp diễn ra';
      if (statusFilter === 'COMPLETED') return matchesClassSearch && cls.status === 'Đã kết thúc';
      return matchesClassSearch;
    });

    const matchesSearch = matchesCourseSearch || matchedClasses.length > 0;

    return {
      ...course,
      filteredClasses: matchedClasses,
      shouldShow: matchesSearch
    };
  }).filter((course) => course.shouldShow);

  // Statistics calculation
  const totalClasses = courses.reduce((sum, course) => sum + course.classes.length, 0);
  const totalInstructors = new Set(
    courses.flatMap((course) => course.classes.map((c) => c.instructor))
  ).size || Math.min(totalClasses, 2);

  // Conditional rendering for Attendance History view
  if (selectedClassForHistory) {
    return (
      <ClassAttendanceHistory
        activeClass={selectedClassForHistory}
        onBack={() => setSelectedClassForHistory(null)}
      />
    );
  }

  return (
    <div className="course-class-management-page">
      {/* Content Header Section */}
      <section className="content-header">
        <div className="header-left">
          <h1>Khóa &amp; Lớp học</h1>
          <div className="divider-gold" />
          <p className="header-description">
            Quản lý danh mục đào tạo và lịch trình giảng dạy hàng không chuyên nghiệp.
          </p>
        </div>

        <div className="header-actions">
          <button className="outline-btn font-gold-btn" type="button" onClick={() => setIsCreatingCourse(true)}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.66667 11.6667H8.33333V8.33333H11.6667V6.66667H8.33333V3.33333H6.66667V6.66667H3.33333V8.33333H6.66667V11.6667ZM1.66667 15C1.20833 15 0.815972 14.8368 0.489583 14.5104C0.163194 14.184 0 13.7917 0 13.3333V1.66667C0 1.20833 0.163194 0.815972 0.489583 0.489583C0.815972 0.163194 1.20833 0 1.66667 0H13.3333C13.7917 0 14.184 0.163194 14.5104 0.489583C14.8368 0.815972 15 1.20833 15 1.66667V13.3333C15 13.7917 14.8368 14.184 14.5104 14.5104C14.184 14.8368 13.7917 15 13.3333 15H1.66667ZM1.66667 13.3333H13.3333V1.66667H1.66667V13.3333Z" fill="currentColor" />
            </svg>
            <span>TẠO KHÓA HỌC</span>
          </button>

          <button className="create-btn gold-gradient-btn" type="button" onClick={() => setIsCreatingClass(true)}>
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.4167 6.625C10.8194 6.18056 11.1285 5.67361 11.3438 5.10417C11.559 4.53472 11.6667 3.94444 11.6667 3.33333C11.6667 2.72222 11.559 2.13194 11.3438 1.5625C11.1285 0.993056 10.8194 0.486111 10.4167 0.0416667C11.25 0.152778 11.9444 0.520833 12.5 1.14583C13.0556 1.77083 13.3333 2.5 13.3333 3.33333C13.3333 4.16667 13.0556 4.89583 12.5 5.52083C11.9444 6.14583 11.25 6.51389 10.4167 6.625ZM15 13.3333V10.8333C15 10.3333 14.8889 9.85764 14.6667 9.40625C14.4444 8.95486 14.1528 8.55556 13.7917 8.20833C14.5 8.45833 15.1562 8.78125 15.7604 9.17708C16.3646 9.57292 16.6667 10.125 16.6667 10.8333V13.3333H15ZM16.6667 7.5V5.83333H15V4.16667H16.6667V2.5H18.3333V4.16667H20V5.83333H18.3333V7.5H16.6667ZM6.66667 6.66667C5.75 6.66667 4.96528 6.34028 4.3125 5.6875C3.65972 5.03472 3.33333 4.25 3.33333 3.33333C3.33333 2.41667 3.65972 1.63194 4.3125 0.979167C4.96528 0.326389 5.75 0 6.66667 0C7.58333 0 8.36806 0.326389 9.02083 0.979167C9.67361 1.63194 10 2.41667 10 3.33333C10 4.25 9.67361 5.03472 9.02083 5.6875C8.36806 6.34028 7.58333 6.66667 6.66667 6.66667ZM0 13.3333V11C0 10.5278 0.121528 10.0938 0.364583 9.69792C0.607639 9.30208 0.930556 9 1.33333 8.79167C2.19444 8.36111 3.06944 8.03819 3.95833 7.82292C4.84722 7.60764 5.75 7.5 6.66667 7.5C7.58333 7.5 8.48611 7.60764 9.375 7.82292C10.2639 8.03819 11.1389 8.36111 12 8.79167C12.4028 9 12.7257 9.30208 12.9688 9.69792C13.2118 10.0938 13.3333 10.5278 13.3333 11V13.3333H0ZM6.66667 5C7.125 5 7.51736 4.83681 7.84375 4.51042C8.17014 4.18403 8.33333 3.79167 8.33333 3.33333C8.33333 2.875 8.17014 2.48264 7.84375 2.15625C7.51736 1.82986 7.125 1.66667 6.66667 1.66667C6.20833 1.66667 5.81597 1.82986 5.48958 2.15625C5.16319 2.48264 5 2.875 5 3.33333C5 3.79167 5.16319 4.18403 5.48958 4.51042C5.81597 4.83681 6.20833 5 6.66667 5ZM1.66667 11.6667H11.6667V11C11.6667 10.8472 11.6285 10.7083 11.5521 10.5833C11.4757 10.4583 11.375 10.3611 11.25 10.2917C10.5 9.91667 9.74306 9.63542 8.97917 9.44792C8.21528 9.26042 7.44444 9.16667 6.66667 9.16667C5.88889 9.16667 5.11806 9.26042 4.35417 9.44792C3.59028 9.63542 2.83333 9.91667 2.08333 10.2917C1.95833 10.3611 1.85764 10.4583 1.78125 10.5833C1.70486 10.7083 1.66667 10.8472 1.66667 11V11.6667Z" fill="currentColor" />
            </svg>
            <span>TẠO LỚP HỌC</span>
          </button>
        </div>
      </section>

      {/* Stats Dashboard */}
      <section className="courses-dashboard-top">
        <div className="stats-card-dark">
          <div className="card-bg-icon">
            <svg width="104" height="105" viewBox="0 0 104 105" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M26.6667 93.3333H40V60H26.6667V93.3333ZM80 93.3333H93.3333V26.6667H80V93.3333ZM53.3333 93.3333H66.6667V73.3333H53.3333V93.3333ZM53.3333 60H66.6667V46.6667H53.3333V60ZM13.3333 120C9.66667 120 6.52778 118.694 3.91667 116.083C1.30556 113.472 0 110.333 0 106.667V13.3333C0 9.66667 1.30556 6.52778 3.91667 3.91667C6.52778 1.30556 9.66667 0 13.3333 0H106.667C110.333 0 113.472 1.30556 116.083 3.91667C118.694 6.52778 120 9.66667 120 13.3333V106.667C120 110.333 118.694 113.472 116.083 116.083C113.472 118.694 110.333 120 106.667 120H13.3333ZM13.3333 106.667H106.667V13.3333H13.3333V106.667ZM13.3333 13.3333V106.667V13.3333Z" fill="white" />
            </svg>
          </div>
          <div className="stats-content">
            <p className="stats-title-label">THỐNG KÊ ĐÀO TẠO</p>
            <div className="stats-row">
              <div className="stat-box">
                <p className="stat-label">KHÓA HỌC</p>
                <p className="stat-value">{String(allCoursesRaw.length).padStart(2, '0')}</p>
              </div>
              <div className="stat-box">
                <p className="stat-label">LỚP HỌC</p>
                <p className="stat-value">{String(totalClasses).padStart(2, '0')}</p>
              </div>
              <div className="stat-box">
                <p className="stat-label">MÔN HỌC</p>
                <p className="stat-value">{String(allSubjects.length).padStart(2, '0')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="featured-course-card">
          <div className="featured-left">
            <div className="featured-header">
              <div className="featured-course-title">
                <h2>Kỹ thuật Bảo trì Tàu bay A320</h2>
              </div>
              <div className="featured-badge">
                <span>ĐANG TUYỂN SINH</span>
              </div>
            </div>

            <p className="featured-desc">
              Chương trình đào tạo chuyên sâu về hệ thống cơ khí, thủy lực và điện tử hàng không dành cho dòng tàu bay phản lực Airbus A320.
            </p>

            <div className="featured-footer">
              <div className="student-avatars">
                <div className="avatar" style={{ backgroundColor: '#c5a059' }}>T</div>
                <div className="avatar" style={{ backgroundColor: '#002147' }}>N</div>
                <div className="avatar" style={{ backgroundColor: '#475569' }}>H</div>
                <div className="avatar-more">+12</div>
              </div>
              <button className="featured-details-link" type="button">
                <span>Chi tiết</span>
                <svg width="5" height="8" viewBox="0 0 5 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.06667 4L0 0.933333L0.933333 0L4.93333 4L0.933333 8L0 7.06667L3.06667 4Z" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>

          <div className="featured-right">
            <div className="featured-image-gradient" />
            <div className="featured-label-badge">
              <span>TIÊU BIỂU</span>
            </div>
          </div>
        </div>
      </section>

      {/* Loading State */}
      {loading ? (
        <section className="table-card">
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
            <div style={{ fontSize: "14px", fontWeight: 600 }}>Đang tải dữ liệu...</div>
          </div>
        </section>
      ) : (
        <section className="table-card">
          {/* Table Toolbar */}
          <div className="table-toolbar">
            <div className="toolbar-left">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Tìm khóa học, lớp học hoặc giảng viên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="search-icon">
                  <path d="M11.5 6.5C11.5 9.26142 9.26142 11.5 6.5 11.5C3.73858 11.5 1.5 9.26142 1.5 6.5C1.5 3.73858 3.73858 1.5 6.5 1.5C9.26142 1.5 11.5 3.73858 11.5 6.5ZM16 14.5L11.5 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div className="toolbar-right">
              <button
                className={`filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ALL')}
              >
                TẤT CẢ
              </button>
              <button
                className={`filter-btn ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ACTIVE')}
              >
                ĐANG DIỄN RA
              </button>
              <button
                className={`filter-btn ${statusFilter === 'UPCOMING' ? 'active' : ''}`}
                onClick={() => setStatusFilter('UPCOMING')}
              >
                SẮP DIỄN RA
              </button>
            </div>
          </div>

          {/* Table Core Layout */}
          <div className="table-responsive-scroll">
            <div className="table-header course-table-grid">
              <div className="col-expand-trigger"></div>
              <div>MÃ KHÓA/LỚP</div>
              <div>TÊN KHÓA HỌC/LỚP</div>
              <div>THỜI LƯỢNG/LỊCH TRÌNH</div>
              <div>CHI TIẾT CẤU TRÚC</div>
              <div>CHUYÊN CẦN / TRẠNG THÁI</div>
              <div style={{ textAlign: 'right' }}>NHÂN SỰ / LỚP HỌC</div>
            </div>

            <div className="table-body">
              {filteredCourses.length === 0 ? (
                <div className="empty-table-state">
                  Không tìm thấy khóa học hoặc lớp học nào phù hợp.
                </div>
              ) : (
                filteredCourses.map((course) => {
                  const isExpanded = !!expandedCourses[course.code];
                  return (
                    <div key={course.code} className="course-group">
                      {/* Course Row */}
                      <div
                        className={`table-row course-table-grid course-row ${isExpanded ? 'is-expanded' : ''}`}
                        onClick={() => toggleCourseExpand(course.code)}
                      >
                        <div className="col-expand-trigger">
                          <svg
                            width="10"
                            height="6"
                            viewBox="0 0 10 6"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
                          >
                            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="col-code course-code-text">{course.code}</div>
                        <div className="col-name course-title-text">{course.name}</div>
                        <div className="col-duration">{course.duration} Giờ</div>
                        <div className="col-structure">
                          <div className="structure-badges-row">
                            {Object.entries(course.structure).map(([key, val]) => (
                              <span key={key} className="structure-badge">
                                {key.toUpperCase()} ({val}%)
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="col-progress">
                          <div className="progress-bar-wrapper">
                            <div className="progress-bar-container">
                              <div className="progress-bar-fill" style={{ width: `${course.attendanceProgress}%` }}></div>
                            </div>
                            <span className="progress-percentage">{course.attendanceProgress}%</span>
                          </div>
                        </div>
                        <div className="col-count text-right" style={{ fontWeight: 600 }}>
                          {course.classes.length} Lớp học
                        </div>
                      </div>

                      {/* Nested Class Rows */}
                      {isExpanded && (
                        <div className="classes-nested-container">
                          {course.filteredClasses.length === 0 ? (
                            <div className="no-nested-classes">
                              Không có lớp học nào phù hợp bộ lọc hiện tại.
                            </div>
                          ) : (
                            course.filteredClasses.map((cls) => (
                              <div key={cls.code} className="table-row course-table-grid class-nested-row" style={{ cursor: 'pointer' }} onClick={() => setSelectedClassForHistory(cls)}>
                                <div className="col-expand-trigger"></div>
                                <div className="col-code nested-class-code">{cls.code}</div>
                                <div className="col-name nested-class-name">{cls.name}</div>
                                <div className="col-schedule">
                                  {cls.startDate} - {cls.endDate}
                                </div>
                                <div className="col-status-badge">
                                  <span className={`class-status ${
                                    cls.status === 'Đang diễn ra' ? 'status-active' :
                                    cls.status === 'Sắp diễn ra' ? 'status-pending' : 'status-completed'
                                  }`}>
                                    {cls.status}
                                  </span>
                                </div>
                                <div className="col-progress">
                                  {cls.status !== 'Sắp diễn ra' ? (
                                    <div className="progress-bar-wrapper">
                                      <div className="progress-bar-container bar-dark-blue">
                                        <div className="progress-bar-fill" style={{ width: `${cls.attendanceRate}%` }}></div>
                                      </div>
                                      <span className="progress-percentage">{cls.attendanceRate}%</span>
                                    </div>
                                  ) : (
                                    <span className="no-progress-label">Chưa bắt đầu</span>
                                  )}
                                </div>
                                <div className="col-instructor text-right">
                                  GV: {cls.instructor}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      )}

      {isCreatingCourse && (
        <CreateCourse
          nextCourseCode={`AV-MNT-${String(allCoursesRaw.length + 1).padStart(3, '0')}`}
          onSave={handleSaveCourse}
          onCancel={() => setIsCreatingCourse(false)}
        />
      )}

      {isCreatingClass && (
        <CreateClass
          courses={allCoursesRaw}
          onSave={handleSaveClass}
          onCancel={() => setIsCreatingClass(false)}
        />
      )}
    </div>
  );
};

export default CourseClassManagement;
