import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet, NavLink } from "react-router-dom";
import { createPortal } from "react-dom";
import RouteErrorBoundary from "../components/RouteErrorBoundary";
import { LanguageProvider } from "../context/LanguageContext";
import { translateVn } from "../utils/translate";

// Component "nổ" khi render — mô phỏng lỗi thật đã gặp: modal tham chiếu biến
// không tồn tại (instructors is not defined) làm React unmount cả cây #root.
const Boom = () => {
  throw new Error("Boom: instructors is not defined");
};

const renderWithApp = (ui, route = "/crash") =>
  render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </LanguageProvider>,
  );

describe("RouteErrorBoundary", () => {
  beforeEach(() => {
    // React + componentDidCatch đều log ra console.error → giữ output test sạch
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hiện thẻ báo lỗi có thể phục hồi thay vì để màn hình trắng", () => {
    renderWithApp(
      <RouteErrorBoundary>
        <Boom />
      </RouteErrorBoundary>,
    );

    const card = screen.getByRole("alert");
    expect(card).toBeInTheDocument();
    // Mặc định app là tiếng Anh
    expect(screen.getByText("Unable to display this content")).toBeInTheDocument();
    expect(screen.getByText(/instructors is not defined/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("giữ nguyên phần ngoài boundary (sidebar/topbar của layout)", () => {
    renderWithApp(
      <div>
        <div data-testid="sidebar">SIDEBAR</div>
        <RouteErrorBoundary>
          <Boom />
        </RouteErrorBoundary>
      </div>,
    );

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("bắt được lỗi trong modal render qua createPortal", () => {
    const PortalBoom = () => createPortal(<Boom />, document.body);

    renderWithApp(
      <RouteErrorBoundary>
        <PortalBoom />
      </RouteErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(document.querySelector(".route-error-boundary")).toBeTruthy();
  });

  it("nút Thử lại render lại nội dung khi lỗi đã hết", () => {
    let shouldThrow = true;
    const Flaky = () => {
      if (shouldThrow) throw new Error("lỗi tạm thời");
      return <div>Nội dung đã hồi phục</div>;
    };

    renderWithApp(
      <RouteErrorBoundary>
        <Flaky />
      </RouteErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("Nội dung đã hồi phục")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("đổi route thì tự xoá lỗi và giữ sidebar (đúng cách layout dùng boundary)", () => {
    const Layout = () => (
      <div>
        <div data-testid="sidebar">SIDEBAR</div>
        <NavLink to="/ok">Đi tới trang OK</NavLink>
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </div>
    );

    renderWithApp(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/crash" element={<Boom />} />
          <Route path="/ok" element={<div>Trang OK</div>} />
        </Route>
      </Routes>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Đi tới trang OK"));

    expect(screen.getByText("Trang OK")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });

  it("mọi nhãn của thẻ báo lỗi đều có bản dịch EN", () => {
    const labels = [
      "Không thể hiển thị nội dung này",
      "Đã xảy ra lỗi khi hiển thị trang. Bạn có thể thử lại hoặc quay về trang trước.",
      "Thử lại",
      "Quay lại",
      "Chi tiết kỹ thuật",
    ];
    labels.forEach((label) => {
      const translated = translateVn(label);
      expect(translated, `thiếu bản dịch cho: ${label}`).toBeTruthy();
      expect(translated).not.toBe(label);
    });
  });
});
