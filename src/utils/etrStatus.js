/**
 * Chuẩn hóa trạng thái ETR giữa BE và FE.
 *
 * BE (`ETR.Domain.Enums.EtrStatus`) trả JSON dạng tên enum (`JsonStringEnumConverter`):
 *   Draft | InProgress | Submitted | Verified | Completed | ReturnedForCorrection | Cancelled
 *
 * Ngày 11/09/2026 BE bổ sung thêm 4 giá trị "legacy" vẫn còn tồn tại trong dữ liệu cũ
 * (commit `59aecbb` — "adding legacy EtrStatus values") để không văng 500 khi parse enum:
 *   Pending | UnderReview | Approved | Rejected
 *
 * Cách gộp nhóm dưới đây khớp đúng `DashboardKpiCalculator` phía BE:
 *   - Pending / UnderReview → nhóm "chờ phê duyệt" (như Submitted)
 *   - Approved              → nhóm "hoàn thành"     (như Completed)
 *   - Rejected              → nhóm "trả lại/từ chối" (như ReturnedForCorrection)
 */

/** Hồ sơ đã "chốt" (Completed, hoặc giá trị legacy Approved). */
export const ETR_COMPLETED_STATUSES = ['Completed', 'Approved'];

/** Hồ sơ đang chờ phê duyệt — giống `pendingApprovalCount` của BE. */
export const ETR_PENDING_APPROVAL_STATUSES = ['Submitted', 'Verified', 'Pending', 'UnderReview'];

/** Hồ sơ bị trả lại / từ chối. */
export const ETR_RETURNED_STATUSES = ['ReturnedForCorrection', 'Rejected'];

export const isEtrCompleted = (status) => ETR_COMPLETED_STATUSES.includes(status);

export const isEtrPendingApproval = (status) => ETR_PENDING_APPROVAL_STATUSES.includes(status);

export const isEtrReturned = (status) => ETR_RETURNED_STATUSES.includes(status);

/**
 * Chuẩn hóa trạng thái ETR về đúng tên enum Backend (ETR.Domain.Enums.EtrStatus):
 *   Draft | InProgress | Submitted | Verified | Completed | ReturnedForCorrection | Cancelled
 */
export const normalizeEtrStatus = (status) => {
  if (!status) return 'Draft';
  const s = String(status).trim().toLowerCase();
  if (s === 'draft') return 'Draft';
  if (s === 'inprogress' || s === 'in progress' || s === 'under review' || s === 'underreview') return 'InProgress';
  if (s === 'submitted' || s === 'pending' || s === 'pending qa' || s === 'pendingqa') return 'Submitted';
  if (s === 'verified' || s === 'qa verified' || s === 'qa_verified') return 'Verified';
  if (s === 'completed' || s === 'approved' || s === 'locked') return 'Completed';
  if (s === 'returnedforcorrection' || s === 'returned for correction' || s === 'returned' || s === 'rejected') return 'ReturnedForCorrection';
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
  return String(status).trim();
};

