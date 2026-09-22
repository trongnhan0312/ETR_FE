import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import UserManagement from '../ADMIN/UserManagement';
import { LanguageProvider } from '../context/LanguageContext';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    postFormData: vi.fn(),
    downloadFile: vi.fn(),
  },
  parseApiError: vi.fn((err, fallback) => fallback || 'Error'),
}));

import { api } from '../utils/api';

describe('UserManagement - Admin Edit Account Permissions (BR-117) & Gender Options', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Logged in as root admin (accountId: 1, username: 'admin@etr.com')
    localStorage.setItem(
      'user',
      JSON.stringify({
        accountId: 1,
        username: 'admin@etr.com',
        role: 'Admin',
        roleId: 1,
      })
    );

    api.get.mockImplementation((url) => {
      if (url === '/Accounts') {
        return Promise.resolve([
          {
            accountId: 1,
            username: 'admin@etr.com',
            roleId: 1,
            role: 'Admin',
            departmentId: 1,
            status: 'Active',
          },
          {
            accountId: 2,
            username: 'other_admin@etr.com',
            roleId: 1,
            role: 'Admin',
            departmentId: 1,
            status: 'Active',
          },
          {
            accountId: 3,
            username: 'instructor@etr.com',
            roleId: 2,
            role: 'Instructor',
            departmentId: 2,
            status: 'Active',
          },
          {
            accountId: 4,
            username: 'student@etr.com',
            roleId: 6,
            role: 'Student',
            departmentId: 3,
            status: 'Active',
          },
        ]);
      }
      if (url === '/UserProfiles') {
        return Promise.resolve([
          {
            accountId: 1,
            fullName: 'System Admin',
            email: 'admin@etr.com',
            phone: '0900000001',
            gender: 'Male',
          },
          {
            accountId: 2,
            fullName: 'Secondary Admin',
            email: 'other_admin@etr.com',
            phone: '0900000002',
            gender: 'Female',
          },
          {
            accountId: 3,
            fullName: 'Senior Instructor',
            email: 'instructor@etr.com',
            phone: '0900000003',
            gender: 'Male',
          },
          {
            accountId: 4,
            fullName: 'Jane Student',
            email: 'student@etr.com',
            phone: '0900000004',
            gender: 'Female',
          },
        ]);
      }
      if (url === '/Departments') {
        return Promise.resolve([
          { departmentId: 1, departmentName: 'Administration' },
          { departmentId: 2, departmentName: 'Training' },
          { departmentId: 3, departmentName: 'Flight Crew' },
        ]);
      }
      return Promise.resolve([]);
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <LanguageProvider>
          <UserManagement />
        </LanguageProvider>
      </MemoryRouter>
    );
  };

  it('disables Edit button for own account and displays proper tooltip', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText(/admin@etr\.com/).length).toBeGreaterThan(0);
    });

    const editButtons = screen.getAllByRole('button', { name: /Chỉnh sửa|Edit/i });
    // First row is admin@etr.com (self)
    expect(editButtons[0]).toBeDisabled();
    expect(editButtons[0]).toHaveAttribute(
      'title',
      expect.stringMatching(/chính mình|own account/i)
    );
  });

  it('disables Edit button for another Admin account and displays proper tooltip', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText(/other_admin@etr\.com/).length).toBeGreaterThan(0);
    });

    const editButtons = screen.getAllByRole('button', { name: /Chỉnh sửa|Edit/i });
    // Second row is other_admin@etr.com (another admin)
    expect(editButtons[1]).toBeDisabled();
    expect(editButtons[1]).toHaveAttribute(
      'title',
      expect.stringMatching(/Quản trị viên khác|another Administrator/i)
    );
  });

  it('enables Edit button for non-admin accounts and opens modal when clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText(/instructor@etr\.com/).length).toBeGreaterThan(0);
    });

    const editButtons = screen.getAllByRole('button', { name: /Chỉnh sửa|Edit/i });
    // Third row is instructor@etr.com (Instructor)
    expect(editButtons[2]).not.toBeDisabled();

    // Fourth row is student@etr.com (Student)
    expect(editButtons[3]).not.toBeDisabled();

    // Click on instructor edit button
    fireEvent.click(editButtons[2]);

    // Edit modal should open with instructor's info
    await waitFor(() => {
      expect(screen.getByDisplayValue('Senior Instructor')).toBeInTheDocument();
    });
  });

  it('disables edit button for self and other admins when logged in as a secondary admin', async () => {
    // Log in as secondary admin (accountId: 2)
    localStorage.setItem(
      'user',
      JSON.stringify({
        accountId: 2,
        username: 'other_admin@etr.com',
        role: 'Admin',
        roleId: 1,
      })
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText(/other_admin@etr\.com/).length).toBeGreaterThan(0);
    });

    const editButtons = screen.getAllByRole('button', { name: /Chỉnh sửa|Edit/i });
    // First row: root admin (another admin) -> disabled
    expect(editButtons[0]).toBeDisabled();
    expect(editButtons[0]).toHaveAttribute(
      'title',
      expect.stringMatching(/Quản trị viên khác|another Administrator/i)
    );

    // Second row: self (other_admin) -> disabled
    expect(editButtons[1]).toBeDisabled();
    expect(editButtons[1]).toHaveAttribute(
      'title',
      expect.stringMatching(/chính mình|own account/i)
    );

    // Third row: instructor -> enabled
    expect(editButtons[2]).not.toBeDisabled();
  });

  it('shows only "Nam" and "Nữ" in Vietnamese mode without "(Female)" and without "Khác (Other)"', async () => {
    localStorage.setItem('app_language', 'vi');

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText(/instructor@etr\.com/).length).toBeGreaterThan(0);
    });

    const editButtons = screen.getAllByRole('button', { name: /Chỉnh sửa|Edit/i });
    fireEvent.click(editButtons[2]);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Senior Instructor')).toBeInTheDocument();
    });

    // Find the gender select dropdown in edit modal
    const genderSelect = screen.getAllByRole('combobox').find((select) => {
      return Array.from(select.options).some((opt) => opt.value === 'Male' || opt.value === 'Female');
    });

    expect(genderSelect).toBeDefined();
    const optionTexts = Array.from(genderSelect.options).map((opt) => opt.textContent.trim());

    // Should only have "Nam" and "Nữ"
    expect(optionTexts).toEqual(['Nam', 'Nữ']);
    expect(optionTexts).not.toContain('Nữ (Female)');
    expect(optionTexts).not.toContain('Khác (Other)');
    expect(optionTexts).not.toContain('Khác');
  });

  it('shows only "Male" and "Female" in English mode without "Other"', async () => {
    localStorage.setItem('app_language', 'en');

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText(/instructor@etr\.com/).length).toBeGreaterThan(0);
    });

    const editButtons = screen.getAllByRole('button', { name: /Chỉnh sửa|Edit/i });
    fireEvent.click(editButtons[2]);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Senior Instructor')).toBeInTheDocument();
    });

    // Find the gender select dropdown in edit modal
    const genderSelect = screen.getAllByRole('combobox').find((select) => {
      return Array.from(select.options).some((opt) => opt.value === 'Male' || opt.value === 'Female');
    });

    expect(genderSelect).toBeDefined();
    const optionTexts = Array.from(genderSelect.options).map((opt) => opt.textContent.trim());

    // Should only have "Male" and "Female"
    expect(optionTexts).toEqual(['Male', 'Female']);
    expect(optionTexts).not.toContain('Other');
    expect(optionTexts).not.toContain('Khác (Other)');
  });
});
