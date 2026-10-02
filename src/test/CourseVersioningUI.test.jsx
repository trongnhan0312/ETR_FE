import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import UpdateCourseModal from '../Academic/UpdateCourseModal';
import CreateClass from '../Academic/CreateClass';
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

describe('Course Versioning Frontend UI Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.alert = vi.fn();
    globalThis.confirm = vi.fn(() => true);
    vi.clearAllMocks();
  });

  it('UpdateCourseModal renders version number and supports Draft/Active/Archived status', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/Subjects') {
        return Promise.resolve([
          { subjectId: 1, subjectCode: 'SUB-101', subjectName: 'Subject 1', defaultHours: 10, minSessions: 2 },
        ]);
      }
      if (url.startsWith('/Courses/')) {
        return Promise.resolve({
          courseId: 10,
          courseCode: 'CRS-JET',
          courseName: 'Jet Systems',
          versionNo: 2,
          status: 'Draft',
          subjects: [
            { subjectId: 1, sequenceNo: 1, requiredHours: 10, requiredSessions: 2, isMandatory: true, passingScore: 5 },
          ],
        });
      }
      return Promise.resolve([]);
    });

    const mockSave = vi.fn().mockResolvedValue({});
    const mockCancel = vi.fn();

    const courseData = {
      courseId: 10,
      code: 'CRS-JET',
      name: 'Jet Systems',
      versionNo: 2,
      status: 'Draft',
      classes: [],
      activeClassesCount: 0,
      subjects: [
        { subjectId: 1, sequenceNo: 1, requiredHours: 10, requiredSessions: 2, isMandatory: true, passingScore: 5 },
      ],
    };

    render(
      <LanguageProvider>
        <UpdateCourseModal course={courseData} onSave={mockSave} onCancel={mockCancel} />
      </LanguageProvider>
    );

    // Verify version badge v2 is displayed
    expect(screen.getAllByText('v2')[0]).toBeInTheDocument();

    // Wait for subjects to finish loading
    await waitFor(() => {
      expect(document.querySelector('#update-course-duration')?.value).toBe('10');
    });

    // Verify status select has Draft, Active, and Archived options
    const statusSelect = document.querySelector('#update-course-status');
    expect(statusSelect).toBeInTheDocument();
    expect(statusSelect.value).toBe('Draft');

    // Change status to Active and submit
    fireEvent.change(statusSelect, { target: { value: 'Active' } });
    expect(statusSelect.value).toBe('Active');

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          courseId: 10,
          status: 'Active',
        })
      );
    });
  });

  it('UpdateCourseModal displays immutability notice when Active course has linked classes', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/Subjects') return Promise.resolve([]);
      if (url.startsWith('/Courses/')) {
        return Promise.resolve({
          courseId: 5,
          courseCode: 'CRS-ACT',
          courseName: 'Active Course',
          versionNo: 1,
          status: 'Active',
          subjects: [],
        });
      }
      return Promise.resolve([]);
    });

    const courseData = {
      courseId: 5,
      code: 'CRS-ACT',
      name: 'Active Course',
      versionNo: 1,
      status: 'Active',
      classes: [{ classId: 101, classCode: 'CLS-101' }],
      activeClassesCount: 1,
      subjects: [],
    };

    render(
      <LanguageProvider>
        <UpdateCourseModal course={courseData} onSave={vi.fn()} onCancel={vi.fn()} />
      </LanguageProvider>
    );

    // Verify immutability notice is rendered
    expect(screen.getByText(/Lưu ý phiên bản giáo trình:/i)).toBeInTheDocument();
    expect(screen.getByText(/Tạo bản mới \(Clone Version\)/i)).toBeInTheDocument();
  });

  it('CreateClass displays course versions and prevents creating class for Draft course', async () => {
    const courses = [
      {
        courseId: 1,
        courseCode: 'CRS-01',
        courseName: 'Draft Syllabus',
        versionNo: 2,
        status: 'Draft',
        subjects: [{ subjectId: 1, subjectCode: 'SUB-1', requiredHours: 10 }],
      },
      {
        courseId: 2,
        courseCode: 'CRS-02',
        courseName: 'Active Syllabus',
        versionNo: 1,
        status: 'Active',
        subjects: [{ subjectId: 2, subjectCode: 'SUB-2', requiredHours: 20 }],
      },
    ];

    api.get.mockImplementation((url) => {
      if (url.startsWith('/Courses/')) {
        return Promise.resolve({
          courseId: 1,
          courseCode: 'CRS-01',
          subjects: [{ subjectId: 1, subjectCode: 'SUB-1', requiredHours: 10 }],
        });
      }
      return Promise.resolve([]);
    });

    const mockSave = vi.fn();

    render(
      <LanguageProvider>
        <CreateClass
          courses={courses}
          initialCourseId={1}
          instructors={[]}
          subjects={[]}
          onSave={mockSave}
          onCancel={vi.fn()}
        />
      </LanguageProvider>
    );

    // Verify Draft notice banner is shown
    expect(screen.getByText(/Khóa học chưa kích hoạt:/i)).toBeInTheDocument();

    // Verify select options display version numbers
    expect(screen.getByText(/CRS-01 - Draft Syllabus \(v2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/CRS-02 - Active Syllabus \(v1\)/i)).toBeInTheDocument();

    // Fill form and try submitting for Draft course
    const codeInput = document.querySelector('#class-code-input');
    const nameInput = document.querySelector('#class-name-input');
    expect(codeInput).toBeInTheDocument();
    expect(nameInput).toBeInTheDocument();

    fireEvent.change(codeInput, { target: { value: 'CLS-2026' } });
    fireEvent.change(nameInput, { target: { value: 'Class 2026' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    // Alert should have been called and onSave not invoked
    expect(globalThis.alert).toHaveBeenCalledWith(
      expect.stringContaining('Không thể mở lớp học cho khóa học ở trạng thái Bản nháp (Draft)')
    );
    expect(mockSave).not.toHaveBeenCalled();
  });

  describe('Enrollment Eligibility Guard Tests', () => {
    it('isClassEligibleForEnrollment correctly evaluates class statuses and start dates', async () => {
      const { isClassEligibleForEnrollment } = await import('../utils/enrollmentEligibility');

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Eligible: Planned + future date
      expect(isClassEligibleForEnrollment({ status: 'Planned', startDate: tomorrow.toISOString() }).eligible).toBe(true);

      // Eligible: Planned + today
      expect(isClassEligibleForEnrollment({ status: 'Planned', startDate: today.toISOString() }).eligible).toBe(true);

      // Ineligible: Planned + past date
      const pastResult = isClassEligibleForEnrollment({ status: 'Planned', startDate: yesterday.toISOString() });
      expect(pastResult.eligible).toBe(false);
      expect(pastResult.reason).toContain('Đã qua ngày bắt đầu');

      // Ineligible: InProgress
      const inProgressResult = isClassEligibleForEnrollment({ status: 'InProgress', startDate: tomorrow.toISOString() });
      expect(inProgressResult.eligible).toBe(false);
      expect(inProgressResult.reason).toContain('Lớp đang diễn ra');

      // Ineligible: Completed
      const completedResult = isClassEligibleForEnrollment({ status: 'Completed', startDate: yesterday.toISOString() });
      expect(completedResult.eligible).toBe(false);
      expect(completedResult.reason).toContain('Lớp đã kết thúc');

      // Ineligible: Cancelled
      const cancelledResult = isClassEligibleForEnrollment({ status: 'Cancelled', startDate: tomorrow.toISOString() });
      expect(cancelledResult.eligible).toBe(false);
      expect(cancelledResult.reason).toContain('Lớp đã hủy');

      // Ineligible: Missing or null StartDate
      const nullStartResult = isClassEligibleForEnrollment({ status: 'Planned', startDate: null });
      expect(nullStartResult.eligible).toBe(false);
      expect(nullStartResult.reason).toContain('Ngày bắt đầu không hợp lệ');

      // Ineligible: Invalid format StartDate
      const invalidStartResult = isClassEligibleForEnrollment({ status: 'Planned', startDate: 'not-a-valid-date' });
      expect(invalidStartResult.eligible).toBe(false);
      expect(invalidStartResult.reason).toContain('Ngày bắt đầu không hợp lệ');

      // Format DD/MM/YYYY support
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const yyyy = tomorrow.getFullYear();
      const ddmmyyyyResult = isClassEligibleForEnrollment({ status: 'Planned', startDate: `${dd}/${mm}/${yyyy}` });
      expect(ddmmyyyyResult.eligible).toBe(true);

      // Ineligible: Nonexistent calendar dates (e.g. 2026-99-99, 31/02/2026, month 13, 31/04/2026)
      expect(isClassEligibleForEnrollment({ status: 'Planned', startDate: '2026-99-99' }).eligible).toBe(false);
      expect(isClassEligibleForEnrollment({ status: 'Planned', startDate: '31/02/2026' }).eligible).toBe(false);
      expect(isClassEligibleForEnrollment({ status: 'Planned', startDate: '2026-02-31' }).eligible).toBe(false);
      expect(isClassEligibleForEnrollment({ status: 'Planned', startDate: '2026-13-01' }).eligible).toBe(false);
      expect(isClassEligibleForEnrollment({ status: 'Planned', startDate: '31/04/2026' }).eligible).toBe(false);
      expect(isClassEligibleForEnrollment({ status: 'Planned', startDate: '29/02/2026' }).eligible).toBe(false); // 2026 is non-leap
    });

    it('isValidCalendarDate strictly validates calendar dates and leap years', async () => {
      const { isValidCalendarDate } = await import('../utils/enrollmentEligibility');

      expect(isValidCalendarDate(2026, 1, 15)).toBe(true);
      expect(isValidCalendarDate(2026, 12, 31)).toBe(true);
      expect(isValidCalendarDate(2024, 2, 29)).toBe(true); // Leap year 2024

      // Invalid dates
      expect(isValidCalendarDate(2026, 2, 29)).toBe(false); // Non-leap year 2026
      expect(isValidCalendarDate(2026, 2, 31)).toBe(false);
      expect(isValidCalendarDate(2026, 4, 31)).toBe(false); // April has 30 days
      expect(isValidCalendarDate(2026, 6, 31)).toBe(false); // June has 30 days
      expect(isValidCalendarDate(2026, 9, 31)).toBe(false); // September has 30 days
      expect(isValidCalendarDate(2026, 11, 31)).toBe(false); // November has 30 days
      expect(isValidCalendarDate(2026, 13, 1)).toBe(false); // Month 13
      expect(isValidCalendarDate(2026, 0, 10)).toBe(false); // Month 0
      expect(isValidCalendarDate(2026, 99, 99)).toBe(false);
      expect(isValidCalendarDate('abc', 1, 1)).toBe(false);
    });

    it('toAcademyDateString formats dates in Asia/Ho_Chi_Minh timezone and rejects invalid dates', async () => {
      const { toAcademyDateString, getAcademyTodayString } = await import('../utils/enrollmentEligibility');

      expect(toAcademyDateString(null)).toBeNull();
      expect(toAcademyDateString('')).toBeNull();
      expect(toAcademyDateString('invalid')).toBeNull();
      expect(toAcademyDateString('2026-99-99')).toBeNull();
      expect(toAcademyDateString('31/02/2026')).toBeNull();
      expect(toAcademyDateString('2026-13-05')).toBeNull();
      expect(toAcademyDateString('2026-02-31T00:00:00')).toBeNull();
      expect(toAcademyDateString('2026-02-31T00:00:00Z')).toBeNull();

      // Direct YYYY-MM-DD string
      expect(toAcademyDateString('2026-10-15')).toBe('2026-10-15');

      // DD/MM/YYYY string
      expect(toAcademyDateString('05/11/2026')).toBe('2026-11-05');

      // ISO date-time WITHOUT timezone suffix (unspecified local calendar date-time)
      expect(toAcademyDateString('2026-10-01T00:00:00')).toBe('2026-10-01');
      expect(toAcademyDateString('2026-10-01 14:30:00')).toBe('2026-10-01');
      expect(toAcademyDateString('2026-10-01T23:59:59')).toBe('2026-10-01');

      // UTC timestamp crossing Academy (Asia/Ho_Chi_Minh / UTC+7) date boundary
      // 2026-09-30 16:59:59 UTC -> 2026-09-30 23:59:59 UTC+7 (Same date)
      expect(toAcademyDateString('2026-09-30T16:59:59Z')).toBe('2026-09-30');
      // 2026-09-30 17:00:00 UTC -> 2026-10-01 00:00:00 UTC+7 (Next date in Academy time)
      expect(toAcademyDateString('2026-09-30T17:00:00Z')).toBe('2026-10-01');
      // 2026-10-01 16:59:59 UTC -> 2026-10-01 23:59:59 UTC+7 (Current date in Academy time)
      expect(toAcademyDateString('2026-10-01T16:59:59Z')).toBe('2026-10-01');
      // 2026-10-01 17:00:00 UTC -> 2026-10-02 00:00:00 UTC+7 (Next date in Academy time)
      expect(toAcademyDateString('2026-10-01T17:00:00Z')).toBe('2026-10-02');

      // getAcademyTodayString returns YYYY-MM-DD
      const todayStr = getAcademyTodayString();
      expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('EnrollStudentModal disables InProgress, past StartDate, and invalid StartDate classes in select dropdown', async () => {

      const { default: EnrollStudentModal } = await import('../Academic/EnrollStudentModal');

      api.get.mockImplementation((url) => {
        if (url === '/Accounts') return Promise.resolve([{ accountId: 101, username: 'student1', roleId: 6 }]);
        if (url === '/UserProfiles/learners') return Promise.resolve([{ accountId: 101, fullName: 'Student One', userCode: 'STU01' }]);
        if (url === '/Enrollments') return Promise.resolve([]);
        if (url === '/Etr') return Promise.resolve([]);
        if (url === '/Classes') return Promise.resolve([]);
        if (url.startsWith('/Courses/')) return Promise.resolve({ subjects: [{ subjectId: 1 }] });
        return Promise.resolve([]);
      });

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const classes = [
        { classId: 1, code: 'CLS-PLANNED', name: 'Planned Future', status: 'Planned', startDate: tomorrow.toISOString(), courseId: 10 },
        { classId: 2, code: 'CLS-INPROGRESS', name: 'In Progress Class', status: 'InProgress', startDate: tomorrow.toISOString(), courseId: 10 },
        { classId: 3, code: 'CLS-PAST', name: 'Past Date Class', status: 'Planned', startDate: yesterday.toISOString(), courseId: 10 },
        { classId: 4, code: 'CLS-NODATE', name: 'No Date Class', status: 'Planned', startDate: null, courseId: 10 },
      ];

      render(
        <LanguageProvider>
          <EnrollStudentModal
            classes={classes}
            initialClassId={1}
            onSave={vi.fn()}
            onCancel={vi.fn()}
          />
        </LanguageProvider>
      );

      const classSelect = document.querySelector('#enroll-class-select');
      expect(classSelect).toBeInTheDocument();

      const options = classSelect.querySelectorAll('option');
      expect(options).toHaveLength(4);

      // CLS-PLANNED is eligible (not disabled)
      expect(options[0].disabled).toBe(false);
      expect(options[0].textContent).toContain('CLS-PLANNED');

      // CLS-INPROGRESS is disabled
      expect(options[1].disabled).toBe(true);
      expect(options[1].textContent).toContain('Lớp đang diễn ra');

      // CLS-PAST is disabled
      expect(options[2].disabled).toBe(true);
      expect(options[2].textContent).toContain('Đã qua ngày bắt đầu');

      // CLS-NODATE is disabled
      expect(options[3].disabled).toBe(true);
      expect(options[3].textContent).toContain('Ngày bắt đầu không hợp lệ');
    });
  });
});





