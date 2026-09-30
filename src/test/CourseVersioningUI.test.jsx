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
    expect(screen.getByText('v2')).toBeInTheDocument();

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
});
