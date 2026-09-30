/**
 * Utility helper to determine if a Class is eligible for new Student Enrollments,
 * Class Transfers, and Roster Imports according to ETR Aviation Business Rules (Phase 1).
 *
 * Rules:
 * 1. Class must NOT be InProgress / Active (must not have ongoing training sessions).
 * 2. Class must NOT be Completed.
 * 3. Class must NOT be Cancelled.
 * 4. Class StartDate must be a valid calendar date and >= today in Academy Timezone (Asia/Ho_Chi_Minh / UTC+7).
 *    Missing, unparseable, or calendar-invalid StartDate (e.g. 31/02/2026, month 13) is treated as ineligible.
 */

export const ACADEMY_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const ACADEMY_UTC_OFFSET_HOURS = 7;

/**
 * Validates whether a given year, month, day form a genuinely valid calendar date
 * (e.g. rejects 2026-02-31, 31/02/2026, month 13, day 99, non-leap year Feb 29).
 *
 * @param {number|string} year
 * @param {number|string} month 1-12
 * @param {number|string} day 1-31
 * @returns {boolean}
 */
export const isValidCalendarDate = (year, month, day) => {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return false;
  }
  if (y < 1900 || y > 2999) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  // Get max days in the specified month of the specified year using UTC
  const maxDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= maxDays;
};

/**
 * Converts a Date, timestamp, or ISO string to a calendar date string (YYYY-MM-DD)
 * in the Academy's official timezone (Asia/Ho_Chi_Minh, UTC+7).
 *
 * Rejects invalid calendar dates (e.g. 2026-99-99, 31/02/2026, month 13).
 *
 * @param {Date|string|number} dateInput
 * @returns {string|null} Formatted date string (YYYY-MM-DD) or null if invalid.
 */
export const toAcademyDateString = (dateInput) => {
  if (dateInput === null || dateInput === undefined || dateInput === '') {
    return null;
  }

  // Handle plain calendar date strings
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;

    // Handle YYYY-MM-DD
    const isoDateMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoDateMatch) {
      const [, yStr, mStr, dStr] = isoDateMatch;
      const y = Number(yStr);
      const m = Number(mStr);
      const d = Number(dStr);
      if (!isValidCalendarDate(y, m, d)) {
        return null;
      }
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    // Handle DD/MM/YYYY or D/M/YYYY (common Vietnamese/European format)
    const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
      const [, dStr, mStr, yStr] = dmyMatch;
      const y = Number(yStr);
      const m = Number(mStr);
      const d = Number(dStr);
      if (!isValidCalendarDate(y, m, d)) {
        return null;
      }
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    // Check for ISO strings like 2026-02-31T... and validate calendar date prefix first
    const prefixMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T\s]/);
    if (prefixMatch) {
      const [, yStr, mStr, dStr] = prefixMatch;
      if (!isValidCalendarDate(yStr, mStr, dStr)) {
        return null;
      }
    }
  }

  const dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(dateObj.getTime())) {
    return null;
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: ACADEMY_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const result = formatter.format(dateObj);
    const [y, m, d] = result.split('-');
    if (!isValidCalendarDate(y, m, d)) return null;
    return result;
  } catch {
    // Fallback: Convert to Academy Timezone (UTC+7) explicitly
    const academyOffsetMs = ACADEMY_UTC_OFFSET_HOURS * 60 * 60 * 1000;
    const academyTime = new Date(dateObj.getTime() + academyOffsetMs);
    const y = academyTime.getUTCFullYear();
    const m = academyTime.getUTCMonth() + 1;
    const d = academyTime.getUTCDate();
    if (!isValidCalendarDate(y, m, d)) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
};

/**
 * Returns today's date string (YYYY-MM-DD) in the Academy timezone (Asia/Ho_Chi_Minh).
 */
export const getAcademyTodayString = () => {
  return toAcademyDateString(new Date());
};

// Kept for backward compatibility
export const toLocalDateString = (dateObj) => {
  return toAcademyDateString(dateObj) || '';
};

export const isClassEligibleForEnrollment = (cls) => {
  if (!cls) {
    return {
      eligible: false,
      reason: 'Lớp không tồn tại',
      detail: 'Không tìm thấy thông tin lớp học.',
    };
  }

  const st = String(cls.statusRaw || cls.status || '').trim().toLowerCase();

  if (st === 'inprogress' || st === 'active' || st === 'đang diễn ra') {
    return {
      eligible: false,
      reason: 'Lớp đang diễn ra',
      detail: 'Không thể ghi danh vào lớp đang diễn ra theo quy tắc bảo toàn dữ liệu và tiến độ ETR.',
    };
  }

  if (st === 'completed' || st === 'đã kết thúc') {
    return {
      eligible: false,
      reason: 'Lớp đã kết thúc',
      detail: 'Lớp học đã kết thúc — không được phép ghi danh hoặc chuyển học viên vào.',
    };
  }

  if (st === 'cancelled' || st === 'đã hủy') {
    return {
      eligible: false,
      reason: 'Lớp đã hủy',
      detail: 'Lớp học đã hủy — không được phép ghi danh hoặc chuyển học viên vào.',
    };
  }

  // Check StartDate in Academy Timezone with calendar validity check
  const todayAcademyStr = getAcademyTodayString();
  const rawStart = cls.startDateRaw !== undefined ? cls.startDateRaw : cls.startDate;
  const clsStartStr = toAcademyDateString(rawStart);

  if (!clsStartStr) {
    return {
      eligible: false,
      reason: 'Ngày bắt đầu không hợp lệ',
      detail: 'Lớp học không có ngày bắt đầu hợp lệ — không thể ghi danh.',
    };
  }

  if (clsStartStr < todayAcademyStr) {
    return {
      eligible: false,
      reason: 'Đã qua ngày bắt đầu',
      detail: 'Lớp học đã qua ngày bắt đầu đào tạo — không được phép ghi danh muộn để đảm bảo tính toàn vẹn hồ sơ.',
    };
  }

  return {
    eligible: true,
    reason: '',
    detail: '',
  };
};


