/**
 * Utility helper to determine if a Class is eligible for new Student Enrollments,
 * Class Transfers, and Roster Imports according to ETR Aviation Business Rules (Phase 1).
 *
 * Rules:
 * 1. Class must NOT be InProgress / Active (must not have ongoing training sessions).
 * 2. Class must NOT be Completed.
 * 3. Class must NOT be Cancelled.
 * 4. Class StartDate must be today or in the future (StartDate >= today in local academy time).
 */

export const toLocalDateString = (dateObj) => {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    dateObj = new Date();
  }
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

  // Check StartDate
  const todayStr = toLocalDateString(new Date());
  let clsStartStr = '';

  if (cls.startDateRaw) {
    const d = new Date(cls.startDateRaw);
    if (!isNaN(d.getTime())) {
      clsStartStr = toLocalDateString(d);
    }
  } else if (cls.startDate) {
    const raw = String(cls.startDate).trim();
    if (raw.includes('/')) {
      // DD/MM/YYYY format
      const parts = raw.split('/');
      if (parts.length === 3) {
        clsStartStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } else {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        clsStartStr = toLocalDateString(d);
      }
    }
  }

  if (clsStartStr && clsStartStr < todayStr) {
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
