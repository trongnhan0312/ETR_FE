/**
 * Tích hợp Cloudinary cho minh chứng (evidence).
 *
 * Mô hình mới (2026-08): FE upload thẳng file lên Cloudinary (unsigned upload preset),
 * chỉ gửi URL + metadata về BE qua POST /Evidences/upload (JSON) — BE không nhận byte nào.
 *
 * Cần cấu hình 2 biến môi trường (xem .env.example):
 *   VITE_CLOUDINARY_CLOUD_NAME     — cloud name của tài khoản Cloudinary
 *   VITE_CLOUDINARY_UPLOAD_PRESET  — unsigned upload preset (cho phép FE upload không ký)
 */

import { translateVn } from "./translate";

const CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

// Whitelist khớp EvidenceService.AllowedExtensions / AllowedMimeTypes phía BE —
// chặn sớm tại FE để user không phải đợi upload xong mới biết lỗi.
export const ALLOWED_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf",
];

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

export const EVIDENCE_ACCEPT_ATTR = ".jpg,.jpeg,.png,.gif,.webp,.pdf";

/** Kiểm tra đuôi file + mime có nằm trong whitelist của BE không. Trả về chuỗi lỗi hoặc null.
 *  Chuỗi lỗi giữ tĩnh (không nội suy) để tr() dịch được sang tiếng Anh. */
export const validateEvidenceFile = (file) => {
  if (!file) return "Thiếu tệp tin.";
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return "Định dạng tệp không được hỗ trợ. Vui lòng chọn PDF hoặc ảnh (JPG/PNG/GIF/WEBP).";
  }
  // Một số trình duyệt để type rỗng — khi đó tin vào extension.
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    return "Kiểu tệp không được hỗ trợ. Vui lòng chọn PDF hoặc ảnh (JPG/PNG/GIF/WEBP).";
  }
  return null;
};

const isConfigured = () => Boolean(CLOUD_NAME && UPLOAD_PRESET);

/**
 * Upload một file lên Cloudinary (unsigned preset).
 * Trả về object đúng shape BE cần trong UploadEvidenceRequest:
 *   { fileUrl, publicId, fileName, mimeType, fileSize }
 */
export async function uploadToCloudinary(file) {
  const notValid = validateEvidenceFile(file);
  if (notValid) throw new Error(translateVn(notValid) || notValid);

  if (!isConfigured()) {
    throw new Error(
      translateVn(
        "Chưa cấu hình Cloudinary (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET). Không thể tải lên minh chứng.",
      ) ||
        "Chưa cấu hình Cloudinary. Không thể tải lên minh chứng.",
    );
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(endpoint, { method: "POST", body: formData });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || "";
    } catch {
      /* bỏ qua body lạ */
    }
    throw new Error(
      `Cloudinary upload failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  const data = await res.json();
  const secureUrl = data.secure_url || data.url;
  if (!secureUrl || !secureUrl.startsWith("https://")) {
    throw new Error("Cloudinary did not return a valid https URL.");
  }

  return {
    fileUrl: secureUrl,
    publicId: data.public_id || "",
    fileName: file.name,
    mimeType: file.type || "",
    fileSize: typeof file.size === "number" ? file.size : null,
  };
}

export default uploadToCloudinary;
