import { api } from "./api";
import { isEtrCompleted } from "./etrStatus";

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
  const srToMeta = {};
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
      const isLockedEtr = isEtrCompleted(details.status) || details.isLocked === true;
      details.subjectResults.forEach((sr) => {
        if (enrollment && enrollment.accountId) {
          srToAccount[sr.subjectResultId] = enrollment.accountId;
        }
        srToMeta[sr.subjectResultId] = {
          subjectId: sr.subjectId,
          etrId,
          enrollmentId: details.enrollmentId,
          accountId: enrollment?.accountId,
          classId: enrollment?.classId,
          courseId: enrollment?.courseId,
        };
        if (isLockedEtr) {
          lockedSrIds.add(sr.subjectResultId);
        }
      });
    })
  );
  return { srToAccount, srToMeta, lockedSrIds, etrDetailsById };
};

/**
 * Trả về tên học viên của một evidence.
 * - Ưu tiên ev.learnerName từ BE (đã enrich).
 * - Ưu tiên accountId trực tiếp (bản ghi mới đã được sửa).
 * - Fallback sang accountId suy ra từ subjectResultId.
 */
export const resolveEvidenceLearner = (ev, profilesArr = [], srToAccount = {}) => {
  if (ev?.learnerName && ev.learnerName !== "-") {
    return ev.learnerCode ? `${ev.learnerName} (${ev.learnerCode})` : ev.learnerName;
  }

  const findProfile = (accountId) => {
    if (!accountId) return null;
    return profilesArr.find((p) => p.accountId === accountId);
  };

  const profile = findProfile(ev?.accountId) || findProfile(srToAccount[ev?.subjectResultId]);
  if (profile?.fullName) {
    return profile.userCode ? `${profile.fullName} (${profile.userCode})` : profile.fullName;
  }

  return `Student #${ev?.accountId || ""}`;
};

/**
 * Trả về tên người tải lên (giảng viên / nhân viên).
 */
export const resolveEvidenceInstructor = (ev, profilesArr = []) => {
  if (ev?.uploadedByName) return ev.uploadedByName;
  if (!ev?.uploadedByAccountId) return "—";
  const profile = profilesArr.find((p) => p.accountId === ev.uploadedByAccountId);
  if (profile?.fullName) {
    return profile.userCode ? `${profile.fullName} (${profile.userCode})` : profile.fullName;
  }
  return `Account #${ev.uploadedByAccountId}`;
};

const DEFAULT_EVIDENCE_TYPES = {
  1: "Practical Checklist",
  2: "Flight / Simulator Logbook",
  3: "Assessment Result Sheet",
  4: "Medical / License Credential",
  5: "Training Signoff / Certificate",
};

/**
 * Trả về tên loại minh chứng.
 */
export const resolveEvidenceType = (ev, evidenceTypesArr = []) => {
  if (ev?.evidenceTypeName) return ev.evidenceTypeName;
  const match = (Array.isArray(evidenceTypesArr) ? evidenceTypesArr : []).find(
    (t) => (t.evidenceTypeId || t.id) === ev?.evidenceTypeId
  );
  if (match?.typeName || match?.name) return match.typeName || match.name;
  return DEFAULT_EVIDENCE_TYPES[ev?.evidenceTypeId] || `Type #${ev?.evidenceTypeId || "—"}`;
};

