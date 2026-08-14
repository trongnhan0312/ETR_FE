import * as XLSXModule from "xlsx";

// `import * as XLSX` đặt CFB lên namespace khi chạy qua Vite (CJS interop của browser),
// nhưng ở Node/ESM thuần thì CFB nằm trên default export. Chọn object nào có CFB để
// helper chạy được ở MỌI môi trường (browser + test Node).
const XLSX = XLSXModule.CFB ? XLSXModule : XLSXModule.default;

// ── Bảo vệ sheet + dropdown cho template xlsx sau khi SheetJS tạo ─────────
// SheetJS 0.18.5 (community edition, version cuối trên npm) KHÔNG ghi được
// sheetProtection / dataValidation / cell protection. File xlsx thực chất là
// ZIP chứa XML — nên tự chèn XML bằng CFB (đi kèm trong bundle xlsx):
//   • <sheetProtection sheet="1"/>        → khóa toàn bộ ô chưa unlock
//   • style XF locked="0" cho các cột unlockColumns → chỉ các cột đó sửa được
//   • <dataValidations> dropdown           → dropdown cho các cột có danh sách giá trị
// Trả về chuỗi base64 của file xlsx mới.
//
// Logic này được generalize từ InstructorAttendance.protectAttendanceTemplate
// (khóa cột D/E + dropdown Present/Absent) để tái dùng cho mọi template import
// (điểm danh, điểm assessment, ...) — tránh lệch lạc giữa các màn hình.

// Kiểu dữ liệu content của CFB khác nhau giữa các môi trường:
// • Node (has_buf=true): Buffer/Uint8Array
// • Browser (has_buf=false): inflate thuần JS trả plain Array<number> (hoặc binary string)
// → chuyển về Uint8Array để TextDecoder.decode hoạt động ở MỌI môi trường.
const toUint8 = (data) => {
  if (data instanceof Uint8Array) return data;
  if (ArrayBuffer.isView(data))
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (typeof data === "string") {
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) out[i] = data.charCodeAt(i) & 0xff;
    return out;
  }
  return Uint8Array.from(data); // plain Array<number>
};

// Ghi lại content đúng kiểu ban đầu (array/string/typed) để CFB.write xử lý được
const toOriginalType = (original, u8) => {
  if (typeof original === "string") {
    let s = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < u8.length; i += CHUNK) {
      s += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
    }
    return s;
  }
  if (Array.isArray(original)) return Array.from(u8);
  return u8; // Uint8Array / Buffer / ArrayBufferView
};

/**
 * Khóa template xlsx: mọi ô ngoài các cột unlockColumns bị chặn sửa (sheet protection),
 * cột unlockColumns vẫn nhập được, và (tùy chọn) thêm dropdown danh sách giá trị.
 *
 * @param {string} b64 - file xlsx dạng base64 (đã tạo xong bằng SheetJS)
 * @param {object} options
 * @param {number} options.firstDataRow - dòng dữ liệu đầu tiên (sau tiêu đề)
 * @param {number} options.lastDataRow - dòng dữ liệu cuối cùng
 * @param {string[]} [options.unlockColumns] - cột được phép sửa (VD ["D","E"])
 * @param {Array<{col: string, values: string[]}>} [options.dropdowns] - dropdown theo cột
 * @returns {string} file xlsx dạng base64 đã bảo vệ
 */
export const protectExcelTemplate = (
  b64,
  { firstDataRow, lastDataRow, unlockColumns = [], dropdowns = [] },
) => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const cfb = XLSX.CFB.read(b64, { type: "base64" });
  const idx = cfb.FullPaths.indexOf("Root Entry/xl/worksheets/sheet1.xml");
  const sidx = cfb.FullPaths.indexOf("Root Entry/xl/styles.xml");
  const origSheet = cfb.FileIndex[idx].content;
  const origStyles = cfb.FileIndex[sidx].content;
  let sheetXml = dec.decode(toUint8(origSheet));
  let stylesXml = dec.decode(toUint8(origStyles));

  // 1) Mở khóa các cột được phép sửa: gán style index 1 (XF locked="0") cho từng dòng
  for (let r = firstDataRow; r <= lastDataRow; r++) {
    for (const col of unlockColumns) {
      sheetXml = sheetXml
        .split(`<c r="${col}${r}"`)
        .join(`<c r="${col}${r}" s="1"`);
    }
  }

  // 2) Bật bảo vệ sheet — mọi ô còn lại (locked mặc định) không sửa được.
  // Vị trí đúng schema OOXML: ngay sau </sheetData>.
  sheetXml = sheetXml.replace(
    "</sheetData>",
    '</sheetData><sheetProtection sheet="1" objects="1" scenarios="1"/>',
  );

  // 3) Dropdown danh sách giá trị (nếu có) — đặt trước <ignoredErrors / </worksheet>
  if (dropdowns.length > 0) {
    const dvItems = dropdowns
      .map(
        (d) =>
          `<dataValidation type="list" allowBlank="1" ` +
          `sqref="${d.col}${firstDataRow}:${d.col}${lastDataRow}">` +
          `<formula1>"${d.values.join(",")}"</formula1>` +
          "</dataValidation>",
      )
      .join("");
    const dv = `<dataValidations count="${dropdowns.length}">${dvItems}</dataValidations>`;
    if (sheetXml.includes("<ignoredErrors")) {
      sheetXml = sheetXml.replace("<ignoredErrors", `${dv}<ignoredErrors`);
    } else {
      sheetXml = sheetXml.replace("</worksheet>", `${dv}</worksheet>`);
    }
  }

  // 4) styles.xml: thêm XF unlocked (index 1) + tăng count
  stylesXml = stylesXml.replace(
    /(<cellXfs count=")(\d+)(">)/,
    (m, p1, p2, p3) => p1 + (Number(p2) + 1) + p3,
  );
  stylesXml = stylesXml.replace(
    "</cellXfs>",
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyProtection="1"><protection locked="0"/></xf></cellXfs>',
  );

  cfb.FileIndex[idx].content = toOriginalType(origSheet, enc.encode(sheetXml));
  cfb.FileIndex[sidx].content = toOriginalType(origStyles, enc.encode(stylesXml));
  return XLSX.CFB.write(cfb, { type: "base64", fileType: "zip" });
};
