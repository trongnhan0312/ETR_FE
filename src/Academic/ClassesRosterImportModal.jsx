import { useState } from "react";
import { createPortal } from "react-dom";
import { api, parseApiError } from "../utils/api";
import { parseExcelPreview } from "../utils/excelPreview";
import ExcelPreviewTable from "../components/ExcelPreviewTable";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../components/Toast";

/**
 * Bulk Import Lớp học + Danh sách học viên qua Excel — role Academic.
 * Khớp ImportController BE:
 *   GET  /import/classes-roster/template   → file xlsx (Classes + Students sheet)
 *   POST /import/classes-roster/validate   → ImportValidationResult { TotalRows, ValidRows, ErrorRows, CanCommit, Errors }
 *   POST /import/classes-roster/commit     → ImportCommitResult   { Imported, Skipped, Errors }
 * Pattern 2 bước Validate (dry-run) → Commit (all-or-nothing), giống Attendance/Assessment/Accounts import.
 */
const ClassesRosterImportModal = ({ onClose, onSuccess }) => {
  const { tr } = useLanguage();
  const toast = useToast();
  const [importFile, setImportFile] = useState(null);
  const [excelPreview, setExcelPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const blob = await api.downloadFile(
        "/import/classes-roster/template",
        { suppressAuthRedirect: true },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "bulk_import_classes_roster.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setImportError("");
    } catch (err) {
      console.error("Lỗi tải template:", err);
      setImportError(parseApiError(err, "Tải template thất bại."));
    } finally {
      setDownloading(false);
    }
  };

  const resetFile = () => {
    setImportFile(null);
    setExcelPreview(null);
    setImportResult(null);
    setImportError("");
  };

  const handleValidateImport = async () => {
    setImportError("");
    if (!importFile) {
      setImportError(tr("Vui lòng chọn file Excel trước khi kiểm tra."));
      return;
    }
    setValidating(true);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      const result = await api.postFormData(
        "/import/classes-roster/validate",
        fd,
      );
      setImportResult(result);
    } catch (err) {
      console.error("Lỗi validate import:", err);
      setImportResult(null);
      setImportError(parseApiError(err, "Kiểm tra file thất bại."));
    } finally {
      setValidating(false);
    }
  };

  const handleCommitImport = async () => {
    setImportError("");
    if (!importFile) return;
    setCommitting(true);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      const result = await api.postFormData(
        "/import/classes-roster/commit",
        fd,
      );
      setImportResult(result);
      // All-or-nothing: BE rollback toàn bộ nếu bất kỳ dòng nào lỗi (Commit trả 200
      // kèm Imported==0 + errors, hoặc 400 kèm JSON) — đóng khi import sạch hoàn toàn.
      if (
        !result ||
        !Array.isArray(result.errors) ||
        result.errors.length === 0
      ) {
        toastSuccess(result);
      } else {
        setImportError(
          (Array.isArray(result.errors) ? result.errors : [])
            .map(
              (e) =>
                `- ${tr("Dòng")} ${e.row} (${e.column}): ${e.message}`,
            )
            .join("\n"),
        );
      }
    } catch (err) {
      console.error("Lỗi commit import:", err);
      const raw = typeof err === "string" ? err : (err && err.message) || "";
      let detail = "";
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.errors)) {
          detail = parsed.errors
            .map(
              (e) => `- ${tr("Dòng")} ${e.row} (${e.column}): ${e.message}`,
            )
            .join("\n");
        }
      } catch {
        /* không phải JSON — dùng fallback chung */
      }
      setImportError(detail || parseApiError(err, "Import thất bại."));
    } finally {
      setCommitting(false);
    }
  };

  const toastSuccess = (result) => {
    const imported = typeof result?.imported === "number" ? result.imported : 0;
    const skipped = typeof result?.skipped === "number" ? result.skipped : 0;
    const summary = `${tr("Đã nhập")}: ${imported} · ${tr("Bỏ qua")}: ${skipped}`;
    toast.success(`${tr("Import lớp học & học viên thành công!")} ${summary}`);
    setImportResult(result);
    onClose();
    onSuccess && onSuccess();
  };

  const renderImportResult = () => {
    if (!importResult) return null;
    // Kết quả validate (dry-run)
    if (typeof importResult.totalRows === "number") {
      return (
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "12px",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "#334155",
                padding: "6px 10px",
                background: "#fff",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
              }}
            >
              {tr("Tổng dòng")}: {importResult.totalRows}
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "#15803d",
                padding: "6px 10px",
                background: "#f0fdf4",
                borderRadius: "6px",
                border: "1px solid #bbf7d0",
              }}
            >
              {tr("Hợp lệ")}: {importResult.validRows}
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "#b91c1c",
                padding: "6px 10px",
                background: "#fef2f2",
                borderRadius: "6px",
                border: "1px solid #fecaca",
              }}
            >
              {tr("Lỗi")}: {importResult.errorRows}
            </span>
          </div>
          {Array.isArray(importResult.errors) &&
            importResult.errors.length > 0 && (
              <div
                style={{
                  marginTop: "10px",
                  maxHeight: "160px",
                  overflow: "auto",
                }}
              >
                {importResult.errors.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: "11px",
                      padding: "4px 8px",
                      background: "#fff",
                      borderRadius: "6px",
                      marginBottom: "4px",
                      color: "#b91c1c",
                    }}
                  >
                    {tr("Dòng")} {e.row} · {e.column}: {e.message}
                  </div>
                ))}
              </div>
            )}
          {importResult.canCommit && (
            <button
              onClick={handleCommitImport}
              type="button"
              disabled={committing}
              style={{
                marginTop: "12px",
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: "#16a34a",
                color: "#fff",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              {committing
                ? tr("Đang nhập dữ liệu...")
                : tr("✅ Nhập dữ liệu (Commit)")}
            </button>
          )}
        </div>
      );
    }
    // Kết quả commit
    return (
      <div
        style={{
          border: "1px solid #bbf7d0",
          borderRadius: "10px",
          padding: "12px",
          background: "#f0fdf4",
          fontSize: "12px",
          color: "#166534",
          fontWeight: "600",
        }}
      >
        {tr("Đã nhập")}: {importResult.imported} · {tr("Bỏ qua")}:{" "}
        {importResult.skipped}
        {Array.isArray(importResult.errors) &&
          importResult.errors.length > 0 && (
            <div style={{ marginTop: "8px" }}>
              {importResult.errors.map((e, i) => (
                <div key={i} style={{ fontSize: "11px", color: "#b91c1c" }}>
                  {tr("Dòng")} {e.row} · {e.column}: {e.message}
                </div>
              ))}
            </div>
          )}
      </div>
    );
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,33,71,0.75)",
        zIndex: 999999,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="dashboard-panel"
        style={{
          width: "640px",
          maxWidth: "92vw",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
          margin: "auto",
          maxHeight: "88vh",
          overflow: "auto",
        }}
      >
        <div className="panel-header">
          <h2>{tr("IMPORT LỚP HỌC & DANH SÁCH HỌC VIÊN (EXCEL)")}</h2>
          <div
            className="panel-action"
            onClick={onClose}
            style={{ cursor: "pointer" }}
          >
            {tr("Đóng")}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            marginTop: "12px",
            padding: "0 18px 18px",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              color: "rgba(0,33,71,0.6)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {tr(
              "Tải template Excel (3 sheet: Classes tạo lớp mới, Instructors phân công giảng viên theo môn, Students ghi danh học viên vào lớp). Sau đó kiểm tra và nhập — toàn bộ file sẽ thành công hoặc không có gì được ghi nếu có bất kỳ dòng lỗi.",
            )}
          </p>

          {/* Bước 1: Tải template */}
          <button
            onClick={handleDownloadTemplate}
            type="button"
            disabled={downloading}
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "700",
              color: "#002147",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {downloading ? tr("Đang tải...") : "⬇ " + tr("Tải template Excel")}
          </button>

          {/* Bước 2: Chọn file + validate */}
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: "10px",
              minWidth: 0,
            }}
          >
            <label
              style={{
                position: "relative",
                display: "flex",
                flex: 1,
                alignItems: "center",
                gap: "12px",
                minHeight: "46px",
                padding: "8px 14px",
                borderRadius: "10px",
                border: `1.5px ${importFile ? "solid" : "dashed"} ${importFile ? "#bbf7d0" : "#cbd5e1"}`,
                background: importFile
                  ? "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)"
                  : "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                cursor: "pointer",
                overflow: "hidden",
              }}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0,
                  cursor: "pointer",
                }}
                onChange={async (e) => {
                  const file = e.target.files?.[0] || null;
                  setImportFile(file);
                  setImportResult(null);
                  setImportError("");
                  if (file) {
                    try {
                      const preview = await parseExcelPreview(file);
                      setExcelPreview(preview);
                    } catch (err) {
                      console.error("Lỗi đọc file Excel:", err);
                      setExcelPreview(null);
                    }
                  } else {
                    setExcelPreview(null);
                  }
                }}
              />
              <span
                style={{
                  flexShrink: 0,
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#c5a059",
                  background: "rgba(197,160,89,0.1)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
              </span>
              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#002147",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                  }}
                  title={importFile ? importFile.name : ""}
                >
                  {importFile
                    ? importFile.name
                    : tr("Chọn file Excel (.xlsx / .xls)")}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "600",
                    color: "rgba(0,33,71,0.45)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {importFile
                    ? `${(importFile.size / 1024).toFixed(1)} KB · ${tr(
                        "Bấm để chọn file khác",
                      )}`
                    : tr("Chọn tệp để kiểm tra và nhập dữ liệu")}
                </span>
              </span>
            </label>

            {importFile && (
              <button
                type="button"
                onClick={resetFile}
                title={tr("Bỏ chọn tệp")}
                style={{
                  flexShrink: 0,
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: "16px",
                  fontWeight: "700",
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  alignSelf: "center",
                }}
              >
                ×
              </button>
            )}

            <button
              onClick={handleValidateImport}
              type="button"
              disabled={validating || committing}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: "none",
                background: "#c5a059",
                color: "#fff",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "700",
                whiteSpace: "nowrap",
              }}
            >
              {validating ? tr("Đang kiểm tra...") : tr("Kiểm tra file")}
            </button>
          </div>

          {/* Xem trước dữ liệu trong file Excel */}
          {excelPreview && (
            <ExcelPreviewTable
              headers={excelPreview.headers}
              rows={excelPreview.rows}
              tr={tr}
            />
          )}

          {importError && (
            <div
              style={{
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: "8px",
                color: "#b91c1c",
                fontSize: "12px",
                whiteSpace: "pre-wrap",
              }}
            >
              {importError}
            </div>
          )}

          {/* Kết quả validate / commit */}
          {renderImportResult()}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ClassesRosterImportModal;
