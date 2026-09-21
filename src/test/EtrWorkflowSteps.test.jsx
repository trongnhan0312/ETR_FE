import { describe, it, expect } from "vitest";
import { translateVn } from "../utils/translate";
import {
  evidenceCategoryFromMime,
  evidenceCategoryFromTypeName,
  formatEvidenceSize,
} from "../utils/evidenceFiles";
import {
  MINIMUM_ATTENDANCE_THRESHOLD,
  areAllAttendanceRatesOk,
  areSubjectScoresFinalized,
  hasVerifiedEvidence,
  subjectStatusBadge,
  subjectResultStatusKey,
} from "../utils/etrStatus";

/**
 * Kiểm chứng 4 bước trong "CHI TIẾT KIỂM DUYỆT CÁC BƯỚC HỒ SƠ":
 *   1. Hồ sơ thông tin cá nhân  → luôn đạt (hard-code ở UI)
 *   2. Điểm danh / Chuyên cần  → areAllAttendanceRatesOk
 *   3. Điểm số kết quả kiểm tra → areSubjectScoresFinalized
 *   4. Minh chứng đính kèm     → hasVerifiedEvidence
 *
 * Fixture mô phỏng đúng payload GET /Etr/{id} (EtrSubjectDetailResponse).
 */

// ETR vừa tạo: môn đã có SubjectResult nhưng chưa điểm danh, chưa nhập/chốt điểm
const freshSubjectResults = () => [
  {
    subjectResultId: 1,
    subjectId: 11,
    status: "Pending",
    attendanceRate: null,
    score: null,
    assessmentResults: [],
    practicalChecklistResults: [],
  },
  {
    subjectResultId: 2,
    subjectId: 12,
    status: "Pending",
    attendanceRate: null,
    score: null,
    assessmentResults: [],
    practicalChecklistResults: [],
  },
];

// Sau khi giảng viên điểm danh đủ + CHỐT ĐIỂM toàn bộ
const gradedSubjectResults = () => [
  {
    subjectResultId: 1,
    subjectId: 11,
    status: "Passed",
    attendanceRate: 100,
    score: 85,
    assessmentResults: [
      { assessmentResultId: 1, assessmentId: 1, score: 85, resultStatus: "Passed", isPublished: true },
      { assessmentResultId: 2, assessmentId: 2, score: 80, resultStatus: "Passed", isPublished: true },
    ],
    practicalChecklistResults: [
      { practicalChecklistResultId: 1, practicalChecklistId: 1, resultStatus: "Completed", isPublished: true },
    ],
  },
  {
    subjectResultId: 2,
    subjectId: 12,
    status: "Passed",
    attendanceRate: 90,
    score: 78,
    assessmentResults: [
      { assessmentResultId: 3, assessmentId: 3, score: 78, resultStatus: "Passed", isPublished: true },
    ],
    practicalChecklistResults: [],
  },
];

describe("Bước 2 — Điểm danh / Chuyên cần", () => {
  it("ngưỡng dùng chung đúng bằng ngưỡng của backend (80%)", () => {
    expect(MINIMUM_ATTENDANCE_THRESHOLD).toBe(80);
  });

  it("hồ sơ ETR mới (chưa confirm buổi nào → attendanceRate null) KHÔNG đạt", () => {
    expect(areAllAttendanceRatesOk(freshSubjectResults())).toBe(false);
  });

  it("điểm danh đủ ở MỌI môn → đạt", () => {
    expect(areAllAttendanceRatesOk(gradedSubjectResults())).toBe(true);
  });

  it("một môn dưới ngưỡng → không đạt", () => {
    const srs = gradedSubjectResults();
    srs[1].attendanceRate = 60;
    expect(areAllAttendanceRatesOk(srs)).toBe(false);
  });

  it("đúng ngưỡng 80% → đạt, 79.9% → không đạt", () => {
    const ok = gradedSubjectResults();
    ok[1].attendanceRate = 80;
    expect(areAllAttendanceRatesOk(ok)).toBe(true);

    const notOk = gradedSubjectResults();
    notOk[1].attendanceRate = 79.9;
    expect(areAllAttendanceRatesOk(notOk)).toBe(false);
  });

  it("một môn chưa có buổi nào confirm (null) → không đạt dù môn khác 100%", () => {
    const srs = gradedSubjectResults();
    srs[1].attendanceRate = null;
    expect(areAllAttendanceRatesOk(srs)).toBe(false);
  });

  it("hồ sơ không có môn nào → không đạt", () => {
    expect(areAllAttendanceRatesOk([])).toBe(false);
    expect(areAllAttendanceRatesOk(undefined)).toBe(false);
  });
});

