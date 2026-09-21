import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// QASearchExport chỉ dùng `api` từ utils/api
vi.mock("../utils/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

import { api } from "../utils/api";
import QASearchExport from "../QA/QASearchExport";
import { LanguageProvider } from "../context/LanguageContext";

const ROWS = [
  {
    etrCourseRecordId: 23,
    status: "Submitted",
    studentName: "Student 8",
    studentCode: "STU-08",
    courseName: "Dangerous Goods Regulations",
    className: "DGR Batch 1",
  },
  {
    etrCourseRecordId: 48,
    status: "Completed",
    studentName: "Student 17",
    studentCode: "STU-17",
    courseName: "Aviation Security",
    className: "Security Batch 1",
  },
];

const renderPage = () =>
  render(
    <LanguageProvider>
      <MemoryRouter initialEntries={["/qa/search"]}>
        <QASearchExport />
      </MemoryRouter>
    </LanguageProvider>,
  );

describe("QA Search ETR Records (QASearchExport)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("user", JSON.stringify({ role: "QA", fullName: "QA Staff" }));
    vi.clearAllMocks();
    // /Search/etrs bị chặn cho QA (403) → component rơi về /Etr rồi tự lọc
    api.get.mockImplementation((path) => {
      if (String(path).startsWith("/Search/etrs")) {
        return Promise.reject(new Error("403 Forbidden"));
      }
      if (String(path).startsWith("/Etr")) return Promise.resolve(ROWS);
      return Promise.resolve([]);
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("render được trang và tự tải danh sách (không crash do thiếu import)", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Student 8/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Student 17/)).toBeInTheDocument();
  });

  it("bấm nút Search không được xoá sạch kết quả (event không được coi là từ khoá)", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/Student 8/)).toBeInTheDocument());

    const etrCallsBefore = api.get.mock.calls.filter(([p]) => String(p).startsWith("/Etr")).length;
    fireEvent.click(screen.getByRole("button", { name: /Search ETR Records/i }));

    // Phải chạy lại nhánh tìm kiếm thật (gọi lại /Etr) — nếu event bị coi là từ
    // khoá thì hàm sẽ ném lỗi ngay và không có request nào được gửi.
    await waitFor(() => {
      const etrCallsAfter = api.get.mock.calls.filter(([p]) => String(p).startsWith("/Etr")).length;
      expect(etrCallsAfter).toBeGreaterThan(etrCallsBefore);
    });
    await waitFor(() => {
      expect(screen.getByText(/Student 8/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Student 17/)).toBeInTheDocument();
  });

  it("tìm theo từ khoá vẫn lọc đúng khi phải rơi về /Etr", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/Student 8/)).toBeInTheDocument());

    const input = document.querySelector(".qa-input");
    fireEvent.change(input, { target: { value: "ETR-0048" } });
    fireEvent.click(screen.getByRole("button", { name: /Search ETR Records/i }));

    await waitFor(() => {
      expect(screen.getByText(/Student 17/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Student 8/)).not.toBeInTheDocument();
  });
});
