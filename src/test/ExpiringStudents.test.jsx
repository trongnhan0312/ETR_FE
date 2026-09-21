import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../utils/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    postFormData: vi.fn(),
    downloadFile: vi.fn(),
  },
}));

import { api } from "../utils/api";
import { LanguageProvider } from "../context/LanguageContext";
import ExpiringStudents from "../Academic/ExpiringStudents";
import {
  daysUntilExpiry,
  deriveValidityStatus,
  toExpiringStudent,
  toExpiringStudents,
} from "../utils/expiringStudents";

// Dữ liệu thật của GET /Etr/expiring-students (camelCase, xem API deploy)
const API_ROWS = [
  {
    accountId: 10,
    email: "student3@etr.com",
    fullName: "Student 3",
    courseId: 3,
    etrCourseRecordId: 9,
    expiryDate: "2026-09-16T17:34:55.4",
    validityStatus: "Expired",
  },
  {
    accountId: 11,
    email: "student4@etr.com",
    fullName: "Student 4",
    courseId: 3,
    etrCourseRecordId: 10,
    expiryDate: "2026-10-11T17:34:55.4",
    validityStatus: "ExpiringSoon",
  },
];

const renderPage = () =>
  render(
    <LanguageProvider>
      <MemoryRouter initialEntries={["/academic/expiring-students"]}>
        <ExpiringStudents />
      </MemoryRouter>
    </LanguageProvider>,
  );

describe("utils/expiringStudents", () => {
  it("đọc được field camelCase từ API (không còn undefined)", () => {
    const s = toExpiringStudent(API_ROWS[0]);
    expect(s).toMatchObject({
      accountId: 10,
      email: "student3@etr.com",
      fullName: "Student 3",
      etrCourseRecordId: 9,
      validityStatus: "Expired",
    });
    expect(s.expiryDate).toBe("2026-09-16T17:34:55.4");
  });

  it("vẫn chấp nhận field PascalCase nếu BE đổi kiểu trả về", () => {
    const s = toExpiringStudent({
      AccountId: 5,
      Email: "a@etr.com",
      FullName: "Nguyen Van A",
      ETRCourseRecordId: 42,
      ExpiryDate: "2026-10-01T00:00:00",
      ValidityStatus: "Expired",
    });
    expect(s.fullName).toBe("Nguyen Van A");
    expect(s.email).toBe("a@etr.com");
    expect(s.etrCourseRecordId).toBe(42);
    expect(s.validityStatus).toBe("Expired");
  });

  it("tự suy ra trạng thái khi BE không trả validityStatus", () => {
    const now = new Date("2026-09-22T00:00:00");
    expect(deriveValidityStatus("2026-09-01T00:00:00", 30, now)).toBe("Expired");
    expect(deriveValidityStatus("2026-10-01T00:00:00", 30, now)).toBe("ExpiringSoon");
    expect(deriveValidityStatus("2027-01-01T00:00:00", 30, now)).toBe("Valid");
    expect(deriveValidityStatus(null, 30, now)).toBeNull();
  });

  it("tính số ngày còn lại và bỏ qua dữ liệu không hợp lệ", () => {
    expect(daysUntilExpiry("2026-10-02T00:00:00", new Date("2026-09-22T00:00:00"))).toBe(10);
    expect(daysUntilExpiry("2026-09-12T00:00:00", new Date("2026-09-22T00:00:00"))).toBe(-10);
    expect(daysUntilExpiry("không-phải-ngày")).toBeNull();
    expect(daysUntilExpiry(null)).toBeNull();
    expect(toExpiringStudents(null)).toEqual([]);
  });
});

describe("ExpiringStudents page", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("user", JSON.stringify({ role: "Academic" }));
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === "/Courses") {
        return Promise.resolve([{ courseId: 3, courseName: "A320 Familiarization" }]);
      }
      if (String(url).startsWith("/Etr/expiring-students")) {
        return Promise.resolve(API_ROWS);
      }
      return Promise.resolve([]);
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hiện đúng tên, email, mã ETR và trạng thái thay vì 'Student #undefined'", async () => {
    const { container } = renderPage();

    await waitFor(() => expect(screen.getByText("Student 3")).toBeInTheDocument());
    expect(screen.getByText("student3@etr.com")).toBeInTheDocument();
    expect(screen.getByText("#9")).toBeInTheDocument();
    expect(screen.getByText("Student 4")).toBeInTheDocument();
    expect(screen.getByText("#10")).toBeInTheDocument();

    // Không còn ô rỗng kiểu "#", "Student #undefined" cho học viên có dữ liệu
    expect(screen.queryByText(/Student #undefined/)).not.toBeInTheDocument();
    const cells = Array.from(container.querySelectorAll('.student-table-cell')).map((c) =>
      c.textContent.trim(),
    );
    expect(cells).not.toContain('#');
    expect(cells).not.toContain('Student #undefined');

    // Trạng thái đúng theo validityStatus (trước đây mọi dòng đều là Expiring Soon)
    const badges = Array.from(container.querySelectorAll('.student-badge')).map((b) =>
      b.textContent.trim(),
    );
    expect(badges).toContain('✕ Expired');
    expect(badges).toContain('⚠ Expiring Soon');
  });

  it("đếm đúng số liệu tổng/sắp hết hạn/đã hết hạn", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText("Student 3")).toBeInTheDocument());
    // Tổng học viên = 2 (thẻ số liệu), đã hết hạn = 1, sắp hết hạn = 1
    expect(screen.getByText(/All \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Expiring Soon \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Expired \(1\)/)).toBeInTheDocument();
  });
});
