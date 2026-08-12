// ── Lịch sử thao tác của người dùng hiện tại ─────────────────────────────
// Lưu trên localStorage theo từng tài khoản — KHÔNG cần gọi BE.
// Chỉ ghi các thao tác GHI (POST/PUT/PATCH/DELETE): thành công lẫn thất bại.

const STORAGE_PREFIX = "etr_activity_log";
const MAX_ENTRIES = 50;

const getAccountKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const id = user.accountId ?? user.userId ?? "anonymous";
    return `${STORAGE_PREFIX}_${id}`;
  } catch {
    return `${STORAGE_PREFIX}_anonymous`;
  }
};

/** Đọc danh sách thao tác gần nhất (mới nhất trước). */
export const readActivities = () => {
  try {
    const raw = localStorage.getItem(getAccountKey());
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

/** Thêm 1 thao tác vào lịch sử (giới hạn MAX_ENTRIES). */
export const addActivity = ({ type, method, endpoint, status, message }) => {
  try {
    const list = readActivities();
    list.unshift({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type, // 'success' | 'error'
      method,
      endpoint,
      status: status ?? null,
      message: message || "",
      time: Date.now(),
    });
    localStorage.setItem(getAccountKey(), JSON.stringify(list.slice(0, MAX_ENTRIES)));
    notifyUpdated();
  } catch (e) {
    console.warn("activityLog: không thể ghi lịch sử", e);
  }
};

/** Báo cho dropdown biết lịch sử đã thay đổi (kể cả tab khác mở dropdown). */
const notifyUpdated = () => {
  try {
    window.dispatchEvent(new CustomEvent("etr-activity-updated"));
  } catch {
    /* không có window (test/node) → bỏ qua */
  }
};

/** Xóa toàn bộ lịch sử thao tác của tài khoản hiện tại. */
export const clearActivities = () => {
  try {
    localStorage.removeItem(getAccountKey());
    notifyUpdated();
  } catch (e) {
    console.warn("activityLog: không thể xóa lịch sử", e);
  }
};
