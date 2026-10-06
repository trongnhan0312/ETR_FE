import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StudentReadinessCheckSection } from '../Student/StudentMyETR';
import { LanguageProvider } from '../context/LanguageContext';
import * as apiModule from '../utils/api';

describe('Phase 4 — Course Version Readiness Check', () => {
  const renderWithLanguage = (ui) => {
    return render(
      <LanguageProvider>
        {ui}
      </LanguageProvider>
    );
  };

  it('renders readiness conditions and meets criteria based on course version', async () => {
    const mockReadiness = {
      etrCourseRecordId: 1,
      enrollmentId: 10,
      accountId: 6,
      studentName: 'Nguyen Van A',
      courseId: 100,
      courseName: 'Private Pilot License (PPL)',
      courseVersionNo: 2,
      classId: 50,
      className: 'Class PPL-02',
      overallStatus: 'Met',
      totalFlightHours: 48.5,
      totalSimulatorHours: 15.0,
      evaluatedAt: '2026-10-01T00:00:00Z',
      conditions: [
        {
          conditionCode: 'MANDATORY_SUBJECTS',
          conditionName: 'Môn học bắt buộc',
          status: 'Met',
          currentValue: 5,
          thresholdValue: 5,
          unit: 'môn',
          isMandatory: true,
          explanation: 'Tất cả 5 môn học bắt buộc đã Đạt.',
          category: 'Academic'
        },
        {
          conditionCode: 'MIN_FLIGHT_HOURS',
          conditionName: 'Giờ bay thực tế tối thiểu',
          status: 'Met',
          currentValue: 48.5,
          thresholdValue: 45.0,
          unit: 'giờ',
          isMandatory: true,
          explanation: 'Đã tích lũy 48.50 / 45.00 giờ bay thực tế hợp lệ.',
          category: 'FlightTraining'
        },
        {
          conditionCode: 'MIN_SIMULATOR_HOURS',
          conditionName: 'Giờ buồng lái mô phỏng (FSTD)',
          status: 'Met',
          currentValue: 15.0,
          thresholdValue: 10.0,
          unit: 'giờ',
          isMandatory: true,
          explanation: 'Đã tích lũy 15.00 / 10.00 giờ mô phỏng FSTD hợp lệ.',
          category: 'SimulatorTraining'
        }
      ],
      warnings: []
    };

    vi.spyOn(apiModule.api, 'get').mockResolvedValue(mockReadiness);

    renderWithLanguage(<StudentReadinessCheckSection etrId={1} enrollmentId={10} />);

    await waitFor(() => {
      expect(screen.getByText(/Kiểm tra Tính Sẵn sàng Hoàn thành Khóa học/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Private Pilot License \(PPL\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Phiên bản|Version/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/48.5/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/15\.0|15/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Đủ điều kiện hoàn thành|Eligible/i)).toBeInTheDocument();
    expect(screen.getByText(/Giờ bay thực tế tối thiểu/i)).toBeInTheDocument();
  });

  it('renders NoData and NotMet states when hours or assessments are missing', async () => {
    const mockReadiness = {
      etrCourseRecordId: 2,
      enrollmentId: 20,
      accountId: 7,
      studentName: 'Tran Van B',
      courseId: 200,
      courseName: 'Commercial Pilot License (CPL)',
      courseVersionNo: 1,
      classId: 60,
      className: 'Class CPL-01',
      overallStatus: 'NotMet',
      totalFlightHours: 0,
      totalSimulatorHours: 0,
      conditions: [
        {
          conditionCode: 'MIN_FLIGHT_HOURS',
          conditionName: 'Giờ bay thực tế tối thiểu',
          status: 'NoData',
          currentValue: 0,
          thresholdValue: 150.0,
          unit: 'giờ',
          isMandatory: true,
          explanation: 'Chưa có giờ bay thực tế hợp lệ nào được ghi nhận (0.00 / 150.00 giờ).'
        },
        {
          conditionCode: 'MIN_SIMULATOR_HOURS',
          conditionName: 'Giờ buồng lái mô phỏng (FSTD)',
          status: 'NoData',
          currentValue: 0,
          thresholdValue: 30.0,
          unit: 'giờ',
          isMandatory: true,
          explanation: 'Chưa có giờ mô phỏng FSTD hợp lệ nào được ghi nhận (0.00 / 30.00 giờ).'
        }
      ],
      warnings: []
    };

    vi.spyOn(apiModule.api, 'get').mockResolvedValue(mockReadiness);

    renderWithLanguage(<StudentReadinessCheckSection etrId={2} enrollmentId={20} />);

    await waitFor(() => {
      expect(screen.getByText(/Commercial Pilot License \(CPL\)/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Chưa đủ điều kiện hoàn thành|Not eligible|NotMet/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Chưa có dữ liệu|No data/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/0.00 \/ 150.00 giờ/i)).toBeInTheDocument();
  });

  it('displays non-blocking credential and medical warnings', async () => {
    const mockReadiness = {
      etrCourseRecordId: 3,
      enrollmentId: 30,
      accountId: 8,
      studentName: 'Le Van C',
      courseId: 300,
      courseName: 'Instrument Rating (IR)',
      courseVersionNo: 1,
      classId: 70,
      className: 'Class IR-01',
      overallStatus: 'ReviewRequired',
      totalFlightHours: 40.0,
      totalSimulatorHours: 20.0,
      conditions: [
        {
          conditionCode: 'MIN_FLIGHT_HOURS',
          conditionName: 'Giờ bay thực tế tối thiểu',
          status: 'Met',
          currentValue: 40.0,
          thresholdValue: 40.0,
          unit: 'giờ',
          isMandatory: true,
          explanation: 'Đã tích lũy 40.0 / 40.0 giờ bay.'
        }
      ],
      warnings: [
        {
          warningCode: 'CREDENTIALS_UNVERIFIED',
          message: 'Hồ sơ năng định và tài liệu văn bằng của học viên chưa được xác minh bởi Phòng Đào tạo.',
          severity: 'ReviewRequired',
          category: 'Credentials'
        },
        {
          warningCode: 'MEDICAL_EXPIRED',
          message: 'Giấy chứng nhận sức khỏe (Hạng Class 1) đã hết hạn vào ngày 15/09/2026.',
          severity: 'Warning',
          category: 'Medical'
        }
      ]
    };

    vi.spyOn(apiModule.api, 'get').mockResolvedValue(mockReadiness);

    renderWithLanguage(<StudentReadinessCheckSection etrId={3} enrollmentId={30} />);

    await waitFor(() => {
      expect(screen.getByText(/(?:Cảnh báo & Lưu ý Hồ sơ Năng định|Pilot Rating Warnings)/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Hồ sơ năng định và tài liệu văn bằng của học viên chưa được xác minh/i)).toBeInTheDocument();
    expect(screen.getByText(/Giấy chứng nhận sức khỏe \(Hạng Class 1\) đã hết hạn/i)).toBeInTheDocument();
    expect(screen.getByText(/Cần rà soát trước khi nộp/i)).toBeInTheDocument();
  });
});
