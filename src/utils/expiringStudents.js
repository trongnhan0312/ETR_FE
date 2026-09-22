/**
 * Chuẩn hoá dữ liệu cho trang "Học viên sắp hết hạn chứng chỉ".
 *
 * `GET /Etr/expiring-students` trả về camelCase:
 *   { accountId, email, fullName, courseId, etrCourseRecordId, expiryDate, validityStatus }
 * nhưng phần render trước đây đọc PascalCase (FullName, Email, ETRCourseRecordId,
 * ExpiryDate, ValidityStatus) → mọi ô ra "Student #undefined", "--", "#" và trạng
 * thái luôn rơi vào mặc định "Sắp hết hạn".
 *
 * Ở đây chuẩn hoá về đúng 1 dạng (PascalCase), chấp nhận cả 2 cách viết để không
 * vỡ nếu BE đổi kiểu trả về (xem cách làm tương tự ở StudentCertificateStatus.jsx).
 */

const pick = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

/** Số ngày còn lại tới ngày hết hạn (âm = đã quá hạn). null nếu không có/không hợp lệ. */
export const daysUntilExpiry = (expiryDate, now = new Date()) => {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return null;
  const base = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(base.getTime())) return null;
  return Math.ceil((expiry - base) / 86400000);
};

/**
 * Suy ra trạng thái hiệu lực khi BE không trả `validityStatus`.
 * Mặc định ngưỡng 30 ngày giống lựa chọn mặc định trên UI.
 */
export const deriveValidityStatus = (expiryDate, thresholdDays = 30, now = new Date()) => {
  const days = daysUntilExpiry(expiryDate, now);
  if (days === null) return null;
  if (days < 0) return 'Expired';
  if (days <= thresholdDays) return 'ExpiringSoon';
  return 'Valid';
};

/** Một bản ghi học viên → dạng thống nhất dùng cho toàn bộ phần render. */
export const toExpiringStudent = (raw = {}, { thresholdDays = 30, now = new Date() } = {}) => {
  const expiryDate = pick(raw, ['expiryDate', 'ExpiryDate']) ?? null;
  return {
    accountId: pick(raw, ['accountId', 'AccountId']) ?? null,
    email: pick(raw, ['email', 'Email']) ?? '',
    fullName: pick(raw, ['fullName', 'FullName']) ?? '',
    courseId: pick(raw, ['courseId', 'CourseId']) ?? null,
    etrCourseRecordId:
      pick(raw, ['etrCourseRecordId', 'ETRCourseRecordId', 'etrId', 'ETRId']) ?? null,
    expiryDate,
    validityStatus:
      pick(raw, ['validityStatus', 'ValidityStatus']) ??
      deriveValidityStatus(expiryDate, thresholdDays, now),
  };
};

/** Danh sách bản ghi → danh sách đã chuẩn hoá (bỏ qua dữ liệu không phải mảng). */
export const toExpiringStudents = (raw, options) =>
  Array.isArray(raw) ? raw.map((item) => toExpiringStudent(item, options)) : [];
