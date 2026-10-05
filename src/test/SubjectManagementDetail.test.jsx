import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import SubjectManagement from '../Academic/SubjectManagement';
import { LanguageProvider } from '../context/LanguageContext';

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

describe('SubjectManagement - Detail Button and Modal', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app_language', 'vi');
    vi.clearAllMocks();
  });

  const mockSubjects = [
    {
      subjectId: 10,
      subjectCode: 'SJ-AERO',
      subjectName: 'Aerodynamics & Principles',
      subjectType: 'Theory',
      defaultHours: 35,
      minSessions: 2,
      maxSessions: 15,
      assessmentMethod: 'Written Exam',
      description: 'Foundational course on aerodynamics for maintenance crew.',
      status: 'Active',
    },
    {
      subjectId: 20,
      subjectCode: 'SJ-PRAC',
      subjectName: 'Engine Maintenance Practice',
      subjectType: 'Practical',
      defaultHours: 40,
      minSessions: 4,
      maxSessions: 20,
      assessmentMethod: 'Practical Checklist',
      description: 'Hands-on practical evaluations in hangar.',
      status: 'Active',
    },
  ];

  const mockCourses = [
    {
      courseId: 101,
      courseCode: 'CRS-LINE',
      courseName: 'Line Maintenance Basic',
      status: 'Active',
      subjects: [
        { subjectId: 10, subjectCode: 'SJ-AERO' },
      ],
    },
  ];

  it('renders "Chi tiết" button in each subject row and opens the Subject Detail Modal on click', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/Subjects') return Promise.resolve(mockSubjects);
      if (url === '/Courses') return Promise.resolve(mockCourses);
      if (url === '/Classes') return Promise.resolve([]);
      if (url === '/Courses/101') return Promise.resolve(mockCourses[0]);
      if (url === '/Subjects/10') return Promise.resolve(mockSubjects[0]);
      return Promise.resolve([]);
    });

    render(
      <MemoryRouter>
        <LanguageProvider>
          <SubjectManagement />
        </LanguageProvider>
      </MemoryRouter>
    );

    // Wait for subjects to load
    await waitFor(() => {
      expect(screen.getByText('SJ-AERO')).toBeInTheDocument();
      expect(screen.getByText('SJ-PRAC')).toBeInTheDocument();
    });

    // Check that "Chi tiết" / "Detail" buttons exist for all rows
    const detailButtons = screen.getAllByRole('button', { name: /Chi tiết|Detail/i });
    expect(detailButtons.length).toBeGreaterThanOrEqual(2);

    // Click "Chi tiết" for the first subject (SJ-AERO)
    fireEvent.click(detailButtons[0]);

    // Verify Subject Detail Modal appears
    await waitFor(() => {
      // Modal title
      expect(screen.getByText(/Chi tiết môn học|Subject Details/i)).toBeInTheDocument();
      // Training configuration section
      expect(screen.getByText(/Cấu hình đào tạo|Training Configuration/i)).toBeInTheDocument();
      // Description is visible (both in table and inside modal)
      expect(screen.getAllByText('Foundational course on aerodynamics for maintenance crew.')).toHaveLength(2);
      // Applied course is shown
      expect(screen.getByText('CRS-LINE')).toBeInTheDocument();
      expect(screen.getByText('Line Maintenance Basic')).toBeInTheDocument();
      // Lock status badge is shown since CRS-LINE is Active
      expect(screen.getByText(/Môn học đang được bảo vệ|Subject is protected/i)).toBeInTheDocument();
    });

    // Close the modal
    const closeButtons = screen.getAllByRole('button', { name: /Đóng|Close|×/i });
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByText(/Chi tiết môn học|Subject Details/i)).not.toBeInTheDocument();
      expect(screen.getAllByText('Foundational course on aerodynamics for maintenance crew.')).toHaveLength(1);
    });
  });
});
