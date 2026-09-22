/**
 * Buổi học của lớp do BE tự sinh theo cấu hình khóa học:
 * `ClassService.CreateAsync` tạo `CourseSubject.RequiredSessions` buổi cho MỖI môn,
 * đặt tên "Buổi 1..N" (`int sessionCount = RequiredSessions > 0 ? RequiredSessions : 1`).
 *
 * BE cũng KHÔNG cho tạo buổi thủ công (`SessionService.CreateSessionAsync` ném
 * NotSupported), nên FE không thể tự bù buổi — cách duy nhất để lớp có đủ Buổi 1..N
 * mỗi môn là cấu hình "Số buổi yêu cầu" của môn trong khóa học TRƯỚC khi tạo lớp.
 * Vì vậy các helper dưới đây dùng để phát hiện sớm chuyện đó và báo cho người dùng.
 */

/** BE coi RequiredSessions <= 0 là 1 buổi — FE giữ đúng quy tắc này */
export const REQUIRED_SESSIONS_FALLBACK = 1;

/** Chuẩn hoá "Số buổi yêu cầu" của một môn (<= 0 / thiếu → 1) */
export const normalizeRequiredSessions = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : REQUIRED_SESSIONS_FALLBACK;
};

/**
 * Cấu hình số buổi/môn của khóa học (GET /Courses/{id} mới trả `subjects`).
 * @returns {Promise<Array<{subjectId:number, requiredSessions:number, configured:boolean}>>}
 */
export const fetchCourseSubjectPlan = async (api, courseId) => {
  if (!courseId) return [];
  const detail = await api.get(`/Courses/${courseId}`).catch(() => null);
  const subjects = Array.isArray(detail?.subjects) ? detail.subjects : [];
  return subjects.map((s) => {
    const required = Number(s.requiredSessions ?? s.RequiredSessions);
    return {
      subjectId: Number(s.subjectId ?? s.SubjectId),
      requiredSessions: normalizeRequiredSessions(required),
      configured: Number.isFinite(required) && required > 0,
    };
  });
};

/** Đếm số buổi hiện có của lớp theo từng môn */
export const countClassSessionsBySubject = (sessions = [], classId) =>
  (Array.isArray(sessions) ? sessions : [])
    .filter((s) => Number(s?.classId ?? s?.ClassId) === Number(classId))
    .reduce((acc, s) => {
      const id = Number(s?.subjectId ?? s?.SubjectId);
      if (!Number.isFinite(id)) return acc;
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});

/**
 * Môn nào chưa đủ số buổi so với cấu hình khóa (dùng SAU khi tạo lớp).
 * @returns {Promise<Array<{subjectId:number, required:number, actual:number}>>}
 */
export const findClassSessionShortfall = async ({
  api,
  classId,
  courseId,
  subjectNameById = {},
} = {}) => {
  if (!classId) return [];
  const [plan, sessions] = await Promise.all([
    fetchCourseSubjectPlan(api, courseId),
    api.get("/sessions").catch(() => []),
  ]);
  const actual = countClassSessionsBySubject(sessions, classId);
  const name = (id) => subjectNameById[id] || subjectNameById[String(id)] || `#${id}`;

  return plan
    .map((p) => ({
      subjectId: p.subjectId,
      subjectName: name(p.subjectId),
      required: p.requiredSessions,
      actual: actual[p.subjectId] || 0,
    }))
    .filter((r) => r.actual < r.required);
};

/**
 * Môn chưa được cấu hình "Số buổi yêu cầu" (dùng TRƯỚC khi tạo lớp: lớp sẽ chỉ có
 * 1 buổi/môn vì BE lấy mặc định 1).
 */
export const findSubjectsWithoutSessionConfig = async ({
  api,
  courseId,
  subjectNameById = {},
} = {}) => {
  const plan = await fetchCourseSubjectPlan(api, courseId);
  const name = (id) => subjectNameById[id] || subjectNameById[String(id)] || `#${id}`;
  return plan
    .filter((p) => !p.configured)
    .map((p) => ({ subjectId: p.subjectId, subjectName: name(p.subjectId) }));
};