describe("Bước 3 — Điểm số kết quả kiểm tra", () => {
  it("ETR mới (chưa có dòng kết quả nào) KHÔNG đạt — regression: trước đây hiện nhầm ✓", () => {
    expect(areSubjectScoresFinalized(freshSubjectResults())).toBe(false);
  });

  it("mọi kết quả đã CHỐT ĐIỂM (assessment + practical checklist) → đạt", () => {
    expect(areSubjectScoresFinalized(gradedSubjectResults())).toBe(true);
  });

  it("còn 1 dòng chưa publish → không đạt", () => {
    const srs = gradedSubjectResults();
    srs[0].assessmentResults[1].isPublished = false;
    expect(areSubjectScoresFinalized(srs)).toBe(false);
  });

  it("môn chỉ có practical checklist đã publish → vẫn tính là đã chốt điểm", () => {
    const srs = [
      {
        subjectResultId: 9,
        subjectId: 99,
        status: "Passed",
        attendanceRate: 100,
        assessmentResults: [],
        practicalChecklistResults: [
          { practicalChecklistResultId: 5, practicalChecklistId: 2, resultStatus: "Completed", isPublished: true },
        ],
      },
    ];
    expect(areSubjectScoresFinalized(srs)).toBe(true);
  });

  it("môn đã nhập điểm nhưng chưa chốt → không đạt", () => {
    const srs = gradedSubjectResults();
    srs[1].assessmentResults[0].isPublished = false;
    expect(areSubjectScoresFinalized(srs)).toBe(false);
  });

  it("môn Exempted không cần điểm, không chặn bước 3", () => {
    const srs = gradedSubjectResults();
    srs.push({
      subjectResultId: 3,
      subjectId: 13,
      status: "Exempted",
      attendanceRate: null,
      assessmentResults: [],
      practicalChecklistResults: [],
    });
    expect(areSubjectScoresFinalized(srs)).toBe(true);
  });

  it("môn Passed nhưng chưa có dòng kết quả nào → vẫn không đạt (không có gì để chốt)", () => {
    const srs = [
      {
        subjectResultId: 4,
        subjectId: 14,
        status: "Passed",
        attendanceRate: 100,
        assessmentResults: [],
        practicalChecklistResults: [],
      },
    ];
    expect(areSubjectScoresFinalized(srs)).toBe(false);
  });

  it("hồ sơ không có môn nào → không đạt", () => {
    expect(areSubjectScoresFinalized([])).toBe(false);
    expect(areSubjectScoresFinalized(undefined)).toBe(false);
  });
});

describe("Bước 4 — Minh chứng đính kèm", () => {
  it("hồ sơ mới chưa có minh chứng nào → KHÔNG đạt", () => {
    expect(hasVerifiedEvidence([], "InProgress")).toBe(false);
  });

  it("có minh chứng và tất cả đã QA verify → đạt", () => {
    expect(
      hasVerifiedEvidence([{ status: "Verified" }, { status: "Verified" }], "InProgress"),
    ).toBe(true);
  });

  it("còn minh chứng chờ QA (Pending QA) hoặc bị từ chối → không đạt", () => {
    expect(
      hasVerifiedEvidence([{ status: "Verified" }, { status: "Pending QA" }], "InProgress"),
    ).toBe(false);
    expect(
      hasVerifiedEvidence([{ status: "Rejected" }], "InProgress"),
    ).toBe(false);
  });

  it("ETR đã QA duyệt / hoàn thành → đạt (fallback theo trạng thái)", () => {
    expect(hasVerifiedEvidence([], "Verified")).toBe(true);
    expect(hasVerifiedEvidence([], "Completed")).toBe(true);
  });
});

