import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import CreateClass from '../Academic/CreateClass';
import { LanguageProvider } from '../context/LanguageContext';
import { ToastContainer } from '../components/Toast';

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

describe('CreateClass - ICAO/CAAV Training Duration & Earliest Allowed End Date', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app_language', 'en');
    vi.clearAllMocks();
  });

  const mockCourses = [
    {
      courseId: 1,
      courseCode: 'CRS-A320',
      courseName: 'A320 Type Rating Course',
      status: 'Active',
      versionNo: 1,
      durationHours: 80,
    },
  ];

  const mockSubjects = [
    {
      subjectId: 1,
      subjectCode: 'A320-SYS',
      subjectName: 'A320 Aircraft Systems & Avionics Fundamentals',
      subjectType: 'Theory',
      defaultHours: 40,
    },
    {
      subjectId: 2,
      subjectCode: 'ENG-MNT-LINE',
      subjectName: 'A320 Line Maintenance & Defect Troubleshooting',
      subjectType: 'Practical',
      defaultHours: 40,
    },
  ];

  const mockCourseDetail = {
    courseId: 1,
    courseCode: 'CRS-A320',
    courseName: 'A320 Type Rating Course',
    subjects: [
      { courseId: 1, subjectId: 1, sequenceNo: 1, requiredHours: 40, requiredSessions: 10, isMandatory: true, passingScore: 80 },
      { courseId: 1, subjectId: 2, sequenceNo: 2, requiredHours: 40, requiredSessions: 10, isMandatory: true, passingScore: 80 },
    ],
  };

  it('correctly calculates 15 training days + 3 buffer days = 18 days for Theory (40h/8) + Practical (40h/4)', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/Courses/1') return Promise.resolve(mockCourseDetail);
      if (url === '/Subjects') return Promise.resolve(mockSubjects);
      if (url.toLowerCase().includes('trainingfacilities')) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    render(
      <LanguageProvider>
        <>
          <ToastContainer />
          <CreateClass
            courses={mockCourses}
            initialCourseId={1}
            instructors={[]}
            subjects={mockSubjects}
            onSave={vi.fn()}
            onCancel={vi.fn()}
          />
        </>
      </LanguageProvider>
    );

    // Set Start Date to 2027-01-06
    const startDateInput = screen.getByLabelText(/start date/i);
    fireEvent.change(startDateInput, { target: { value: '2027-01-06' } });

    // Verify duration calculation:
    // Theory: 40 / 8 = 5 days
    // Practical: 40 / 4 = 10 days
    // Total training days = 15 days
    // Buffer days = ceil(15 * 0.15) = 3 days
    // Total min days = 18 days
    // Min end date = 2027-01-06 + 18 days = 2027-01-24
    await waitFor(() => {
      expect(screen.getByText(/18 days/i)).toBeInTheDocument();
      expect(screen.getByText(/15 training days/i)).toBeInTheDocument();
      expect(screen.getByText(/3 buffer days/i)).toBeInTheDocument();
      expect(screen.getByText(/24\/01\/2027/i)).toBeInTheDocument();
    });

    // Check that End Date input was auto-adjusted to at least 2027-01-24
    const endDateInput = screen.getByLabelText(/end date/i);
    expect(endDateInput.getAttribute('min')).toBe('2027-01-24');
  });

  it('blocks submission and shows error if user forces end date before earliest allowed date (e.g. 2027-01-19)', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/Courses/1') return Promise.resolve(mockCourseDetail);
      if (url === '/Subjects') return Promise.resolve(mockSubjects);
      if (url.toLowerCase().includes('trainingfacilities')) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    const mockSave = vi.fn();

    render(
      <LanguageProvider>
        <>
          <ToastContainer />
          <CreateClass
            courses={mockCourses}
            initialCourseId={1}
            instructors={[]}
            subjects={mockSubjects}
            onSave={mockSave}
            onCancel={vi.fn()}
          />
        </>
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/18 days/i)).toBeInTheDocument();
    });

    // Fill form
    const codeInput = document.querySelector('#class-code-input');
    const nameInput = document.querySelector('#class-name-input');
    fireEvent.change(codeInput, { target: { value: 'A320-K2027-01' } });
    fireEvent.change(nameInput, { target: { value: 'A320 Flight Tech Cohort 1' } });

    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);

    fireEvent.change(startDateInput, { target: { value: '2027-01-06' } });
    // User tries to pick 2027-01-19 (the exact date from the user report screenshot)
    fireEvent.change(endDateInput, { target: { value: '2027-01-19' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    // Save should NOT be called
    expect(mockSave).not.toHaveBeenCalled();

    // Toast error or validation message should mention 18 days and ending on or after 24/01/2027
    await waitFor(() => {
      expect(screen.getByText(/Training end date is too short for ICAO\/CAAV standards.*18 days/i)).toBeInTheDocument();
    });
  });

  it('allows submission when end date is valid (>= 2027-01-24)', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/Courses/1') return Promise.resolve(mockCourseDetail);
      if (url === '/Subjects') return Promise.resolve(mockSubjects);
      if (url.toLowerCase().includes('trainingfacilities')) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    const mockSave = vi.fn();

    render(
      <LanguageProvider>
        <>
          <ToastContainer />
          <CreateClass
            courses={mockCourses}
            initialCourseId={1}
            instructors={[]}
            subjects={mockSubjects}
            onSave={mockSave}
            onCancel={vi.fn()}
          />
        </>
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/18 days/i)).toBeInTheDocument();
    });

    const codeInput = document.querySelector('#class-code-input');
    const nameInput = document.querySelector('#class-name-input');
    fireEvent.change(codeInput, { target: { value: 'A320-K2027-02' } });
    fireEvent.change(nameInput, { target: { value: 'A320 Flight Tech Cohort 2' } });

    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);

    fireEvent.change(startDateInput, { target: { value: '2027-01-06' } });
    fireEvent.change(endDateInput, { target: { value: '2027-01-24' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        code: 'A320-K2027-02',
        name: 'A320 Flight Tech Cohort 2',
        startDate: '2027-01-06',
        endDate: '2027-01-24',
      })
    );
  });
});
