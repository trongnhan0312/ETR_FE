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
 * Nhãn tiếng Anh cho 4 giá trị legacy — dùng chung cho các bảng status map của FE
 * để không hiển thị raw enum khi gặp dữ liệu cũ.
 */
export const ETR_LEGACY_STATUS_LABELS = {
  Pending: 'Pending QA',
  UnderReview: 'Under Review',
  Approved: 'Approved',
  Rejected: 'Returned for Correction',
};