describe("Nhãn trạng thái môn học dùng chung (Academic + QA)", () => {
  // `label` là chuỗi NGUỒN tiếng Việt, component bọc `tr(...)` để dịch — cần khớp key
  // trong src/utils/translate.js.
  it("map đúng 4 giá trị SubjectResultStatus của BE", () => {
    expect(subjectStatusBadge({ status: "Passed" })).toEqual({
      label: "Đạt",
      color: "#15803d",
      bg: "#dcfce7",
    });
    expect(subjectStatusBadge({ status: "Failed" }).label).toBe("Chưa đạt");
    expect(subjectStatusBadge({ status: "Exempted" }).label).toBe("Được miễn");
    expect(subjectStatusBadge({ status: "Pending" }).label).toBe("Chưa chấm điểm");
  });

  it("không còn phụ thuộc `isPassed` (field BE không trả về)", () => {
    expect(subjectResultStatusKey({ status: "Passed", isPassed: false })).toBe("passed");
    expect(subjectResultStatusKey({ isPassed: true })).toBe("pending");
  });

  it("nhãn badge đều phải có trong từ điển (không lộ tiếng Việt khi ở chế độ EN)", () => {
    ["Đạt", "Chưa đạt", "Được miễn", "Chưa chấm điểm"].forEach((label) => {
      const en = translateVn(label);
      expect(en).toBeTruthy();
      expect(en).not.toBe(label);
    });
  });

  it("chịu được PascalCase và giá trị thiếu/không xác định", () => {
    expect(subjectResultStatusKey({ Status: "Passed" })).toBe("passed");
    expect(subjectResultStatusKey({ status: "passed" })).toBe("passed");
    expect(subjectResultStatusKey({ status: "SomethingElse" })).toBe("pending");
    expect(subjectResultStatusKey(undefined)).toBe("pending");
  });
});

describe("Phân loại minh chứng khi BE thiếu metadata (Attachment rỗng)", () => {
  it("ưu tiên mimeType khi có", () => {
    expect(evidenceCategoryFromMime("application/pdf")).toBe("PDF DOC");
    expect(evidenceCategoryFromMime("image/jpeg")).toBe("PHOTO");
    expect(evidenceCategoryFromMime("")).toBe("");
    expect(evidenceCategoryFromMime(null)).toBe("");
  });

  it("suy từ tên loại minh chứng của BE", () => {
    expect(evidenceCategoryFromTypeName("Photo Evidence")).toBe("PHOTO");
    expect(evidenceCategoryFromTypeName("Digital Certificate")).toBe("PDF DOC");
    // "Signed Paper Form" chứa cả 'paper' — phải là SIGNATURE, không bị nhầm thành PDF
    expect(evidenceCategoryFromTypeName("Signed Paper Form")).toBe("SIGNATURE");
  });

  it("loại lạ/thiếu dữ liệu → rỗng (KHÔNG mặc định là SIGNATURE như trước)", () => {
    expect(evidenceCategoryFromTypeName("")).toBe("");
    expect(evidenceCategoryFromTypeName("Something Else")).toBe("");
  });

  it("dung lượng: rỗng khi BE không có fileSize (không bịa '0 MB')", () => {
    expect(formatEvidenceSize(null)).toBe("");
    expect(formatEvidenceSize(0)).toBe("");
    expect(formatEvidenceSize(undefined)).toBe("");
    expect(formatEvidenceSize(135)).toBe("1 KB");
    expect(formatEvidenceSize(1500000)).toBe("1.4 MB");
  });
});

describe("Kịch bản end-to-end: ETR mới → điểm danh đủ + chốt điểm", () => {
  it("ETR mới: bước 2, 3, 4 đều ĐANG CHỜ", () => {
    const srs = freshSubjectResults();
    expect(areAllAttendanceRatesOk(srs)).toBe(false);
    expect(areSubjectScoresFinalized(srs)).toBe(false);
    expect(hasVerifiedEvidence([], "InProgress")).toBe(false);
  });

  it("sau khi điểm danh đủ + chốt điểm: bước 2 và 3 chuyển ĐÃ XÁC THỰC", () => {
    const srs = gradedSubjectResults();
    expect(areAllAttendanceRatesOk(srs)).toBe(true);
    expect(areSubjectScoresFinalized(srs)).toBe(true);
    // Bước 4 vẫn chờ cho tới khi QA verify hết minh chứng
    expect(hasVerifiedEvidence([{ status: "Pending QA" }], "InProgress")).toBe(false);
    expect(hasVerifiedEvidence([{ status: "Verified" }], "InProgress")).toBe(true);
  });

  it("chốt điểm nhưng chưa điểm danh đủ: bước 3 đạt, bước 2 vẫn chờ (2 bước độc lập)", () => {
    const srs = gradedSubjectResults();
    srs.forEach((sr) => {
      sr.attendanceRate = null;
    });
    expect(areAllAttendanceRatesOk(srs)).toBe(false);
    expect(areSubjectScoresFinalized(srs)).toBe(true);
  });
});
