import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import StudentLogbook from '../Student/StudentLogbook';
import StudentProfile from '../Student/StudentProfile';
import { api } from '../utils/api';
import { LanguageProvider } from '../context/LanguageContext';

vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Phase 3: Pilot Credentials & Logbook Summary Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Các assertion hiện có dùng chuỗi tiếng Việt → ghim ngôn ngữ VI cho file này
    localStorage.setItem('app_language', 'vi');
    localStorage.setItem(
      'user',
      JSON.stringify({
        accountId: 10,
        username: 'pilot@etr.com',
        fullName: 'Nguyen Van Pilot',
        roleName: 'Student',
      })
    );
  });

  it('renders pilot credentials and unverified status badge on StudentProfile', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/UserProfiles/me') {
        return Promise.resolve({
          accountId: 10,
          fullName: 'Nguyen Van Pilot',
          email: 'pilot@etr.com',
          phone: '0912345678',
          dateOfBirth: '1998-05-15T00:00:00Z',
          gender: 'Male',
          organization: 'ETR Aviation',
          licenseType: 'CPL',
          licenseNumber: 'VN-9988',
          licenseExpiryDate: '2028-06-30T00:00:00Z',
          medicalClass: 'Class 1',
          medicalExpiryDate: '2027-12-31T00:00:00Z',
          icaoElpLevel: 5,
          icaoElpExpiryDate: '2030-01-01T00:00:00Z',
          typeRatings: 'A320',
          isCredentialsVerified: false,
        });
      }
      if (url.includes('/attachments')) {
        return Promise.resolve([
          {
            attachmentId: 1,
            docType: 'License',
            fileName: 'cpl_license.pdf',
            url: 'https://cloudinary.com/cpl.pdf',
            uploadedAt: '2026-10-01T00:00:00Z',
          },
        ]);
      }
      return Promise.resolve({});
    });

    render(
      <LanguageProvider>
        <MemoryRouter>
          <StudentProfile />
        </MemoryRouter>
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('CPL')).toBeInTheDocument();
      expect(screen.getByText(/VN-9988/)).toBeInTheDocument();
      expect(screen.getByText('Class 1')).toBeInTheDocument();
      expect(screen.getByText('Level 5')).toBeInTheDocument();
      expect(screen.getByText('A320')).toBeInTheDocument();
      expect(screen.getByText(/TỰ KHAI \/ CHỜ XÁC MINH/i)).toBeInTheDocument();
      expect(screen.getByText('cpl_license.pdf')).toBeInTheDocument();
    });
  });

  it('renders Logbook Summary cards, separate flight vs sim, and history entries', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/Logbook/my-summary') {
        return Promise.resolve({
          accountId: 10,
          userCode: 'STU-010',
          fullName: 'Nguyen Van Pilot',
          totalFlightHours: 25.5,
          totalSimulatorHours: 16.0,
          totalDualHours: 20.0,
          flightDualHours: 12.0,
          simulatorDualHours: 8.0,
          totalSoloHours: 5.5,
          totalPicHours: 5.5,
          totalNightHours: 3.0,
          totalInstrumentHours: 8.0,
          flightInstrumentHours: 4.0,
          simulatorInstrumentHours: 4.0,
          totalCrossCountryHours: 6.0,
          totalDayLandings: 12,
          totalNightLandings: 4,
          totalLandings: 16,
          totalSignedSessionsCount: 8,
          lastFlightDate: '2026-09-28T00:00:00Z',
          disclaimer: 'Tổng giờ logbook phản ánh thời gian đào tạo thực tế đã được ký nhận, độc lập với đánh giá hoàn thành môn học.',
          entries: [
            {
              attendanceRecordId: 101,
              sessionId: 1,
              sessionTitle: 'Bài tập bay đơn vòng kín',
              lessonCode: 'FLT-05',
              sessionDate: '2026-09-28T00:00:00Z',
              trainingType: 'Flight',
              aircraftRegistration: 'VN-C172',
              route: 'VVTS-VVTS',
              flightHours: 2.0,
              simulatorHours: 0,
              dualHours: 0,
              soloHours: 2.0,
              picHours: 2.0,
              nightHours: 0,
              instrumentHours: 0,
              dayLandings: 4,
              nightLandings: 0,
              totalLandings: 4,
              instructorSignedAt: '2026-09-28T10:00:00Z',
            },
            {
              attendanceRecordId: 102,
              sessionId: 2,
              sessionTitle: 'Khẩn nguy động cơ buồng lái mô phỏng',
              lessonCode: 'SIM-02',
              sessionDate: '2026-09-25T00:00:00Z',
              trainingType: 'Simulator',
              simulatorDevice: 'ALX-FNPT-II',
              flightHours: 0,
              simulatorHours: 4.0,
              dualHours: 4.0,
              soloHours: 0,
              picHours: 0,
              nightHours: 0,
              instrumentHours: 2.0,
              dayLandings: 0,
              nightLandings: 0,
              totalLandings: 0,
              instructorSignedAt: '2026-09-25T14:00:00Z',
            },
          ],
        });
      }
      return Promise.resolve({});
    });

    render(
      <LanguageProvider>
        <MemoryRouter>
          <StudentLogbook />
        </MemoryRouter>
      </LanguageProvider>
    );

    await waitFor(() => {
      // Flight hours
      expect(screen.getByText(/^25\.5/)).toBeInTheDocument();
      // SIM hours
      expect(screen.getByText(/^16\.0/)).toBeInTheDocument();
      // Solo / PIC hours
      expect(screen.getAllByText(/5\.5/).length).toBeGreaterThanOrEqual(1);
      // Landings
      expect(screen.getAllByText(/16/).length).toBeGreaterThanOrEqual(1);
      // Disclaimer
      expect(screen.getByText(/Tổng giờ logbook phản ánh thời gian đào tạo thực tế/i)).toBeInTheDocument();
      // Table rows
      expect(screen.getByText('Bài tập bay đơn vòng kín')).toBeInTheDocument();
      expect(screen.getByText('FLT-05')).toBeInTheDocument();
      expect(screen.getByText('VN-C172')).toBeInTheDocument();
      expect(screen.getByText('Khẩn nguy động cơ buồng lái mô phỏng')).toBeInTheDocument();
      expect(screen.getByText('SIM-02')).toBeInTheDocument();
      expect(screen.getByText('ALX-FNPT-II')).toBeInTheDocument();
    });
  });

  it('renders English translations and white disclaimer banner in EN mode', async () => {
    localStorage.setItem('app_language', 'en');
    api.get.mockImplementation((url) => {
      if (url === '/Logbook/my-summary') {
        return Promise.resolve({
          accountId: 10,
          totalFlightHours: 25.5,
          totalSimulatorHours: 16.0,
          totalDualHours: 20.0,
          flightDualHours: 12.0,
          simulatorDualHours: 8.0,
          totalSoloHours: 5.5,
          totalPicHours: 5.5,
          totalNightHours: 3.0,
          totalInstrumentHours: 8.0,
          flightInstrumentHours: 4.0,
          simulatorInstrumentHours: 4.0,
          totalCrossCountryHours: 6.0,
          totalDayLandings: 12,
          totalNightLandings: 4,
          totalLandings: 16,
          lastFlightDate: '2026-09-28T00:00:00Z',
          // Không có disclaimer từ API → render chuỗi tĩnh (phải ra tiếng Anh)
          entries: [
            {
              attendanceRecordId: 103,
              sessionId: 3,
              sessionTitle: 'Night circuit training',
              lessonCode: 'FLT-09',
              sessionDate: '2026-09-20T00:00:00Z',
              trainingType: 'Flight',
              aircraftRegistration: 'VN-C172',
              route: 'VVTS-VVTS',
              flightHours: 1.5,
              simulatorHours: 0,
              dualHours: 1.5,
              soloHours: 0,
              picHours: 0,
              nightHours: 1.0,
              instrumentHours: 0,
              dayLandings: 0,
              nightLandings: 2,
              totalLandings: 2,
              instructorSignedAt: null,
            },
          ],
        });
      }
      return Promise.resolve({});
    });

    render(
      <LanguageProvider>
        <MemoryRouter>
          <StudentLogbook />
        </MemoryRouter>
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Flight Log & Cockpit Training')).toBeInTheDocument();
      expect(screen.getByText('Recording standard:')).toBeInTheDocument();
      expect(screen.getByText(/Total logbook hours reflect actual signed-off training time/i)).toBeInTheDocument();
      expect(screen.getByText(/Actual Flight Hours \(Flight\)/)).toBeInTheDocument();
      expect(screen.getByText('Pending signature')).toBeInTheDocument();
    });

    // Banner disclaimer phải chữ trắng trên nền tối
    const banner = screen.getByText('Recording standard:').closest('div').parentElement;
    expect(banner).toHaveStyle({ color: '#ffffff' });
  });
});