/** Cấu hình nhãn & màu sắc chuẩn cho từng trạng thái ETR */
export const ETR_STATUS_CONFIG = {
  Draft: {
    key: 'Draft',
    labelEn: 'Draft',
    labelVi: 'Bản nháp',
    color: '#475569',
    bg: '#f1f5f9',
    border: '#cbd5e1',
  },
  InProgress: {
    key: 'InProgress',
    labelEn: 'In Progress',
    labelVi: 'Đang đào tạo',
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  Submitted: {
    key: 'Submitted',
    labelEn: 'Submitted',
    labelVi: 'Đã nộp (Chờ QA)',
    color: '#b45309',
    bg: '#fef3c7',
    border: '#fde68a',
  },
  Verified: {
    key: 'Verified',
    labelEn: 'QA Verified',
    labelVi: 'QA đã duyệt',
    color: '#0369a1',
    bg: '#e0f2fe',
    border: '#7dd3fc',
  },
  Completed: {
    key: 'Completed',
    labelEn: 'Completed',
    labelVi: 'Hoàn thành',
    color: '#15803d',
    bg: '#dcfce7',
    border: '#86efac',
  },
  ReturnedForCorrection: {
    key: 'ReturnedForCorrection',
    labelEn: 'Returned for Correction',
    labelVi: 'Trả về chỉnh sửa',
    color: '#b91c1c',
    bg: '#fee2e2',
    border: '#fca5a5',
  },
  Cancelled: {
    key: 'Cancelled',
    labelEn: 'Cancelled',
    labelVi: 'Đã hủy',
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
  },
};

/** Lấy metadata nhãn & màu badge của ETR theo trạng thái */
export const getEtrStatusMeta = (status) => {
  const norm = normalizeEtrStatus(status);
  return ETR_STATUS_CONFIG[norm] || {
    key: norm,
    labelEn: norm,
    labelVi: norm,
    color: '#475569',
    bg: '#f1f5f9',
    border: '#cbd5e1',
  };
};

/** Hồ sơ ETR có thể nộp (Submit) lên QA: chỉ khi ở Draft, InProgress hoặc ReturnedForCorrection */
export const isEtrSubmittable = (status) => {
  const norm = normalizeEtrStatus(status);
  return norm === 'Draft' || norm === 'InProgress' || norm === 'ReturnedForCorrection';
};

// ── Trạng thái các bước trong "CHI TIẾT KIỂM DUYỆT CÁC BƯỚC HỒ SƠ" ────────────────
// Dùng chung cho trang Academic (EtrManagement) và QA (QARETRReviewQueue) để 2 nơi
// không bao giờ lệch nhau. Đầu vào là `subjectResults` của GET /Etr/{id}
// (EtrSubjectDetailResponse).

/** Ngưỡng chuyên cần tối thiểu (%) — khớp `BusinessRuleEngine.MinimumAttendanceThreshold` của BE. */
export const MINIMUM_ATTENDANCE_THRESHOLD = 80;

/**
 * Bước 2 — Điểm danh / Chuyên cần.
 * Đạt khi MỌI môn đều có `attendanceRate >= 80`.
 * BE tính `AttendanceRate = số buổi Present / số buổi đã confirm × 100` (xem AttendanceService),
 * và chỉ ghi lại khi môn có ít nhất 1 buổi đã confirm → ETR mới tạo (`attendanceRate = null`)
 * hoặc môn chưa confirm buổi nào sẽ KHÔNG đạt (hiển thị "⌛ ĐANG CHỜ").
 */
export const areAllAttendanceRatesOk = (subjectResults) =>
  Array.isArray(subjectResults) &&
  subjectResults.length > 0 &&
  subjectResults.every(
    (sr) => (sr?.attendanceRate ?? 0) >= MINIMUM_ATTENDANCE_THRESHOLD,
  );

/**
 * Bước 3 — Điểm số kết quả kiểm tra.
 * Đạt khi MỌI môn có ít nhất một dòng kết quả (AssessmentResult hoặc
 * PracticalChecklistResult) và TẤT CẢ đã được CHỐT ĐIỂM (`isPublished = true`).
 * - Môn `Exempted` bỏ qua (không cần điểm).
 * - Môn chưa có dòng kết quả nào → KHÔNG đạt: trước đây coi "không có gì" là đạt nên
 *   hồ sơ ETR mới (điểm toàn "—") hiển thị nhầm "✓ ĐÃ XÁC THỰC" ở bước 3.
 */
export const areSubjectScoresFinalized = (subjectResults) =>
  Array.isArray(subjectResults) &&
  subjectResults.length > 0 &&
  subjectResults.every((sr) => {
    if (sr?.status === "Exempted") return true;
    const results = [
      ...(sr?.assessmentResults || []),
      ...(sr?.practicalChecklistResults || []),
    ];
    if (results.length === 0) return false;
    return results.every((r) => r.isPublished === true);
  });

/**
 * Bước 4 — Minh chứng đính kèm.
 * Đạt khi có ÍT NHẤT 1 file minh chứng và TẤT CẢ đã được QA verify
 * (`status === 'Verified'`). Hồ sơ đã `Verified`/`Completed` luôn đạt (submit trước đó
 * đã chặn mọi file chưa verified).
 * Không dùng `.every()` trần vì mảng rỗng sẽ trả `true`.
 */
export const hasVerifiedEvidence = (evidences, etrStatus) =>
  (Array.isArray(evidences) &&
    evidences.length > 0 &&
    evidences.every((ev) => ev?.status === "Verified")) ||
  etrStatus === "Verified" ||
  isEtrCompleted(etrStatus);

// ── Trạng thái của từng MÔN HỌC (SubjectResult.Status) ──────────────────────────
// BE (EtrSubjectDetailResponse) trả `status` = SubjectResultStatus
// (Pending | Passed | Failed | Exempted) — KHÔNG có field `isPassed`, nên code cũ dùng
// `sr.isPassed` luôn undefined ⇒ mọi môn đều hiển thị nhầm "Chưa đạt".
// `label` ở đây là chuỗi NGUỒN tiếng Việt — component bọc qua `tr(...)` để dịch.

export const SUBJECT_STATUS_BADGES = {
  passed: { label: "Đạt", color: "#15803d", bg: "#dcfce7" },
  failed: { label: "Chưa đạt", color: "#b91c1c", bg: "#fef2f2" },
  exempted: { label: "Được miễn", color: "#1d4ed8", bg: "#dbeafe" },
  // Pending (hoặc chưa có status): môn chưa có kết quả chốt
  pending: { label: "Chưa chấm điểm", color: "#b45309", bg: "#fef3c7" },
};

/** Chuẩn hoá `status` của SubjectResult về key badge (passed/failed/exempted/pending). */
export const subjectResultStatusKey = (sr) => {
  const status = String(sr?.status ?? sr?.Status ?? "").toLowerCase();
  if (status === "passed") return "passed";
  if (status === "failed") return "failed";
  if (status === "exempted") return "exempted";
  return "pending";
};

/**
 * Nhãn + màu trạng thái môn học — dùng chung cho trang Academic (bảng "Điểm chi tiết
 * từng môn") và trang QA (khối kết quả môn học) để 2 nơi hiển thị giống nhau.
 * Nhớ bọc `tr(badge.label)` khi render.
 */
export const subjectStatusBadge = (sr) =>
  SUBJECT_STATUS_BADGES[subjectResultStatusKey(sr)];

/**
 * Nhãn tiếng Anh cho 4 giá trị legacy — dùng chung cho các bảng status map của FE
 * để không hiển thị raw enum khi gặp dữ liệu cũ.
 */
export const ETR_LEGACY_STATUS_LABELS = {
  Pending: 'Pending QA',
  UnderReview: 'Under Review',
  Approved: 'Approved',
  Rejected: 'Returned for Correction',
};
