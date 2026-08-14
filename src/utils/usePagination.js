import { useState, useEffect, useMemo } from "react";

/**
 * Phân trang client-side dùng chung cho mọi bảng.
 *
 * @param {Array} items - danh sách ĐÃ lọc (full list, chưa cắt).
 * @param {object} [options]
 * @param {number} [options.pageSize=10] - số dòng mỗi trang.
 * @param {string|number} [options.resetKey] - giá trị thay đổi khi bộ lọc/tìm kiếm
 *   đổi → tự về trang 1 (VD: `${searchQuery}|${filter}`).
 */
export const usePagination = (items, { pageSize = 10, resetKey = "" } = {}) => {
  const [page, setPage] = useState(1);

  const total = Array.isArray(items) ? items.length : 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Bộ lọc/tìm kiếm đổi → quay về trang 1
  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  // Dữ liệu thu gọn (sau khi lọc) → tự rơi về trang hợp lệ
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, pageCount, pageItems, total, pageSize };
};
