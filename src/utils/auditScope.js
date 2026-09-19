/**
 * [Module/Flow]: Kiểm toán Hệ thống & Tuân thủ
 * [Core Responsibility]: Lọc audit log theo phạm vi chức năng của role đang đăng nhập.
 *
 * Quy tắc (FE-side filtering — BE vẫn trả full list nên FE phải tự giới hạn):
 *  - Admin: xem toàn bộ log.
 *  - Audit (Auditor): xem toàn bộ log vận hành, TRỪ log quản trị hệ thống
 *    (Account, UserProfile, Department, EvidenceType, CompletionRequirement) và ADMIN_FORCE_UNLOCK.
 *  - QA: chỉ xem log thuộc phạm vi ETR / minh chứng / phê duyệt / điểm danh / kết quả đánh giá,
 *    hoặc log do chính mình tạo.
 *  - Academic: chỉ xem log thuộc phạm vi đào tạo / ghi danh / lớp / môn / ETR,
 *    hoặc log do chính mình tạo.
 *  - Role khác: chỉ log do chính mình tạo.
 *
 * Log do chính mình tạo (AccountId trùng user đang đăng nhập) luôn được xem lại
 * ở mọi role — người dùng luôn thấy được lịch sử thao tác của chính mình.
 */

/** Entity thuộc quản trị hệ thống — chỉ Admin xem được log. */
const SYSTEM_ADMIN_ENTITIES = new Set([
  'Account',
  'UserProfile',
  'Department',
  'EvidenceType',
  'CompletionRequirement',
]);

/** Entity thuộc phạm vi ETR / kiểm định — QA được xem. */
const QA_SCOPE_ENTITIES = new Set([
  'ETRCourseRecord',
  'EvidenceFile',
  'ApprovalRequest',
  'AttendanceRecord',
  'AssessmentResult',
]);

/** Entity thuộc phạm vi đào tạo / ghi danh — Academic được xem. */
const ACADEMIC_SCOPE_ENTITIES = new Set([
  'Course',
  'CourseSubject',
  'Subject',
  'Class',
  'CourseEnrollment',
  'ETRCourseRecord',
  'AttendanceRecord',
  'AssessmentResult',
  'EvidenceType',
  'CompletionRequirement',
]);

/** Đọc user đang đăng nhập từ localStorage (an toàn khi thiếu/Parse lỗi). */
export const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch {
    return null;
  }
};

/**
 * Kiểm tra 1 log có thuộc phạm vi xem của user hiện tại không.
 * @param {{accountId?: number|null, AccountId?: number|null, actionType?: string, ActionType?: string, entityName?: string, EntityName?: string}} log
 * @param {{accountId?: number, roleName?: string}|null} [user] - mặc định lấy từ localStorage
 */
export const isLogVisibleToUser = (log, user = getCurrentUser()) => {
  if (!log) return false;
  if (!user) return false;

  const role = String(user.roleName || user.role || '').toLowerCase();
  if (role === 'admin') return true;

  // ADMIN_FORCE_UNLOCK là hành động quản trị đặc quyền — chỉ Admin xem được.
  const actionType = String(log.actionType ?? log.ActionType ?? '').toUpperCase().trim();
  if (actionType === 'ADMIN_FORCE_UNLOCK') return false;

  // Log do chính mình tạo: luôn được xem lại.
  const logAccountId = Number(log.accountId ?? log.AccountId ?? NaN);
  const myAccountId = Number(user.accountId ?? user.userId ?? NaN);
  if (Number.isFinite(logAccountId) && Number.isFinite(myAccountId) && logAccountId === myAccountId) {
    return true;
  }

  const entityName = String(log.entityName ?? log.EntityName ?? '').trim();

  switch (role) {
    case 'auditor':
    case 'audit':
      return !SYSTEM_ADMIN_ENTITIES.has(entityName);
    case 'qa':
    case 'qualityassurance':
      return QA_SCOPE_ENTITIES.has(entityName);
    case 'academic':
    case 'academicstaff':
      return ACADEMIC_SCOPE_ENTITIES.has(entityName);
    default:
      // Role khác (Student, Instructor, TrainingManager...): không xem log của người khác.
      return false;
  }
};

/**
 * Lọc một mảng log theo phạm vi role hiện tại.
 * Dùng ngay sau khi fetch từ GET /Audit để chỉ hiển thị phần được phép.
 * @template T
 * @param {T[]} logs
 * @param {{accountId?: number, roleName?: string}|null} [user]
 * @returns {T[]}
 */
export const filterLogsByScope = (logs, user = getCurrentUser()) => {
  if (!Array.isArray(logs)) return [];
  // Admin không cần lọc — giữ nguyên để tránh sao chép mảng lớn vô ích.
  const role = String(user?.roleName || user?.role || '').toLowerCase();
  if (role === 'admin') return logs;
  return logs.filter((log) => isLogVisibleToUser(log, user));
};
