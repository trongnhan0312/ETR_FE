/**
 * Tiện ích hiển thị minh chứng (EvidenceFile) — dùng chung cho các trang có bảng minh chứng.
 *
 * Bối cảnh dữ liệu: BE trả HAI nguồn thông tin cho một minh chứng:
 *   - `mimeType`  (đến từ bảng Attachment — có thể RỖNG nếu bản ghi Attachment thiếu)
 *   - `evidenceTypeId` (loại minh chứng: Photo Evidence / Signed Paper Form / Digital Certificate…)
 *
 * Trước đây FE chỉ nhìn `mimeType`; khi Attachment thiếu (mimeType = null) thì rơi vào nhánh
 * else nên xếp TẤT CẢ minh chứng là "SIGNATURE" → tab HÌNH ẢNH / TÀI LIỆU PDF luôn 0 và cột
 * PHÂN LOẠI sai. Các hàm dưới đây suy loại theo thứ tự: mimeType → tên loại minh chứng → để trống
 * (không đoán bừa).
 */

/** Loại suy từ MIME type. Trả "" khi không xác định được. */
export const evidenceCategoryFromMime = (mimeType) => {
  const m = String(mimeType || "").toLowerCase();
  if (m === "application/pdf") return "PDF DOC";
  if (m.startsWith("image/")) return "PHOTO";
  return "";
};

/**
 * Loại suy từ tên loại minh chứng (GET /EvidenceTypes).
 * Thứ tự xét quan trọng: "Signed Paper Form" phải là SIGNATURE dù có chữ "paper".
 * Trả "" khi không xác định được.
 */
export const evidenceCategoryFromTypeName = (typeName) => {
  const n = String(typeName || "").toLowerCase();
  if (/sign|signature|ký/.test(n)) return "SIGNATURE";
  if (/photo|image|picture|ảnh/.test(n)) return "PHOTO";
  if (/pdf|document|certificate|paper|form|tài liệu|chứng/.test(n)) return "PDF DOC";
  return "";
};

/**
 * Dung lượng hiển thị gọn. Trả chuỗi RỖNG khi BE chưa có `fileSize`
 * (trước đây FE luôn hiện "0 MB" như thể file nặng 0 MB).
 */
export const formatEvidenceSize = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n >= 1024 * 1024
    ? `${(n / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;
};
