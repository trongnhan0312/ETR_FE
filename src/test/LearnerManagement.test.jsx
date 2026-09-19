import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import LearnerManagement from '../Academic/LearnerManagement';
import { LanguageProvider } from '../context/LanguageContext';

// Mock the api module
vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    postFormData: vi.fn(),
    downloadFile: vi.fn(),
  },
}));

import { api } from '../utils/api';

describe('LearnerManagement - Student Profile Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    api.get.mockImplementation((url) => {
      if (url === '/Accounts') {
        return Promise.resolve([
          { accountId: 10, username: 'student1@etr.com', roleId: 6, departmentId: 3, status: 'Active' },
          { accountId: 11, username: 'student2@etr.com', roleId: 6, departmentId: 4, status: 'Active' },
          { accountId: 12, username: 'instructor@etr.com', roleId: 2, departmentId: 2, status: 'Active' },
        ]);
      }
      if (url === '/UserProfiles/learners' || url === '/UserProfiles') {
        return Promise.resolve([
          {
            accountId: 10,
            userCode: 'STU-01',
            fullName: 'Nguyen Van A',
            email: 'student1@etr.com',
            phone: '0901234567',
            dateOfBirth: '2000-01-15T00:00:00.000Z',
            gender: 'Male',
            organization: 'ETR Aviation',
          },
        ]);
      }
      if (url === '/Departments') {
        return Promise.resolve([
          { departmentId: 3, departmentName: 'Flight Crew' },
          { departmentId: 4, departmentName: 'Cabin Crew' },
        ]);
      }
      return Promise.resolve([]);
    });
  });

  it('renders student code (STU-xx) instead of UserID in the table', async () => {
    render(
      <LanguageProvider>
        <LearnerManagement />
      </LanguageProvider>
    );

    // Wait for table to load
    await waitFor(() => {
      // Header must contain Student Code / Mã học viên
      expect(screen.getByText(/Mã học viên|Student Code/i)).toBeInTheDocument();
    });

    // Verify student code STU-01 is rendered for student 1
    expect(screen.getByText('STU-01')).toBeInTheDocument();

    // Verify student 2 without profile gets fallback student code STU-11 (not USR-11)
    expect(screen.getByText('STU-11')).toBeInTheDocument();
  });

  it('includes the View action button in the student list', async () => {
    render(
      <LanguageProvider>
        <LearnerManagement />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('STU-01')).toBeInTheDocument();
    });

    // Find the view button specifically
    const viewButtons = screen.getAllByRole('button', { name: /^view$|^xem$/i });
    expect(viewButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      // Check that STU-01 appears in both table and modal
      expect(screen.getAllByText('STU-01').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByRole('button', { name: /Edit Profile|Chỉnh sửa hồ sơ/i })).toBeInTheDocument();
    });
  });

  it('automatically creates a student profile on new student account creation', async () => {
    api.post.mockImplementation((url, body) => {
      if (url === '/Accounts') {
        return Promise.resolve({ accountId: 99, username: body.username, roleId: 6, departmentId: body.departmentId });
      }
      if (url.startsWith('/UserProfiles/')) {
        return Promise.resolve({ accountId: 99, userCode: 'STU-99', ...body });
      }
      return Promise.resolve({});
    });

    render(
      <LanguageProvider>
        <LearnerManagement />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('STU-01')).toBeInTheDocument();
    });

    // Click create student button
    const createBtn = screen.getByRole('button', { name: /\+ Tạo tài khoản học viên|\+ Create Student/i });
    fireEvent.click(createBtn);

    // Fill form
    const emailInput = screen.getByPlaceholderText(/student@domain.com/i);
    const nameInput = screen.getByPlaceholderText(/Nguyễn Văn A|John Doe/i);
    const dateInput = document.querySelector('input[type="date"]');

    fireEvent.change(emailInput, { target: { value: 'newstudent@etr.com' } });
    fireEvent.change(nameInput, { target: { value: 'Le Thi B' } });
    fireEvent.change(dateInput, { target: { value: '2002-05-10' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /^Tạo học viên$|^Create Student$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // Must have called POST /Accounts
      expect(api.post).toHaveBeenCalledWith(
        '/Accounts',
        expect.objectContaining({ username: 'newstudent@etr.com', roleId: 6 })
      );
      // Must have automatically called POST /UserProfiles/99
      expect(api.post).toHaveBeenCalledWith(
        '/UserProfiles/99',
        expect.objectContaining({
          userCode: null,
          fullName: 'Le Thi B',
          email: 'newstudent@etr.com',
          organization: 'ETR Aviation',
        })
      );
    });
  });
});
