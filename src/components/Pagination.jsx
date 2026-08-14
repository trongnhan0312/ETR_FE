import React from "react";
import { useLanguage } from "../context/LanguageContext";

/**
 * Phân trang dùng chung — hiển thị tối đa 5 nút trang.
 *
 * @param {object} props
 * @param {number} props.page - trang hiện tại (1-based).
 * @param {number} props.pageCount - tổng số trang.
 * @param {Function} props.onChange - (page) => void.
 * @param {number} [props.total] - tổng số dòng (hiển thị "x–y of z").
 * @param {number} [props.pageSize] - số dòng mỗi trang.
 */
const Pagination = ({ page, pageCount, onChange, total, pageSize }) => {
  const { trEn } = useLanguage();

  if (!pageCount || pageCount <= 1) {
    if (!total) return null;
    return (
      <div className="etr-pagination">
        <span className="etr-pagination-info">
          {trEn("Showing")} 1–{total} {trEn("of")} {total}
        </span>
      </div>
    );
  }

  // Tối đa 5 nút: cửa sổ quanh trang hiện tại (tự thích ứng ở 2 đầu)
  const getWindow = () => {
    const wanted = Math.min(5, pageCount);
    let start = page - Math.floor(wanted / 2);
    start = Math.max(1, Math.min(start, pageCount - wanted + 1));
    return Array.from({ length: wanted }, (_, i) => start + i);
  };

  const pages = getWindow();
  const from = (page - 1) * (pageSize || 10) + 1;
  const to = Math.min(total || from + (pageSize || 10) - 1, total || from);

  return (
    <div className="etr-pagination">
      <span className="etr-pagination-info">
        {trEn("Showing")} {from}–{to} {trEn("of")} {total}
      </span>
      <div className="etr-pagination-buttons">
        <button
          type="button"
          className="etr-page-btn"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label={trEn("Previous page")}
        >
          ‹
        </button>
        {pages.map((p) => (
          <button
            type="button"
            key={p}
            className={`etr-page-btn${p === page ? " active" : ""}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className="etr-page-btn"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          aria-label={trEn("Next page")}
        >
          ›
        </button>
      </div>
    </div>
  );
};

export default Pagination;
