/**
 * Tiện ích thông báo CRUD — gắn tên người dùng hiện tại vào thông báo thành công.
 *
 * Cách dùng:
 *   import { announce } from '../utils/crudNotify';
 *   toast.success(tr('Tạo khóa học thành công!'), announce('add', tr('Khóa học')));
 *
 * Kết quả:
 *   EN: "John Doe" has added Course
 *   VI: "Nguyễn Văn A" đã thêm Khóa học
 */

const getCurrentUserName = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u?.fullName || u?.username || u?.name || '';
  } catch {
    return '';
  }
};

const isEn = () => (localStorage.getItem('app_language') || 'en') !== 'vi';

const VERBS = {
  add: { en: 'has added', vi: 'đã thêm' },
  edit: { en: 'has updated', vi: 'đã cập nhật' },
  delete: { en: 'has deleted', vi: 'đã xóa' },
};

export const announce = (action, entity) => {
  const name = getCurrentUserName();
  const verb = VERBS[action]?.[isEn() ? 'en' : 'vi'] || action;
  return `"${name}" ${verb} ${entity}`;
};

export default getCurrentUserName;
