import { api } from "./api";

/**
 * Evidence gắn với học viên qua SubjectResultId (EvidenceResponse trả subjectResultId).
 * Nhưng AccountId của một số bản ghi tải lên qua trang Instructor trước đây bị lưu nhầm là
 * AccountId của giảng viên (bug upload), nên không join được tên học viên qua accountId.
 *
 * Hàm này dựng map subjectResultId → accountId bằng cách:
 *   1. GET /Etr → danh sách ETR (enrollmentId)
 *   2. GET /Etr/{id} → subjectResults (subjectResultId) + trạng thái ETR của từng hồ sơ
 *   3. GET /Enrollments → enrollmentId → accountId
 * (tất cả endpoint đều cho phép role QA — KHÔNG đụng backend).
 *
 * Đồng thời trả về tập subjectResultId thuộc ETR đang Completed/Locked — backend chặn mọi
 * thao tác sửa evidence của các ETR này (Business rule "Completed or Locked"), nên FE ẩn
 * nút Verify/Reject tương ứng.
 *
 * @param {Array} [etrs] ETR list đã tải sẵn (nếu có) để tránh gọi lại GET /Etr.
 * @returns {Promise<{srToAccount: Object, lockedSrIds: Set<number>, etrDetailsById: Object}>}
 *   etrDetailsById: map etrId → chi tiết ETR (EtrDetailsResponse) đã fetch — tái sử dụng được
 *   cho trang registry (evidence files per ETR) mà không phải gọi lại /Etr/{id}.
 */
export const buildSrToAccountMap = async (etrs) => {
  const etrsArr = Array.isArray(etrs)
    ? etrs
    : await api.get("/Etr").catch(() => []);

  const enrollments = await api.get("/Enrollments").catch(() => []);
  const enrollmentsArr = Array.isArray(enrollments) ? enrollments : [];
  const enrollmentByEnrollmentId = new Map(
    enrollmentsArr.map((e) => [e.enrollmentId, e])
  );

  const srToAccount = {};
  const lockedSrIds = new Set();
  const etrDetailsById = {};
  await Promise.all(
    etrsArr.map(async (etr) => {
      const etrId = etr.etrCourseRecordId || etr.eTRCourseRecordId;
      if (!etrId) return;
      const details = await api.get(`/Etr/${etrId}`).catch(() => null);
      if (!details || !Array.isArray(details.subjectResults)) return;
      etrDetailsById[etrId] = details;
      const enrollment = enrollmentByEnrollmentId.get(details.enrollmentId);
      // Backend chặn sửa EvidenceFile khi ETR Status == "Completed" OR IsLocked == true
      const isLockedEtr = details.status === "Completed" || details.isLocked === true;
      details.subjectResults.forEach((sr) => {
        if (enrollment && enrollment.accountId) {
          srToAccount[sr.subjectResultId] = enrollment.accountId;
        }
        if (isLockedEtr) {
          lockedSrIds.add(sr.subjectResultId);
        }
      });
    })
  );
  return { srToAccount, lockedSrIds, etrDetailsById };
};

/**
 * Trả về tên học viên của một evidence.
 * - Ưu tiên accountId trực tiếp (bản ghi mới đã được sửa).
 * - Fallback sang accountId suy ra từ subjectResultId (bản ghi cũ bị lưu nhầm accountId).
 *
 * @param {Object} ev Evidence response từ GET /Evidences.
 * @param {Array} profilesArr UserProfileResponse list.
 * @param {Object} srToAccount map subjectResultId → accountId.
 * @returns {string} Tên học viên hoặc fallback "Student #<accountId>".
 */
export const resolveEvidenceLearner = (ev, profilesArr, srToAccount = {}) => {
  const findName = (accountId) => {
    if (!accountId) return null;
    const profile = profilesArr.find((p) => p.accountId === accountId);
    return profile?.fullName || null;
  };

  return (
    findName(ev.accountId) ||
    findName(srToAccount[ev.subjectResultId]) ||
    `Student #${ev.accountId || ""}`
  );
};
