import { useState, useEffect, useMemo } from 'react';
import { usePagination } from '../utils/usePagination';
import Pagination from '../components/Pagination';
import CreateCourse from './CreateCourse';
import CreateClass from './CreateClass';
import ClassAttendanceHistory from './ClassAttendanceHistory';
import EnrollStudentModal from './EnrollStudentModal';
import UpdateClassStatusModal from './UpdateClassStatusModal';
import UpdateCourseModal from './UpdateCourseModal';
import { createPortal } from 'react-dom';
import ConfirmModal from '../components/ConfirmModal';
import { api, parseApiError } from '../utils/api';
import { downloadExportFile } from '../Auditor/auditorApi';
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';

const CourseClassManagement = () => {
  const toast = useToast();
  const { tr } = useLanguage();
  const [courses, setCourses] = useState([]);
  const [allCoursesRaw, setAllCoursesRaw] = useState([]);
  const [allClassesRaw, setAllClassesRaw] = useState([]);
  const [creatingClassCourseId, setCreatingClassCourseId] = useState(null);
  const [allSubjects, setAllSubjects] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourses, setExpandedCourses] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal rendering states
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isEnrollingStudent, setIsEnrollingStudent] = useState(false);

  // Xuất báo cáo lớp học — POST /api/Exports/attendance|assessment|class-summary { classId }
  const [exportClassTarget, setExportClassTarget] = useState(null); // class object đang mở modal
  const [exportingType, setExportingType] = useState(null); // 'attendance' | 'assessment' | 'class-summary'
  const [exportError, setExportError] = useState('');
  const [enrollClassId, setEnrollClassId] = useState(null);

  // Edit & Delete targets
  const [editingCourseTarget, setEditingCourseTarget] = useState(null);
  const [deletingCourseTarget, setDeletingCourseTarget] = useState(null);
  const [editingClassTarget, setEditingClassTarget] = useState(null);
  const [deletingClassTarget, setDeletingClassTarget] = useState(null);
  const [deletingSubmitting, setDeletingSubmitting] = useState(false);
  const [classSubmitting, setClassSubmitting] = useState(false);

  const [selectedClassForHistory, setSelectedClassForHistory] = useState(null);
  const [instructorsList, setInstructorsList] = useState([]);

  // Load all data from APIs on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [courseData, classData, subjectData, sessionData, statsData, accountData, profileData] = await Promise.all([
          api.get("/Courses").catch(() => []),
          api.get("/Classes").catch(() => []),
          api.get("/Subjects").catch(() => []),
          api.get("/Sessions").catch(() => []),
          api.get("/Dashboard/stats").catch(() => ({})),
          api.get("/Accounts").catch(() => []),
          api.get("/UserProfiles").catch(() => [])
        ]);

        const coursesArr = Array.isArray(courseData) ? courseData : [];
        const classesArr = Array.isArray(classData) ? classData : [];
        const subjectsArr = Array.isArray(subjectData) ? subjectData : [];
        const sessionsArr = Array.isArray(sessionData) ? sessionData : [];

        setAllCoursesRaw(coursesArr);
        setAllClassesRaw(classesArr);
        setAllSubjects(subjectsArr);
        setAllSessions(sessionsArr);

        // Build instructor list for Class creation/edit form
        const accountsArr = Array.isArray(accountData) ? accountData : [];
        const profilesArr = Array.isArray(profileData) ? profileData : [];
        setInstructorsList(
          accountsArr
            .filter((a) => a.roleId === 2 || a.roleName === "Instructor" || a.role === "Instructor")
            .map((a) => {
              const profile = profilesArr.find((p) => String(p.accountId) === String(a.accountId));
              return {
                accountId: a.accountId,
                fullName: profile?.fullName || a.username || `Instructor #${a.accountId}`,
              };
            })
        );

        // Merge courses + classes into display format
        const mergedCourses = mergeCourseData(coursesArr, classesArr, sessionsArr, statsData, accountsArr, profilesArr, subjectsArr);
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

  // Hiển thị Giảng viên theo Môn học (InstructorAssignments) — Class không còn InstructorAccountId cấp lớp.
  const resolveClassInstructors = (cls, accountsArr = [], profilesArr = [], subjectsList = []) => {
    const assignments = Array.isArray(cls.instructorAssignments) ? cls.instructorAssignments : [];
    if (assignments.length === 0) return tr('Đang cập nhật');
    return assignments
      .map((a) => {
        let insName = tr('Chưa phân công');
        if (a.instructorAccountId) {
          const acc = accountsArr.find((x) => String(x.accountId) === String(a.instructorAccountId));
          const prof = profilesArr.find((p) => String(p.accountId) === String(a.instructorAccountId));
          insName = prof?.fullName || acc?.fullName || acc?.username || `GV #${a.instructorAccountId}`;
        }
        const sub = subjectsList.find((s) => String(s.subjectId) === String(a.subjectId));
        return `${insName}${sub ? ` (${sub.subjectCode})` : ''}`;
      })
      .join(', ');
  };

  const mergeCourseData = (coursesArr, classesArr, sessionsArr, statsData, accountsArr = [], profilesArr = [], subjectsList = []) => {
    return coursesArr.map((course) => {
      const courseClasses = classesArr.filter((c) => String(c.courseId) === String(course.courseId));
      const sessionCount = sessionsArr.filter((s) => 
        courseClasses.some((cc) => String(cc.classId) === String(s.classId))
      ).length;

      return {
        courseId: course.courseId,
        code: course.courseCode,
        name: course.courseName,
        description: course.description || '',
        duration: course.durationHours || 0,
        structure: { theory: 40, practice: 40, assignment: 10, attendance: 10 },
        attendanceProgress: Math.min(100, sessionCount > 0 ? 100 : 0),
        activeClassesCount: courseClasses.filter((c) => {
          const st = c.status;
          return st === 'InProgress' || st === 'Planned' || st === 'Active' || st === 'Upcoming' || st === 'Đang diễn ra' || st === 'Sắp diễn ra';
        }).length,
        classes: courseClasses.map((cls) => {
          const insName = resolveClassInstructors(cls, accountsArr, profilesArr, subjectsList);
          return {
            classId: cls.classId,
            courseId: cls.courseId,
            code: cls.classCode,
            classCode: cls.classCode,
            name: cls.className,
            className: cls.className,
            location: cls.location || '',
            capacity: cls.capacity || 30,
            instructorAssignments: Array.isArray(cls.instructorAssignments) ? cls.instructorAssignments : [],
            startDateRaw: cls.startDate,
            endDateRaw: cls.endDate,
            startDate: cls.startDate ? new Date(cls.startDate).toLocaleDateString('vi-VN') : '',
            endDate: cls.endDate ? new Date(cls.endDate).toLocaleDateString('vi-VN') : '',
            statusRaw: cls.status,
status: (cls.status === 'Active' || cls.status === 'InProgress') ? 'Đang diễn ra' : (cls.status === 'Upcoming' || cls.status === 'Planned') ? 'Sắp diễn ra' : cls.status === 'Completed' ? 'Đã kết thúc' : cls.status === 'Cancelled' ? 'Đã hủy' : cls.status,
            attendanceRate: 0,
            instructor: insName
          };
        })
      };
    });
  };

  const refreshData = async () => {
    try {
      const [courseData, classData, sessionData, accountData, profileData] = await Promise.all([
        api.get("/Courses").catch(() => []),
        api.get("/Classes").catch(() => []),
        api.get("/Sessions").catch(() => []),
        api.get("/Accounts").catch(() => []),
        api.get("/UserProfiles").catch(() => [])
      ]);

      const coursesArr = Array.isArray(courseData) ? courseData : [];
      const classesArr = Array.isArray(classData) ? classData : [];
      const sessionsArr = Array.isArray(sessionData) ? sessionData : [];
      const accountsArr = Array.isArray(accountData) ? accountData : [];
      const profilesArr = Array.isArray(profileData) ? profileData : [];

      setAllCoursesRaw(coursesArr);
      setAllClassesRaw(classesArr);
      const merged = mergeCourseData(coursesArr, classesArr, sessionsArr, {}, accountsArr, profilesArr, allSubjects);
      setCourses(merged);
      return merged;
    } catch (error) {
      console.error("Error refreshing course data:", error);
      return [];
    }
  };

  const toggleCourseExpand = (courseCode) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseCode]: !prev[courseCode]
    }));
  };

  // Handler for Creating Course (POST /api/Courses)
  const handleSaveCourse = async (newCourse) => {
    try {
      const subjectsPayload = Array.isArray(newCourse.subjects) && newCourse.subjects.length > 0
        ? newCourse.subjects
        : (Array.isArray(newCourse.selectedSubjectIds)
            ? newCourse.selectedSubjectIds.map((id, idx) => ({
                subjectId: Number(id),
                sequenceNo: idx + 1,
                requiredHours: newCourse.duration || 0,
                requiredSessions: 1,
                isMandatory: true,
                passingScore: 5
              }))
            : []);

      await api.post("/Courses", {
        courseCode: newCourse.code,
        courseName: newCourse.name,
        description: newCourse.description || '',
        durationHours: parseInt(newCourse.duration) || 0,
        status: newCourse.status || 'Active',
        validityMonths: null,
        courseType: null,
        subjects: subjectsPayload
      });
      await refreshData();
      setIsCreatingCourse(false);
      toast.success(tr("Tạo khóa học thành công!"));
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error(tr("Tạo khóa học thất bại"));
    }
  };

  // Handler for Updating Course (PUT /api/Courses/{id})
  const handleSaveUpdateCourse = async (courseId, updateData) => {
    try {
      const subjectsPayload = Array.isArray(updateData.subjects) && updateData.subjects.length > 0
        ? updateData.subjects
        : (Array.isArray(updateData.selectedSubjectIds)
            ? updateData.selectedSubjectIds.map((id, idx) => ({
                subjectId: Number(id),
                sequenceNo: idx + 1,
                requiredHours: updateData.durationHours || 0,
                requiredSessions: 1,
                isMandatory: true,
                passingScore: 5
              }))
            : []);

      await api.put(`/Courses/${courseId}`, {
        courseId,
        courseCode: updateData.courseCode || updateData.code,
        courseName: updateData.courseName || updateData.name,
        description: updateData.description || '',
        durationHours: parseInt(updateData.durationHours ?? updateData.duration) || 0,
        status: updateData.status || 'Active',
        validityMonths: updateData.validityMonths ?? null,
        courseType: updateData.courseType ?? null,
        subjects: subjectsPayload
      });
      await refreshData();
      setEditingCourseTarget(null);
      toast.success(tr("Cập nhật khóa học thành công!"));
    } catch (error) {
      console.error("Error updating course:", error);
      toast.error(tr("Cập nhật khóa học thất bại"));
      throw new Error(parseApiError(error));
    }
  };

  // Handler for Deleting Course (DELETE /api/Courses/{id})
  const handleDeleteCourseConfirm = async () => {
    if (!deletingCourseTarget) return;
    setDeletingSubmitting(true);
    try {
      await api.delete(`/Courses/${deletingCourseTarget.courseId}`);
      await refreshData();
      toast.success(tr("Xóa khóa học thành công!"));
      setDeletingCourseTarget(null);
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error(tr("Xóa khóa học thất bại"));
    } finally {
      setDeletingSubmitting(false);
    }
  };

  // Handler for Creating Class (POST /api/Classes)
  const handleSaveClass = async (parentCourseId, newClass) => {
    // Chống submit 2 lần liên tiếp (double-click) — tránh trùng mã ClassCode → DbUpdateException
    if (classSubmitting) return;
    setClassSubmitting(true);
    try {
      const parsedCourseId = Number(parentCourseId);
      if (!parsedCourseId || isNaN(parsedCourseId)) {
        toast.error(tr("Tạo lớp học thất bại"));
        return;
      }

      // Chặn từ phía FE trước khi gọi API: khóa học phải tồn tại trong danh sách thật (tránh FK violation)
      if (allCoursesRaw.length > 0 && !allCoursesRaw.some((c) => Number(c.courseId) === parsedCourseId)) {
        toast.error(tr("Tạo lớp học thất bại"));
        return;
      }

      const cleanCode = (newClass.code?.trim() || '').slice(0, 20);
      if (!cleanCode) {
        toast.error(tr("Tạo lớp học thất bại"));
        return;
      }

      // Chặn trùng Mã lớp ngay tại FE (khớp với unique index IX_Classes_ClassCode của CSDL)
      const codeUpper = cleanCode.toUpperCase();
      if (allClassesRaw.some((c) => String(c.classCode || '').trim().toUpperCase() === codeUpper)) {
        toast.error(tr("Tạo lớp học thất bại"));
        return;
      }

      let startIso = new Date().toISOString();
      if (newClass.startDate) {
        const d = new Date(newClass.startDate);
        if (!isNaN(d.getTime())) startIso = d.toISOString();
      }

      let endIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      if (newClass.endDate) {
        const d = new Date(newClass.endDate);
        if (!isNaN(d.getTime())) endIso = d.toISOString();
      }

      // Giảng viên phân công theo Môn học (ClassSubjects) — chỉ giữ những giảng viên hợp lệ (có trong danh sách thật)
      const instructorAssignments = (Array.isArray(newClass.instructorAssignments) ? newClass.instructorAssignments : [])
        .map((a) => ({
          subjectId: Number(a.subjectId),
          instructorAccountId: a.instructorAccountId != null && instructorsList.some((i) => Number(i.accountId) === Number(a.instructorAccountId))
            ? Number(a.instructorAccountId)
            : null
        }));

      const mappedStatus = (newClass.status === 'Đang diễn ra' || newClass.status === 'Active')
        ? 'InProgress'
        : (newClass.status === 'Sắp diễn ra' || newClass.status === 'Upcoming')
        ? 'Planned'
        : 'Completed';

      await api.post("/Classes", {
        courseId: parsedCourseId,
        classCode: cleanCode,
        className: newClass.name?.trim() || cleanCode,
        startDate: startIso,
        endDate: endIso,
        location: newClass.location || tr('Phòng Sim A320'),
        capacity: 30,
        status: mappedStatus,
        instructorAssignments
      });

      const latestCourses = await refreshData();
      setIsCreatingClass(false);
      setCreatingClassCourseId(null);
      setStatusFilter('ALL');
      setSearchTerm('');

      const targetCourse = (latestCourses || []).find((c) => String(c.courseId) === String(parsedCourseId));
      if (targetCourse) {
        setExpandedCourses((prev) => ({ ...prev, [targetCourse.code]: true }));
      }
      toast.success(tr("Tạo lớp học thành công!"));
    } catch (error) {
      console.error("Error creating class:", error);
      toast.error(tr("Tạo lớp học thất bại"));
    } finally {
      setClassSubmitting(false);
    }
  };

  // Handler for Updating Class (PUT /api/Classes/{id})
  const handleSaveUpdateClass = async (classId, updatePayload) => {
    try {
      // Giảng viên theo Môn học: chỉ giữ những giảng viên hợp lệ
      const safeAssignments = (Array.isArray(updatePayload.instructorAssignments) ? updatePayload.instructorAssignments : [])
        .map((a) => ({
          subjectId: Number(a.subjectId),
          instructorAccountId: a.instructorAccountId != null && instructorsList.some((i) => Number(i.accountId) === Number(a.instructorAccountId))
            ? Number(a.instructorAccountId)
            : null
        }));
      await api.put(`/Classes/${classId}`, { ...updatePayload, instructorAssignments: safeAssignments });
      await refreshData();
      setEditingClassTarget(null);
      toast.success(tr("Cập nhật lớp học thành công!"));
    } catch (error) {
      console.error("Error updating class status:", error);
      toast.error(parseApiError(error, tr("Cập nhật lớp học thất bại")));
      throw new Error(parseApiError(error));
    }
  };

  // Handler for Deleting Class (DELETE /api/Classes/{id})
  const handleDeleteClassConfirm = async () => {
    if (!deletingClassTarget) return;
    setDeletingSubmitting(true);
    try {
      await api.delete(`/Classes/${deletingClassTarget.classId}`);
      await refreshData();
      toast.success(tr("Xóa lớp học thành công!"));
      setDeletingClassTarget(null);
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error(tr("Xóa lớp học thất bại"));
    } finally {
      setDeletingSubmitting(false);
    }
  };

  // Handler for Enrolling Student (POST /api/Enrollments)
  const handleSaveEnrollment = async (enrollmentData) => {
    try {
      await api.post("/Enrollments", {
        accountId: enrollmentData.accountId,
        classId: enrollmentData.classId
      });
      await refreshData();
      setIsEnrollingStudent(false);
      setEnrollClassId(null);
      toast.success(tr("Ghi danh học viên thành công!"));
    } catch (error) {
      console.error("Error creating enrollment:", error);
      throw error;
    }
  };

  // Xuất báo cáo lớp học — khớp ExportsController BE:
  // POST /api/Exports/attendance|assessment|class-summary { classId } → ExportJobResponse
  // → poll GET /api/Exports/{exportJobId} đến khi Completed → GET /api/Exports/download/{id}
  const EXPORT_TYPES = [
    { type: 'attendance', label: tr('Báo cáo điểm danh') },
    { type: 'assessment', label: tr('Báo cáo đánh giá') },
    { type: 'class-summary', label: tr('Tổng hợp lớp học') },
  ];

  const handleExportReport = async (classId, type) => {
    setExportingType(type);
    setExportError('');
    try {
      const job = await api.post(`/Exports/${type}`, { classId });
      const jobId = job?.exportJobId ?? job?.ExportJobId;
      if (!jobId) {
        throw new Error(tr('BE không trả về ExportJobId.'));
      }
      // Poll trạng thái job (tối đa ~15s)
      let status = job?.status || '';
      for (let i = 0; i < 30; i++) {
        if (String(status).toLowerCase() === 'completed') break;
        await new Promise((r) => setTimeout(r, 500));
        const detail = await api.get(`/Exports/${jobId}`).catch(() => null);
        status = detail?.status ?? status;
      }
      if (String(status).toLowerCase() !== 'completed') {
        throw new Error(tr('File xuất chưa hoàn thành. Vui lòng thử lại sau.'));
      }
      const fileName = job?.fileName || `${type}_class_${classId}.zip`;
      await downloadExportFile(jobId, fileName);
      toast.success(tr("Xuất báo cáo thành công!"));
      setExportClassTarget(null);
    } catch (err) {
      console.error("Error exporting report:", err);
      setExportError(parseApiError(err, tr("Xuất báo cáo thất bại.")));
    } finally {
      setExportingType(null);
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

      const clsSt = (cls.status || '').toLowerCase();
      if (statusFilter === 'ALL') return matchesClassSearch;
      if (statusFilter === 'ACTIVE') return matchesClassSearch && (clsSt.includes('diễn ra') || clsSt.includes('active'));
      if (statusFilter === 'UPCOMING') return matchesClassSearch && (clsSt.includes('sắp') || clsSt.includes('upcoming'));
      if (statusFilter === 'COMPLETED') return matchesClassSearch && (clsSt.includes('kết thúc') || clsSt.includes('completed'));
      return matchesClassSearch;
    });

    const matchesSearch = matchesCourseSearch || matchedClasses.length > 0;

    return {
      ...course,
      filteredClasses: matchedClasses,
      shouldShow: matchesSearch
    };
  }).filter((course) => course.shouldShow);

  // Phân trang: khóa học (nhóm có thể mở rộng) + lớp mồ côi — tối đa 5 nút trang.
  const { page: coursePage, setPage: setCoursePage, pageCount: coursePageCount, pageItems: pagedCourses, total: courseTotal } = usePagination(filteredCourses, {
    pageSize: 10,
    resetKey: `${searchTerm}|${statusFilter}`,
  });

  const { page: orphanPage, setPage: setOrphanPage, pageCount: orphanPageCount, pageItems: pagedOrphans, total: orphanTotal } = usePagination(orphanClasses, {
    pageSize: 10,
  });

  // Lớp "mồ côi": có CourseId không khớp bất kỳ khóa học nào đang tồn tại (khóa học đã bị xóa
  // hoặc lớp được tạo với CourseId không hợp lệ) — Academic cần thấy để xử lý (sửa/xóa/ghi danh).
  const orphanClasses = useMemo(() => {
    const validCourseIds = new Set(allCoursesRaw.map((c) => String(c.courseId)));
    return allClassesRaw
      .filter((cls) => !validCourseIds.has(String(cls.courseId)))
      .map((cls) => {
        const insName = resolveClassInstructors(cls, instructorsList, [], allSubjects);
        return {
          classId: cls.classId,
          courseId: cls.courseId,
          code: cls.classCode,
          classCode: cls.classCode,
          name: cls.className,
          className: cls.className,
          location: cls.location || '',
          capacity: cls.capacity || 30,
          instructorAssignments: Array.isArray(cls.instructorAssignments) ? cls.instructorAssignments : [],
          startDateRaw: cls.startDate,
          endDateRaw: cls.endDate,
          startDate: cls.startDate ? new Date(cls.startDate).toLocaleDateString('vi-VN') : '',
          endDate: cls.endDate ? new Date(cls.endDate).toLocaleDateString('vi-VN') : '',
          statusRaw: cls.status,
          status: (cls.status === 'Active' || cls.status === 'InProgress') ? 'Đang diễn ra' : (cls.status === 'Upcoming' || cls.status === 'Planned') ? 'Sắp diễn ra' : cls.status === 'Completed' ? 'Đã kết thúc' : cls.status === 'Cancelled' ? 'Đã hủy' : cls.status,
          instructor: insName,
          isOrphan: true
        };
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allClassesRaw, allCoursesRaw, instructorsList, tr, allSubjects]);

  // Statistics calculation
  const totalClasses = courses.reduce((sum, course) => sum + course.classes.length, 0);
  const allFlattenedClasses = [...courses.flatMap((c) => c.classes), ...orphanClasses];

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
          <h1>{tr('Khóa & Lớp học')}</h1>
          <div className="divider-gold" />
          <p className="header-description">
            {tr('Quản lý danh mục đào tạo, cấu hình môn học, ghi danh học viên và lịch trình giảng dạy.')}
          </p>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="outline-btn font-gold-btn" type="button" onClick={() => setIsCreatingCourse(true)}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.66667 11.6667H8.33333V8.33333H11.6667V6.66667H8.33333V3.33333H6.66667V6.66667H3.33333V8.33333H6.66667V11.6667ZM1.66667 15C1.20833 15 0.815972 14.8368 0.489583 14.5104C0.163194 14.184 0 13.7917 0 13.3333V1.66667C0 1.20833 0.163194 0.815972 0.489583 0.489583C0.815972 0.163194 1.20833 0 1.66667 0H13.3333C13.7917 0 14.184 0.163194 14.5104 0.489583C14.8368 0.815972 15 1.20833 15 1.66667V13.3333C15 13.7917 14.8368 14.184 14.5104 14.5104C14.184 14.8368 13.7917 15 13.3333 15H1.66667ZM1.66667 13.3333H13.3333V1.66667H1.66667V13.3333Z" fill="currentColor" />
            </svg>
            <span>{tr('TẠO KHÓA HỌC')}</span>
          </button>

          <button className="create-btn gold-gradient-btn" type="button" onClick={() => setIsCreatingClass(true)}>
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.4167 6.625C10.8194 6.18056 11.1285 5.67361 11.3438 5.10417C11.559 4.53472 11.6667 3.94444 11.6667 3.33333C11.6667 2.72222 11.559 2.13194 11.3438 1.5625C11.1285 0.993056 10.8194 0.486111 10.4167 0.0416667C11.25 0.152778 11.9444 0.520833 12.5 1.14583C13.0556 1.77083 13.3333 2.5 13.3333 3.33333C13.3333 4.16667 13.0556 4.89583 12.5 5.52083C11.9444 6.14583 11.25 6.51389 10.4167 6.625ZM15 13.3333V10.8333C15 10.3333 14.8889 9.85764 14.6667 9.40625C14.4444 8.95486 14.1528 8.55556 13.7917 8.20833C14.5 8.45833 15.1562 8.78125 15.7604 9.17708C16.3646 9.57292 16.6667 10.125 16.6667 10.8333V13.3333H15ZM16.6667 7.5V5.83333H15V4.16667H16.6667V2.5H18.3333V4.16667H20V5.83333H18.3333V7.5H16.6667ZM6.66667 6.66667C5.75 6.66667 4.96528 6.34028 4.3125 5.6875C3.65972 5.03472 3.33333 4.25 3.33333 3.33333C3.33333 2.41667 3.65972 1.63194 4.3125 0.979167C4.96528 0.326389 5.75 0 6.66667 0C7.58333 0 8.36806 0.326389 9.02083 0.979167C9.67361 1.63194 10 2.41667 10 3.33333C10 4.25 9.67361 5.03472 9.02083 5.6875C8.36806 6.34028 7.58333 6.66667 6.66667 6.66667ZM0 13.3333V11C0 10.5278 0.121528 10.0938 0.364583 9.69792C0.607639 9.30208 0.930556 9 1.33333 8.79167C2.19444 8.36111 3.06944 8.03819 3.95833 7.82292C4.84722 7.60764 5.75 7.5 6.66667 7.5C7.58333 7.5 8.48611 7.60764 9.375 7.82292C10.2639 8.03819 11.1389 8.36111 12 8.79167C12.4028 9 12.7257 9.30208 12.9688 9.69792C13.2118 10.0938 13.3333 10.5278 13.3333 11V13.3333H0ZM6.66667 5C7.125 5 7.51736 4.83681 7.84375 4.51042C8.17014 4.18403 8.33333 3.79167 8.33333 3.33333C8.33333 2.875 8.17014 2.48264 7.84375 2.15625C7.51736 1.82986 7.125 1.66667 6.66667 1.66667C6.20833 1.66667 5.81597 1.82986 5.48958 2.15625C5.16319 2.48264 5 2.875 5 3.33333C5 3.79167 5.16319 4.18403 5.48958 4.51042C5.81597 4.83681 6.20833 5 6.66667 5ZM1.66667 11.6667H11.6667V11C11.6667 10.8472 11.6285 10.7083 11.5521 10.5833C11.4757 10.4583 11.375 10.3611 11.25 10.2917C10.5 9.91667 9.74306 9.63542 8.97917 9.44792C8.21528 9.26042 7.44444 9.16667 6.66667 9.16667C5.88889 9.16667 5.11806 9.26042 4.35417 9.44792C3.59028 9.63542 2.83333 9.91667 2.08333 10.2917C1.95833 10.3611 1.85764 10.4583 1.78125 10.5833C1.70486 10.7083 1.66667 10.8472 1.66667 11V11.6667Z" fill="currentColor" />
            </svg>
            <span>{tr('TẠO LỚP HỌC')}</span>
          </button>

          <button
            className="create-btn"
            type="button"
            style={{
              backgroundColor: '#002147',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '4px',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,33,71,0.2)'
            }}
            onClick={() => {
              setEnrollClassId(null);
              setIsEnrollingStudent(true);
            }}
          >
            <span>{tr('📝 GHI DANH HỌC VIÊN')}</span>
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
            <p className="stats-title-label">{tr('THỐNG KÊ ĐÀO TẠO')}</p>
            <div className="stats-row">
              <div className="stat-box">
                <p className="stat-label">{tr('KHÓA HỌC')}</p>
                <p className="stat-value">{String(allCoursesRaw.length).padStart(2, '0')}</p>
              </div>
              <div className="stat-box">
                <p className="stat-label">{tr('LỚP HỌC')}</p>
                <p className="stat-value">{String(totalClasses).padStart(2, '0')}</p>
              </div>
              <div className="stat-box">
                <p className="stat-label">{tr('MÔN HỌC')}</p>
                <p className="stat-value">{String(allSubjects.length).padStart(2, '0')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Loading State */}
      {loading ? (
        <section className="table-card">            <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
            <div style={{ fontSize: "14px", fontWeight: 600 }}>{tr('Đang tải dữ liệu...')}</div>
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
                  placeholder={tr('Tìm khóa học, lớp học hoặc giảng viên...')}
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
                {tr('TẤT CẢ')}
              </button>
              <button
                className={`filter-btn ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ACTIVE')}
              >
                {tr('ĐANG DIỄN RA')}
              </button>
              <button
                className={`filter-btn ${statusFilter === 'UPCOMING' ? 'active' : ''}`}
                onClick={() => setStatusFilter('UPCOMING')}
              >
                {tr('SẮP DIỄN RA')}
              </button>
            </div>
          </div>

          {/* Table Core Layout */}
          <div className="table-responsive-scroll">
            <div className="table-header course-table-grid">
              <div className="col-expand-trigger"></div>
              <div>{tr('MÃ KHÓA/LỚP')}</div>
              <div>{tr('TÊN KHÓA HỌC/LỚP')}</div>
              <div>{tr('THỜI LƯỢNG/LỊCH TRÌNH')}</div>
              <div>{tr('CHI TIẾT CẤU TRÚC / TRẠNG THÁI')}</div>
              <div>{tr('GIẢNG VIÊN')}</div>
              <div style={{ textAlign: 'right' }}>{tr('THAO TÁC KHÓA / LỚP')}</div>
            </div>

            <div className="table-body">
              {filteredCourses.length === 0 ? (
                <div className="empty-table-state">
                  {tr('Không tìm thấy khóa học hoặc lớp học nào phù hợp.')}
                </div>
              ) : (
                pagedCourses.map((course) => {
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
                        <div className="col-duration">{course.duration} {tr('Giờ')}</div>
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
                        
                        {/* Course Action Buttons: SỬA & XÓA KHÓA HỌC */}
                        <div className="col-count text-right" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '12px', color: '#64748b', marginRight: '4px', whiteSpace: 'nowrap' }}>
                            {course.classes.length} {tr('Lớp')}
                          </span>

                          <button
                            type="button"
                            title={tr('Tạo Lớp học mới cho Khóa này')}
                            style={{
                              backgroundColor: '#002147',
                              color: '#ffffff',
                              border: '1px solid #002147',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCreatingClassCourseId(course.courseId);
                              setIsCreatingClass(true);
                            }}
                          >
                            {tr('➕ Tạo Lớp')}
                          </button>

                          <button
                            type="button"
                            title={tr('Sửa thông tin Khóa học')}
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #c5a059',
                              color: '#c5a059',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCourseTarget(course);
                            }}
                          >
                            {tr('✏️ Sửa Khóa')}
                          </button>

                          <button
                            type="button"
                            title={tr('Xóa Khóa học')}
                            style={{
                              backgroundColor: '#fff1f2',
                              border: '1px solid #fecdd3',
                              color: '#e11d48',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingCourseTarget(course);
                            }}
                          >
                            {tr('🗑️ Xóa Khóa')}
                          </button>
                        </div>
                      </div>

                      {/* Nested Class Rows */}
                      {isExpanded && (
                        <div className="classes-nested-container">
                          {course.filteredClasses.length === 0 ? (
                            <div className="no-nested-classes">
                              {tr('Không có lớp học nào phù hợp bộ lọc hiện tại.')}
                            </div>
                          ) : (
                            course.filteredClasses.map((cls) => (
                              <div
                                key={cls.code}
                                className="table-row course-table-grid class-nested-row"
                                style={{ alignItems: 'center' }}
                              >
                                <div className="col-expand-trigger"></div>
                                <div className="col-code nested-class-code">{cls.code}</div>
                                <div className="col-name nested-class-name">{cls.name}</div>
                                <div className="col-schedule">
                                  {cls.startDate} - {cls.endDate}
                                </div>
                                <div className="col-status-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className={`class-status ${
                                    cls.status === 'Đang diễn ra' ? 'status-active' :
                                    cls.status === 'Sắp diễn ra' ? 'status-pending' : 'status-completed'
                                  }`}>
                                    {tr(cls.status)}
                                  </span>

                                  {/* Button: CẬP NHẬT TRẠNG THÁI LỚP */}
                                  <button
                                    type="button"
                                    title={tr('Cập nhật trạng thái & thông tin lớp')}
                                    style={{
                                      backgroundColor: '#f1f5f9',
                                      border: '1px solid #cbd5e1',
                                      color: '#0f172a',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingClassTarget(cls);
                                    }}
                                  >
                                    {tr('✏️ Trạng thái')}
                                  </button>
                                </div>

                                <div className="col-instructor">
                                  {tr('GV:')} {cls.instructor}
                                </div>

                                <div className="col-actions text-right" style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', flexWrap: 'nowrap' }}>
                                  {/* Button: GHI DANH HỌC VIÊN VÀO LỚP HỌC NÀY */}
                                  {(() => {
                                    const isClassClosed = cls.status === 'Đã kết thúc' || cls.status === 'Completed' || cls.status === 'Đã hủy' || cls.status === 'Cancelled';
                                    return (
                                      <button
                                        type="button"
                                        disabled={isClassClosed}
                                        title={isClassClosed ? tr('Lớp học đã kết thúc/bị hủy — không thể ghi danh mới') : tr('Ghi danh học viên mới vào lớp')}
                                        style={{
                                          backgroundColor: isClassClosed ? '#e2e8f0' : '#002147',
                                          color: isClassClosed ? '#94a3b8' : '#c5a059',
                                          border: isClassClosed ? '1px solid #cbd5e1' : '1px solid #c5a059',
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          padding: '4px 8px',
                                          borderRadius: '4px',
                                          cursor: isClassClosed ? 'not-allowed' : 'pointer',
                                          whiteSpace: 'nowrap',
                                          opacity: isClassClosed ? 0.7 : 1,
                                          flexShrink: 0
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isClassClosed) return;
                                          setEnrollClassId(cls.classId);
                                          setIsEnrollingStudent(true);
                                        }}
                                      >
                                        {isClassClosed ? tr('⛔ Đã kết thúc') : tr('➕ Ghi danh')}
                                      </button>
                                    );
                                  })()}

                                  {/* Button: XEM LỊCH SỬ ĐIỂM DANH */}
                                  <button
                                    type="button"
                                    style={{
                                      backgroundColor: '#f8fafc',
                                      color: '#475569',
                                      border: '1px solid #e2e8f0',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedClassForHistory(cls);
                                    }}
                                  >
                                    {tr('Chi tiết')}
                                  </button>

                                  {/* Button: XÓA LỚP HỌC */}
                                  <button
                                    type="button"
                                    title={tr('Xóa Lớp học này')}
                                    style={{
                                      backgroundColor: '#fff1f2',
                                      color: '#e11d48',
                                      border: '1px solid #fecdd3',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingClassTarget(cls);
                                    }}
                                  >
                                    {tr('🗑️ Xóa Lớp')}
                                  </button>

                                  {/* Button: XUẤT BÁO CÁO LỚP (POST /api/Exports/attendance|assessment|class-summary) */}
                                  <button
                                    type="button"
                                    title={tr('Xuất báo cáo điểm danh / đánh giá / tổng hợp lớp')}
                                    style={{
                                      backgroundColor: '#f8fafc',
                                      color: '#475569',
                                      border: '1px solid #e2e8f0',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExportClassTarget(cls);
                                      setExportError('');
                                    }}
                                  >
                                    📤 {tr('Xuất báo cáo')}
                                  </button>
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

          <div className="table-footer">
            <Pagination
              page={coursePage}
              pageCount={coursePageCount}
              onChange={setCoursePage}
              total={courseTotal}
              pageSize={10}
            />
          </div>
        </section>
      )}

      {/* Orphan Classes: lớp không thuộc khóa học nào đang tồn tại */}
      {!loading && orphanClasses.length > 0 && (
        <section className="table-card" style={{ marginTop: '24px', border: '1px solid #fecaca' }}>
          <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div className="toolbar-left" style={{ flex: '1 1 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  border: '1px solid #fecaca',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  ⚠️ {tr('LỚP KHÔNG THUỘC KHÓA HỌC')} ({orphanClasses.length})
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {tr('Các lớp này có CourseId không khớp với khóa học nào đang tồn tại (khóa học có thể đã bị xóa hoặc lớp được tạo với khóa học không hợp lệ). Bạn có thể cập nhật trạng thái, ghi danh học viên, xem chi tiết hoặc xóa lớp không dùng.')}
                </span>
              </div>
            </div>
          </div>

          <div className="table-responsive-scroll">
            <div className="table-header course-table-grid">
              <div className="col-expand-trigger"></div>
              <div>{tr('MÃ LỚP')}</div>
              <div>{tr('TÊN LỚP HỌC')}</div>
              <div>{tr('LỊCH TRÌNH')}</div>
              <div>{tr('TRẠNG THÁI')}</div>
              <div>{tr('GIẢNG VIÊN')}</div>
              <div style={{ textAlign: 'right' }}>{tr('THAO TÁC')}</div>
            </div>

            <div className="table-body">
              {pagedOrphans.map((cls) => {
                const isClassClosed = cls.status === 'Đã kết thúc' || cls.status === 'Completed' || cls.status === 'Đã hủy' || cls.status === 'Cancelled';
                return (
                  <div
                    key={`orphan-${cls.classId}`}
                    className="table-row course-table-grid class-nested-row"
                    style={{ alignItems: 'center', backgroundColor: '#fffbfb' }}
                  >
                    <div className="col-expand-trigger">
                      <span style={{ fontSize: '14px' }}>⚠️</span>
                    </div>
                    <div className="col-code nested-class-code">{cls.code}</div>
                    <div className="col-name nested-class-name">{cls.name}</div>
                    <div className="col-schedule">
                      {cls.startDate} - {cls.endDate}
                    </div>
                    <div className="col-status-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`class-status ${
                        cls.status === 'Đang diễn ra' ? 'status-active' :
                        cls.status === 'Sắp diễn ra' ? 'status-pending' : 'status-completed'
                      }`}>
                        {tr(cls.status)}
                      </span>
                    </div>
                    <div className="col-instructor">{tr('GV:')} {cls.instructor}</div>

                    <div className="col-actions text-right" style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', flexWrap: 'nowrap' }}>
                      <button
                        type="button"
                        title={tr('Cập nhật trạng thái & thông tin lớp')}
                        style={{
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                        onClick={() => setEditingClassTarget(cls)}
                      >
                        {tr('✏️ Trạng thái')}
                      </button>

                      <button
                        type="button"
                        disabled={isClassClosed}
                        title={isClassClosed ? tr('Lớp học đã kết thúc/bị hủy — không thể ghi danh mới') : tr('Ghi danh học viên mới vào lớp')}
                        style={{
                          backgroundColor: isClassClosed ? '#e2e8f0' : '#002147',
                          color: isClassClosed ? '#94a3b8' : '#c5a059',
                          border: isClassClosed ? '1px solid #cbd5e1' : '1px solid #c5a059',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: isClassClosed ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                          opacity: isClassClosed ? 0.7 : 1,
                          flexShrink: 0
                        }}
                        onClick={() => {
                          if (isClassClosed) return;
                          setEnrollClassId(cls.classId);
                          setIsEnrollingStudent(true);
                        }}
                      >
                        {isClassClosed ? tr('⛔ Đã kết thúc') : tr('➕ Ghi danh')}
                      </button>

                      <button
                        type="button"
                        style={{
                          backgroundColor: '#f8fafc',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                        onClick={() => setSelectedClassForHistory(cls)}
                      >
                        {tr('Chi tiết')}
                      </button>

                      <button
                        type="button"
                        title={tr('Xóa Lớp học này')}
                        style={{
                          backgroundColor: '#fff1f2',
                          color: '#e11d48',
                          border: '1px solid #fecdd3',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                        onClick={() => setDeletingClassTarget(cls)}
                      >
                        {tr('🗑️ Xóa Lớp')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="table-footer">
            <Pagination
              page={orphanPage}
              pageCount={orphanPageCount}
              onChange={setOrphanPage}
              total={orphanTotal}
              pageSize={10}
            />
          </div>
        </section>
      )}

      {/* Modal: TẠO KHÓA HỌC */}
      {isCreatingCourse && (
        <CreateCourse
          nextCourseCode={`AV-MNT-${Date.now().toString().slice(-4)}`}
          onSave={handleSaveCourse}
          onCancel={() => setIsCreatingCourse(false)}
        />
      )}

      {/* Modal: CẬP NHẬT KHÓA HỌC */}
      {editingCourseTarget && (
        <UpdateCourseModal
          course={editingCourseTarget}
          onSave={handleSaveUpdateCourse}
          onCancel={() => setEditingCourseTarget(null)}
        />
      )}

      {/* Modal: XÁC NHẬN XÓA KHÓA HỌC */}
      {deletingCourseTarget && (
        <ConfirmModal
          isOpen={!!deletingCourseTarget}
          title={`${tr('XÁC NHẬN XÓA KHÓA HỌC')} #${deletingCourseTarget.courseId}`}
          message={`${tr('Bạn có chắc chắn muốn xóa Khóa học')} "${deletingCourseTarget.name}" (${deletingCourseTarget.code})?`}
          bodyMessage={tr("Hành động xóa khóa học sẽ xóa mềm bản ghi khóa học khỏi hệ thống. Thao tác này không thể hoàn tác trực tiếp.")}
          confirmText={tr("XÓA KHÓA HỌC")}
          cancelText={tr("HỦY BỎ")}
          confirmVariant="danger"
          loading={deletingSubmitting}
          onConfirm={handleDeleteCourseConfirm}
          onClose={() => setDeletingCourseTarget(null)}
        />
      )}

      {/* Modal: TẠO LỚP HỌC */}
      {isCreatingClass && (
        <CreateClass
          courses={allCoursesRaw}
          initialCourseId={creatingClassCourseId}
          instructors={instructorsList}
          subjects={allSubjects}
          onSave={handleSaveClass}
          onCancel={() => {
            setIsCreatingClass(false);
            setCreatingClassCourseId(null);
          }}
        />
      )}

      {/* Modal: CẬP NHẬT TRẠNG THÁI LỚP HỌC */}
      {editingClassTarget && (
        <UpdateClassStatusModal
          targetClass={editingClassTarget}
          instructors={instructorsList}
          subjects={allSubjects}
          onSave={handleSaveUpdateClass}
          onCancel={() => setEditingClassTarget(null)}
        />
      )}

      {/* Modal: XÁC NHẬN XÓA LỚP HỌC */}
      {deletingClassTarget && (
        <ConfirmModal
          isOpen={!!deletingClassTarget}
          title={`${tr('XÁC NHẬN XÓA LỚP HỌC')} #${deletingClassTarget.classId}`}
          message={`${tr('Bạn có chắc chắn muốn xóa Lớp học')} "${deletingClassTarget.name}" (${deletingClassTarget.code})?`}
          bodyMessage={tr("Lớp học bị xóa sẽ được xóa khỏi hệ thống. Mọi điểm danh và hồ sơ liên quan đến lớp học này sẽ tạm dừng.")}
          confirmText={tr("XÓA LỚP HỌC")}
          cancelText={tr("HỦY BỎ")}
          confirmVariant="danger"
          loading={deletingSubmitting}
          onConfirm={handleDeleteClassConfirm}
          onClose={() => setDeletingClassTarget(null)}
        />
      )}

      {/* Modal: GHI DANH HỌC VIÊN */}
      {isEnrollingStudent && (
        <EnrollStudentModal
          classes={allFlattenedClasses}
          initialClassId={enrollClassId}
          onSave={handleSaveEnrollment}
          onCancel={() => {
            setIsEnrollingStudent(false);
            setEnrollClassId(null);
          }}
        />
      )}

      {/* Modal: XUẤT BÁO CÁO LỚP HỌC (POST /api/Exports/...) */}
      {exportClassTarget &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 33, 71, 0.75)',
              zIndex: 999999,
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setExportClassTarget(null)}
          >
            <div
              className="dashboard-panel"
              style={{
                width: '520px',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
                margin: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="panel-header">
                <h2>
                  {tr('Xuất báo cáo lớp')} — {exportClassTarget.name || exportClassTarget.code}
                </h2>
                <div
                  className="panel-action"
                  onClick={() => setExportClassTarget(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {tr('Đóng')}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  marginTop: '12px',
                }}
              >
                <p style={{ fontSize: '12px', color: 'rgba(0,33,71,0.6)', margin: 0 }}>
                  {tr('Chọn loại báo cáo — hệ thống sẽ sinh file và tải về máy.')}
                </p>
                {EXPORT_TYPES.map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    disabled={exportingType !== null}
                    onClick={() => handleExportReport(exportClassTarget.classId, t.type)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      cursor: exportingType !== null ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#002147',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>📄 {t.label}</span>
                    {exportingType === t.type && <span>{tr('Đang xuất...')}</span>}
                  </button>
                ))}
                {exportError && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: '#fef2f2',
                      border: '1px solid #fca5a5',
                      borderRadius: '8px',
                      color: '#b91c1c',
                      fontSize: '12px',
                    }}
                  >
                    {exportError}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Toast notifications */}
      <toast.ToastContainer />
    </div>
  );
};

export default CourseClassManagement;
