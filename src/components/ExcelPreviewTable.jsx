import { cellDisplay } from "../utils/excelPreview";

/**
 * Bảng xem trước dữ liệu từ file Excel trước khi nhập (import).
 * Hiển thị tiêu đề cột + các dòng dữ liệu, cuộn được khi nhiều dòng.
 */
const ExcelPreviewTable = ({ headers, rows, maxRows = 8, tr = (s) => s }) => {
  if (!headers || headers.length === 0) return null;

  const shown = rows.slice(0, maxRows);
  const hiddenCount = rows.length - shown.length;

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: "#f1f5f9",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: "700",
            color: "#334155",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {tr("Dữ liệu trong file Excel")}
        </span>
        <span style={{ fontSize: "11px", color: "#64748b" }}>
          {rows.length} {tr("dòng")}
        </span>
      </div>
      <div style={{ maxHeight: "220px", overflow: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "11px",
          }}
        >
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: "6px 10px",
                    textAlign: "left",
                    color: "#334155",
                    fontWeight: "700",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    whiteSpace: "nowrap",
                    position: "sticky",
                    top: 0,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  style={{
                    padding: "12px",
                    color: "#94a3b8",
                    fontStyle: "italic",
                    textAlign: "center",
                  }}
                >
                  {tr("File không có dòng dữ liệu nào.")}
                </td>
              </tr>
            ) : (
              shown.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  {headers.map((_, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: "6px 10px",
                        color: "#0f172a",
                        borderBottom: "1px solid #f1f5f9",
                        maxWidth: "220px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cellDisplay(row[ci])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {hiddenCount > 0 && (
        <div
          style={{
            padding: "8px 12px",
            fontSize: "11px",
            color: "#64748b",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          … {tr("còn")} {hiddenCount} {tr("dòng nữa (xem trong file Excel)")}
        </div>
      )}
    </div>
  );
};

export default ExcelPreviewTable;
