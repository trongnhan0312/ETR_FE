import * as XLSX from "xlsx";

/**
 * Đọc file .xlsx/.xls ngay trên trình duyệt và trả về dữ liệu để xem trước.
 * Template do BE sinh có cấu trúc:
 *   - Dòng 1: tiêu đề (merge)
 *   - Dòng 2: metadata (SessionId/AssessmentId...)
 *   - Dòng 3: tiêu đề cột
 *   - Dòng 4 trở đi: dữ liệu
 * Nếu file không theo cấu trúc template (người dùng tự tạo), ta tự dò dòng
 * tiêu đề cột: dòng đầu tiên có ít nhất 2 ô không rỗng.
 *
 * @param {File} file File Excel người dùng chọn
 * @returns {Promise<{headers: string[], rows: (string|number)[][], totalRows: number, sheetName: string}>}
 */
export const parseExcelPreview = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0] || "";
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { headers: [], rows: [], totalRows: 0, sheetName: "" };
  }

  // aoa = array of arrays, giữ nguyên giá trị gốc (số/chuỗi/ngày)
  const aoa = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  // Dò dòng tiêu đề cột: dòng đầu tiên có >= 2 ô không rỗng.
  // Bỏ qua dòng metadata của template BE (dòng 2 chứa "SessionId: ...", "ClassId: ..."
  // "Ngày: ...", "Môn: ..." — 100% ô có dấu ":" nên dễ nhận diện).
  const isMetadataRow = (cells) => {
    const filled = (cells || []).filter((c) => c !== "" && c != null);
    if (filled.length === 0) return false;
    return (
      filled.every((c) => String(c).includes(":")) ||
      filled.some((c) =>
        /^(SessionId|AssessmentId|ClassId|SubjectId|CourseId|PassingScore|Weight|Type|Ngày|Môn):/i.test(
          String(c).trim(),
        ),
      )
    );
  };

  let headerRowIdx = -1;
  for (let i = 0; i < aoa.length; i++) {
    const filled = (aoa[i] || []).filter((c) => c !== "" && c != null).length;
    if (filled >= 2 && !isMetadataRow(aoa[i])) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) {
    return { headers: [], rows: [], totalRows: 0, sheetName };
  }

  const headers = (aoa[headerRowIdx] || []).map((c) => String(c ?? "").trim());
  const rows = aoa.slice(headerRowIdx + 1).filter((r) =>
    (r || []).some((c) => c !== "" && c != null),
  );

  return { headers, rows, totalRows: rows.length, sheetName };
};

/** Làm gọn giá trị ô để hiển thị (tránh chuỗi quá dài). */
export const cellDisplay = (value) => {
  if (value === "" || value == null) return "";
  const s = String(value);
  return s.length > 60 ? `${s.slice(0, 60)}…` : s;
};
