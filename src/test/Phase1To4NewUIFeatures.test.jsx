import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CompletionRequirementsSection from '../Academic/CompletionRequirementsSection';
import InstructorStudentDetailModal from '../Instructor/InstructorStudentDetailModal';
import { LanguageProvider } from '../context/LanguageContext';
import * as apiModule from '../utils/api';

describe('New Phase 1-4 UI Features Tests', () => {
  const renderWithLanguage = (ui) => {
    return render(
      <LanguageProvider>
        {ui}
      </LanguageProvider>
    );
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem('app_language', 'vi');
  });

  describe('1. CompletionRequirementsSection (Phase 1 & Phase 4)', () => {
    it('renders initial requirements and displays version tag', () => {
      const initialReqs = [
        {
          _tempId: 'req_1',
          requirementType: 'MinAttendance',
          requirementName: 'Tỷ lệ chuyên cần tối thiểu',
          thresholdValue: 80,
          isMandatory: true,
          versionNo: 2
        },
        {
          _tempId: 'req_2',
          requirementType: 'MinFlightHours',
          requirementName: 'Giờ bay thực tế tối thiểu',
          thresholdValue: 12.5,
          isMandatory: true,
          versionNo: 2
        }
      ];

      renderWithLanguage(
        <CompletionRequirementsSection
          requirements={initialReqs}
          versionNo={2}
          isLocked={false}
        />
      );

      expect(screen.getByText(/Tiêu chuẩn hoàn thành khóa học/i)).toBeInTheDocument();
      expect(screen.getAllByText('v2').length).toBeGreaterThan(0);
      expect(screen.getByText('Tỷ lệ chuyên cần tối thiểu')).toBeInTheDocument();
      expect(screen.getByText('Giờ bay thực tế tối thiểu')).toBeInTheDocument();
      expect(screen.getByText(/≥ 80 %/i)).toBeInTheDocument();
      expect(screen.getByText(/≥ 12.5 (giờ|hrs)/i)).toBeInTheDocument();
    });

    it('displays locked notice when course is Active and has classes', () => {
      renderWithLanguage(
        <CompletionRequirementsSection
          courseId={10}
          isLocked={true}
          requirements={[]}
          versionNo={1}
        />
      );

      expect(screen.getByText(/Khóa cấu hình tiêu chuẩn hoàn thành/i)).toBeInTheDocument();
      expect(screen.queryByText('+ Thêm tiêu chí')).not.toBeInTheDocument();
    });

    it('validates form threshold values (MinAttendance <= 100, MinFlightHours <= 999.99)', async () => {
      renderWithLanguage(
        <CompletionRequirementsSection
          requirements={[]}
          versionNo={1}
          isLocked={false}
        />
      );

      // Open add form
      const addBtn = screen.getByRole('button', { name: /\+?\s*Thêm tiêu chí/i });
      fireEvent.click(addBtn);

      expect(screen.getByText(/Thêm Tiêu chuẩn Hoàn thành Mới/i)).toBeInTheDocument();

      // Select MinAttendance
      const selectType = screen.getByRole('combobox');
      fireEvent.change(selectType, { target: { value: 'MinAttendance' } });

      // Enter threshold > 100 (e.g. 105)
      const numberInput = screen.getByRole('spinbutton');
      fireEvent.change(numberInput, { target: { value: '105' } });

      // Submit form
      const saveBtn = screen.getByText('Lưu tiêu chuẩn');
      fireEvent.submit(saveBtn.closest('form'));

      await waitFor(() => {
        expect(screen.getByText(/phải nằm trong khoảng 0 - 100 %/i)).toBeInTheDocument();
      });
    });
  });

  describe('2. InstructorStudentDetailModal (Logbook & Readiness Check - P3-09, P4-05, P4-08)', () => {
    const mockStudent = {
      accountId: 88,
      fullName: 'Tran Van Test',
      studentCode: 'STU-0088',
      enrollmentId: 55,
      className: 'Class PPL-Morning',
      courseName: 'Private Pilot License',
      courseVersionNo: 2
    };

    it('renders Logbook tab with flight/sim totals and training history', async () => {
      const mockLogbook = {
        totalFlightHours: 32.5,
        totalSimulatorHours: 14.0,
        flightDualHours: 20.0,
        simulatorDualHours: 14.0,
        flightInstrumentHours: 8.0,
        simulatorInstrumentHours: 10.0,
        totalDayLandings: 15,
        totalNightLandings: 5,
        entries: [
          {
            flightDate: '2026-09-15',
            sessionTitle: 'Buổi 1: Bay cơ bản',
            subjectName: 'Thực hành Bay PPL',
            trainingType: 'Flight',
            aircraftRegistration: 'VN-C172',
            flightHours: 2.5,
            totalLandings: 3,
            instructorSignedAt: '2026-09-15T10:00:00Z'
          }
        ]
      };

      vi.spyOn(apiModule.api, 'get').mockResolvedValue(mockLogbook);

      renderWithLanguage(
        <InstructorStudentDetailModal
          student={mockStudent}
          initialTab="logbook"
          onClose={() => {}}
        />
      );

      expect(screen.getByText('Tran Van Test')).toBeInTheDocument();
      expect(screen.getByText('STU-0088')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('32.5h')).toBeInTheDocument();
        expect(screen.getByText('14.0h')).toBeInTheDocument();
        expect(screen.getByText('Buổi 1: Bay cơ bản')).toBeInTheDocument();
        expect(screen.getByText('VN-C172')).toBeInTheDocument();
      });
    });

    it('shows friendly 403 Forbidden error when student is outside assigned scope', async () => {
      const error403 = new Error('Forbidden');
      error403.status = 403;
      vi.spyOn(apiModule.api, 'get').mockRejectedValue(error403);

      renderWithLanguage(
        <InstructorStudentDetailModal
          student={mockStudent}
          initialTab="logbook"
          onClose={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Quyền truy cập bị từ chối \(403\): Học viên không thuộc phạm vi/i)).toBeInTheDocument();
        expect(screen.getByText(/Thử tải lại/i)).toBeInTheDocument();
      });
    });

    it('renders Readiness Check tab with course version, overall badge, and masked warnings', async () => {
      const mockReadiness = {
        etrCourseRecordId: 99,
        enrollmentId: 55,
        accountId: 88,
        studentName: 'Tran Van Test',
        courseId: 10,
        courseName: 'Private Pilot License',
        courseVersionNo: 2,
        classId: 30,
        className: 'Class PPL-Morning',
        overallStatus: 'Met',
        totalFlightHours: 35.0,
        totalSimulatorHours: 12.0,
        conditions: [
          {
            conditionCode: 'MIN_FLIGHT_HOURS',
            conditionName: 'Giờ bay thực tế tối thiểu',
            status: 'Met',
            currentValue: 35.0,
            thresholdValue: 30.0,
            unit: 'giờ',
            isMandatory: true,
            explanation: 'Đã hoàn thành 35.00 / 30.00 giờ bay.'
          }
        ],
        warnings: [
          {
            warningCode: 'MEDICAL_EXPIRING_SOON',
            message: 'Giấy chứng nhận sức khỏe của học viên sắp hết hạn trong vòng 30 ngày.',
            severity: 'Warning'
          }
        ],
        disclaimer: 'Đánh giá mức độ sẵn sàng đào tạo.'
      };

      vi.spyOn(apiModule.api, 'get').mockResolvedValue(mockReadiness);

      renderWithLanguage(
        <InstructorStudentDetailModal
          student={mockStudent}
          initialTab="readiness"
          onClose={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/ĐÃ ĐẠT TẤT CẢ TIÊU CHUẨN HOÀN THÀNH/i)).toBeInTheDocument();
        expect(screen.getByText('Phiên bản #2')).toBeInTheDocument();
        expect(screen.getByText('Giờ bay thực tế tối thiểu')).toBeInTheDocument();
        expect(screen.getByText(/Giấy chứng nhận sức khỏe của học viên sắp hết hạn/i)).toBeInTheDocument();
      });
    });

    it('shows 403 Forbidden on Readiness tab when student is outside assigned scope without converting to missing ETR', async () => {
      const error403 = new Error('Forbidden');
      error403.status = 403;
      vi.spyOn(apiModule.api, 'get').mockRejectedValue(error403);

      renderWithLanguage(
        <InstructorStudentDetailModal
          student={mockStudent}
          initialTab="readiness"
          onClose={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Quyền truy cập bị từ chối \(403\): Học viên không thuộc phạm vi các lớp được phân công/i)).toBeInTheDocument();
        expect(screen.queryByText(/Chưa có hồ sơ ETR hoặc chưa đủ dữ liệu/i)).not.toBeInTheDocument();
      });
    });
  });
});
