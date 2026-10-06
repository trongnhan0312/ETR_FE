import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import CourseClassManagement from '../Academic/CourseClassManagement';
import { LanguageProvider } from '../context/LanguageContext';

vi.mock('../Academic/academic.scss', () => ({}));
vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  parseApiError: vi.fn((err, fallback) => fallback || 'Error'),
}));

import { api } from '../utils/api';

describe('Course & Class Action Menu (⋯) & Status-based Direct Actions', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app_language', 'vi');
    vi.clearAllMocks();
  });

  const mockCourses = [
    {
      courseId: 101,
      courseCode: 'CRS-DEMO',
      courseName: 'Demo Aviation Course',
      versionNo: 1,
      durationHours: 60,
      status: 'Active',
      courseSubjects: [
        { subjectId: 1, sequenceNo: 1, requiredHours: 30, subject: { subjectId: 1, subjectCode: 'THEORY', subjectName: 'Theory' } },
        { subjectId: 2, sequenceNo: 2, requiredHours: 30, subject: { subjectId: 2, subjectCode: 'PRACTICE', subjectName: 'Practice' } },
      ],
    },
  ];

  const mockClasses = [
    {
      classId: 201,
      courseId: 101,
      classCode: 'CLS-ONGOING',
      className: 'Class In Progress',
      status: 'InProgress',
      startDate: '2026-08-01',
      endDate: '2026-11-30',
      courseVersionNo: 1,
      enrolledCount: 4,
      capacity: 25,
      instructor: 'Capt. Tran',
    },
    {
      classId: 202,
      courseId: 101,
      classCode: 'CLS-PLANNED',
      className: 'Class Planned Future',
      status: 'Planned',
      startDate: '2026-12-01',
      endDate: '2027-02-28',
      courseVersionNo: 1,
      enrolledCount: 0,
      capacity: 20,
      instructor: 'Capt. Le',
    },
    {
      classId: 203,
      courseId: 101,
      classCode: 'CLS-COMPLETED',
      className: 'Class Finished',
      status: 'Completed',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      courseVersionNo: 1,
      enrolledCount: 15,
      capacity: 20,
      instructor: 'Capt. Nguyen',
    },
  ];

  it('renders status-based primary buttons and opens ⋯ menu with all actions', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/Courses') return Promise.resolve(mockCourses);
      if (url === '/Classes') return Promise.resolve(mockClasses);
      if (url === '/Subjects') return Promise.resolve([]);
      if (url === '/TrainingSessions') return Promise.resolve([]);
      if (url === '/Enrollments') return Promise.resolve([]);
      if (url === '/AttendanceRecords') return Promise.resolve([]);
      if (url === '/Accounts') return Promise.resolve([]);
      if (url === '/UserProfiles') return Promise.resolve([]);
      return Promise.resolve([]);
    });

    render(
      <MemoryRouter>
        <LanguageProvider>
          <CourseClassManagement />
        </LanguageProvider>
      </MemoryRouter>
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('CRS-DEMO')).toBeInTheDocument();
    });

    // Expand the course row to see classes
    const expandTrigger = screen.getByText('CRS-DEMO').closest('.table-row').querySelector('.col-expand-trigger');
    fireEvent.click(expandTrigger);

    await waitFor(() => {
      expect(screen.getByText('CLS-ONGOING')).toBeInTheDocument();
      expect(screen.getByText('CLS-PLANNED')).toBeInTheDocument();
      expect(screen.getByText('CLS-COMPLETED')).toBeInTheDocument();
    });

    // Check status-based primary buttons:
    // Ongoing class (CLS-ONGOING) has "Điểm danh" / "Attendance" directly visible
    expect(screen.getAllByText(/Điểm danh|Attendance/i).length).toBeGreaterThan(0);

    // Planned class (CLS-PLANNED) has "Ghi danh" / "Enroll" directly visible
    expect(screen.getAllByText(/Ghi danh|Enroll/i).length).toBeGreaterThan(0);

    // All classes have "⋯" button
    const moreButtons = screen.getAllByText('⋯');
    expect(moreButtons.length).toBeGreaterThanOrEqual(4); // 1 course + 3 classes

    // Click ⋯ on the first class
    fireEvent.click(moreButtons[1]);

    // Verify popover menu appears with full options
    await waitFor(() => {
      // Both the subtable column header and popover menu header exist
      expect(screen.getAllByText(/Thao tác lớp|Class Actions/i).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/Cập nhật trạng thái|Update class status/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Ghi danh học viên|Enroll student/i).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/Xem chi tiết|View class details/i)).toBeInTheDocument();
      expect(screen.getByText(/Điểm danh & Lịch sử|Attendance & History/i)).toBeInTheDocument();
      expect(screen.getByText(/Xuất báo cáo|Export class report/i)).toBeInTheDocument();
      expect(screen.getByText(/Xóa lớp học|Delete class/i)).toBeInTheDocument();
    });

    // Test clicking "Xem chi tiết lớp học" opens detail modal
    const viewDetailItem = screen.getByText(/Xem chi tiết|View class details/i);
    fireEvent.click(viewDetailItem);

    // Menu closes and detail modal opens
    await waitFor(() => {
      expect(screen.getByText(/Chi tiết lớp học|Class details/i)).toBeInTheDocument();
    });
  });

  it('course row renders primary actions and ⋯ menu with full course options', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/Courses') return Promise.resolve(mockCourses);
      if (url === '/Classes') return Promise.resolve(mockClasses);
      return Promise.resolve([]);
    });

    render(
      <MemoryRouter>
        <LanguageProvider>
          <CourseClassManagement />
        </LanguageProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('CRS-DEMO')).toBeInTheDocument();
    });

    // Course row has primary "Tạo Lớp" and "Tạo bản mới" directly visible
    expect(screen.getAllByText(/Tạo Lớp|Create Class/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tạo bản mới|New Version/i).length).toBeGreaterThan(0);

    const allDots = screen.getAllByText('⋯');
    expect(allDots.length).toBeGreaterThanOrEqual(1);

    // Click ⋯ on the course row (first ⋯ button)
    fireEvent.click(allDots[0]);

    // Verify course menu options
    await waitFor(() => {
      // Both course table header and popover menu header exist
      expect(screen.getAllByText(/Thao tác khóa học|Course Actions/i).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/Tạo Lớp học mới|Create new Class/i)).toBeInTheDocument();
      expect(screen.getByText(/Tạo phiên bản mới|Create new version/i)).toBeInTheDocument();
      expect(screen.getByText(/Sửa thông tin Khóa học|Edit course/i)).toBeInTheDocument();
      expect(screen.getByText(/Xóa Khóa học|Delete course/i)).toBeInTheDocument();
    });
  });

  it('keeps action menu open when user scrolls (does not disappear on scroll)', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/Courses') return Promise.resolve(mockCourses);
      if (url === '/Classes') return Promise.resolve(mockClasses);
      return Promise.resolve([]);
    });

    render(
      <MemoryRouter>
        <LanguageProvider>
          <CourseClassManagement />
        </LanguageProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('CRS-DEMO')).toBeInTheDocument();
    });

    const allDots = screen.getAllByText('⋯');
    fireEvent.click(allDots[0]);

    await waitFor(() => {
      expect(screen.getByText(/Tạo Lớp học mới|Create new Class/i)).toBeInTheDocument();
    });

    // Fire scroll events on window and document
    fireEvent.scroll(window, { target: { scrollY: 300 } });
    fireEvent.scroll(document, { target: { scrollY: 300 } });

    // Menu MUST still be visible (NOT closed / NOT disappeared)
    expect(screen.getByText(/Tạo Lớp học mới|Create new Class/i)).toBeInTheDocument();
  });

  it('flips to dropup when trigger button is near bottom of viewport', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/Courses') return Promise.resolve(mockCourses);
      if (url === '/Classes') return Promise.resolve(mockClasses);
      return Promise.resolve([]);
    });

    render(
      <MemoryRouter>
        <LanguageProvider>
          <CourseClassManagement />
        </LanguageProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('CRS-DEMO')).toBeInTheDocument();
    });

    const allDots = screen.getAllByText('⋯');
    const courseDot = allDots[0];

    // Simulate button near bottom of screen: bottom = 750, top = 720, window height = 800
    // spaceBelow = 50px (< 220px), spaceAbove = 720px
    vi.spyOn(courseDot, 'getBoundingClientRect').mockReturnValue({
      top: 720,
      bottom: 750,
      left: 1000,
      right: 1030,
      width: 30,
      height: 30,
    });

    fireEvent.click(courseDot);

    await waitFor(() => {
      const menuHeader = screen.getByText(/Thao tác khóa học|Course Actions/i, { selector: 'span' });
      const menuContainer = menuHeader.closest('div[style*="position: absolute"]');
      expect(menuContainer).toBeInTheDocument();
      // Expect transform to contain translateY(-100%) for dropup
      expect(menuContainer.style.transform).toContain('translateY(-100%)');
    });
  });

  it('allows withdrawing student enrollment from class detail modal', async () => {
    const mockEnrollments = [
      { enrollmentId: 55, accountId: 10, classId: 201, status: 'Active', enrolledAt: '2026-08-05' },
    ];
    const mockAccounts = [
      { accountId: 10, username: 'stu10', email: 'stu10@aviation.vn' },
    ];
    const mockProfiles = [
      { accountId: 10, userCode: 'STU-010', fullName: 'Nguyen Van A', email: 'stu10@aviation.vn' },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/Courses') return Promise.resolve(mockCourses);
      if (url === '/Classes') return Promise.resolve(mockClasses);
      if (url === '/Subjects') return Promise.resolve([]);
      if (url === '/TrainingSessions') return Promise.resolve([]);
      if (url === '/Enrollments') return Promise.resolve(mockEnrollments);
      if (url === '/AttendanceRecords') return Promise.resolve([]);
      if (url === '/Accounts') return Promise.resolve(mockAccounts);
      if (url === '/UserProfiles') return Promise.resolve(mockProfiles);
      return Promise.resolve([]);
    });
    api.delete.mockResolvedValue({});

    render(
      <MemoryRouter>
        <LanguageProvider>
          <CourseClassManagement />
        </LanguageProvider>
      </MemoryRouter>
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('CRS-DEMO')).toBeInTheDocument();
    });

    // Expand course
    const expandTrigger = screen.getByText('CRS-DEMO').closest('.table-row').querySelector('.col-expand-trigger');
    fireEvent.click(expandTrigger);

    await waitFor(() => {
      expect(screen.getByText('CLS-ONGOING')).toBeInTheDocument();
    });

    // Click "Xem" on ongoing class to open detail modal
    const viewButtons = screen.getAllByRole('button', { name: /Xem|View/i });
    fireEvent.click(viewButtons[0]);

    // Check detail modal opened and student appears
    await waitFor(() => {
      expect(screen.getByText('Chi tiết lớp học')).toBeInTheDocument();
      expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    });

    // Check "Hủy ghi danh" button exists
    const withdrawBtn = screen.getByRole('button', { name: /Hủy ghi danh|Withdraw/i });
    expect(withdrawBtn).toBeInTheDocument();

    // Click "Hủy ghi danh" to open ConfirmModal
    fireEvent.click(withdrawBtn);

    await waitFor(() => {
      expect(screen.getByText(/XÁC NHẬN HỦY GHI DANH/i)).toBeInTheDocument();
    });

    // Confirm withdrawal
    const confirmWithdrawBtn = screen.getByRole('button', { name: /^HỦY GHI DANH$/i });
    fireEvent.click(confirmWithdrawBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/Enrollments/55');
    });
  });
});

