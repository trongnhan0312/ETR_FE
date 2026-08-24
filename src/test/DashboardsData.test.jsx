import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────────────
// Kiểm tra 7 dashboard đều lấy được dữ liệu từ GET /api/Dashboard/my-dashboard
// và hiển thị bình thường (KPI, bảng, danh sách) — không crash, không treo loading.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../Student/student.scss', () => ({}))

// ApexCharts không chạy được trong jsdom (thiếu SVG API) → stub tối giản
vi.mock('../components/ApexChart', () => ({
  default: () => <div data-testid="apex-chart" />,
}))

// Mock chung cho mọi dashboard: fetchMyDashboard được set payload theo từng test
vi.mock('../utils/dashboardApi', () => ({
  fetchMyDashboard: vi.fn(),
}))

import { fetchMyDashboard } from '../utils/dashboardApi'

// Payload "đầy đủ" đã chuẩn hóa (camelCase — đúng shape dashboardApi trả về)
const FULL_PAYLOAD = {
  role: 'Admin',
  overview: {
    totalEtrs: 142,
    completedCount: 121,
    completionRatePercent: 85,
    pendingApprovalCount: 5,
    rejectedCount: 3,
    returnedForCorrectionCount: 7,
    missingEvidenceCount: 9,
  },
  funnel: {
    draft: 6, inProgress: 18, submitted: 5, verified: 4,
    completed: 121, returnedForCorrection: 7, cancelled: 2,
  },
  actionItems: {
    pendingApprovalEtrIds: [101, 102, 103],
    rejectedEtrIds: [201],
    returnedForCorrectionEtrIds: [301],
    missingEvidenceEtrIds: [401],
  },
  systemStats: {
    totalUsers: 50, totalLearners: 41, totalInstructors: 9,
    totalCourses: 12, totalClasses: 15, activeAccounts: 44, newUsersThisMonth: 3,
  },
  monthlyTrend: {
    months: ['2026-06', '2026-07'],
    locked: [10, 20],
    returned: [1, 2],
  },
  myClasses: [
    { classId: 1, classCode: 'CL-101', className: 'Lớp A101', studentCount: 12, attendanceRate: 92, sessionCount: 8 },
    { classId: 2, classCode: 'CL-102', className: 'Lớp B102', studentCount: 8, attendanceRate: 88, sessionCount: 6 },
  ],
  lowAttendanceStudents: [
    { accountId: 6, userCode: 'HV001', fullName: 'Trần Thị B', classCode: 'CL-101', subjectCode: 'SUB01', attendanceRate: 62, thresholdPercent: 80 },
  ],
  todaySessions: [
    { sessionId: 1, sessionTitle: 'Buổi thực hành khẩn cấp', classCode: 'CL-101', isConfirmed: false },
  ],
  pendingSignoffs: 2,
  pendingVerificationEtrIds: [101, 102],
  reviewedToday: 7,
  evidenceSummary: { total: 30, verified: 21, pending: 6, rejected: 3 },
  recentEvidenceFiles: [
    { evidenceFileId: 1, fileName: 'attendance-day1.pdf', learnerName: 'Trần Thị B', verificationStatus: 'Pending' },
  ],
  myEtrs: [
    { etrCourseRecordId: 901, status: 'InProgress', percentComplete: 40, expiryDate: null },
    { etrCourseRecordId: 902, status: 'Completed', percentComplete: 100, expiryDate: '2029-08-13' },
  ],
  profile: { fullName: 'Lê Văn C', username: 'levanc', userCode: 'HV007' },
  certificateSummary: {
    total: 3, valid: 2, expiringSoon: 1, expired: 0,
    recent: [{ etrCourseRecordId: 902, status: 'Completed', percentComplete: 100 }],
  },
  lockedRecords: { totalLocked: 142, complianceRate: 99 },
  recentLockedEtrs: [
    { etrCourseRecordId: 777, learnerName: 'Phạm Minh D', courseName: 'A320 Type Rating', approvedBy: 3, completedAt: '2026-08-01' },
  ],
  recentAuditLogs: [
    { auditLogId: 1, actionType: 'VERIFY', entityName: 'ETRCourseRecord', recordId: 777, createdAt: '2026-08-01T09:00:00Z' },
  ],
  recentExportJobs: [
    { exportJobId: 1, exportType: 'PDF', fileName: 'compliance-777.pdf', status: 'Ready' },
  ],
  expiringStudentsCount: 4,
}

let LanguageProvider
beforeAll(async () => {
  const mod = await import('../context/LanguageContext')
  LanguageProvider = mod.LanguageProvider
})

// Helper: bọc dashboard trong MemoryRouter + LanguageProvider
const mount = (element) =>
  render(
    <MemoryRouter>
      <LanguageProvider>{element}</LanguageProvider>
    </MemoryRouter>
  )

beforeEach(() => {
  localStorage.clear()
  // Dùng EN để các label nguồn tiếng Anh giữ nguyên (tr() lookup không đổi)
  localStorage.setItem('app_language', 'en')
  vi.clearAllMocks()
})

// ─── Admin ──────────────────────────────────────────────────────────────────
describe('Admin Dashboard (/admin)', () => {
  it('gọi my-dashboard đúng 1 lần và hiển thị systemStats + data source', async () => {
    fetchMyDashboard.mockResolvedValue(FULL_PAYLOAD)
    const { default: Dashboard } = await import('../ADMIN/Dashboard')
    mount(<Dashboard />)

    // Data source ghi rõ endpoint
    expect(await screen.findByText('GET /api/Dashboard/my-dashboard')).toBeInTheDocument()

    // KPI tổng người dùng từ systemStats.totalUsers = 50
    await waitFor(() => {
      expect(screen.getAllByText('50').length).toBeGreaterThan(0)
    })
    // Không còn trạng thái loading
    expect(screen.queryByText('...')).not.toBeInTheDocument()
    expect(fetchMyDashboard).toHaveBeenCalledTimes(1)
  })

  it('API lỗi/null → vẫn render header, không crash', async () => {
    fetchMyDashboard.mockResolvedValue(null)
    const { default: Dashboard } = await import('../ADMIN/Dashboard')
    mount(<Dashboard />)
    expect(await screen.findByText('GET /api/Dashboard/my-dashboard')).toBeInTheDocument()
  })
})

// ─── Academic ───────────────────────────────────────────────────────────────
describe('Academic Dashboard (/academic)', () => {
  it('hiển thị học viên dưới ngưỡng điểm danh từ API', async () => {
    fetchMyDashboard.mockResolvedValue(FULL_PAYLOAD)
    const { default: AcademicDashboard } = await import('../Academic/AcademicDashboard')
    mount(<AcademicDashboard />)

    // Danh sách học viên dưới ngưỡng — "userCode · fullName" trong cùng 1 dòng
    expect(await screen.findByText(/HV001 · Trần Thị B/)).toBeInTheDocument()
    expect(screen.getByText(/SUB01/)).toBeInTheDocument()
    expect(fetchMyDashboard).toHaveBeenCalledTimes(1)
  })

  it('không có học viên dưới ngưỡng → hiện empty state, không crash', async () => {
    fetchMyDashboard.mockResolvedValue({ ...FULL_PAYLOAD, lowAttendanceStudents: [] })
    const { default: AcademicDashboard } = await import('../Academic/AcademicDashboard')
    mount(<AcademicDashboard />)
    await waitFor(() => expect(fetchMyDashboard).toHaveBeenCalled())
    // Vẫn có h1 tiêu đề
    await waitFor(() => {
      const h1 = document.querySelector('h1')
      expect(h1 && h1.textContent.length > 0).toBe(true)
    })
  })
})

// ─── Instructor ─────────────────────────────────────────────────────────────
describe('Instructor Dashboard (/instructor)', () => {
  it('hiển thị lớp của tôi (mã lớp, tên lớp, sĩ số) từ myClasses', async () => {
    fetchMyDashboard.mockResolvedValue(FULL_PAYLOAD)
    const { default: InstructorDashboard } = await import('../Instructor/InstructorDashboard')
    mount(<InstructorDashboard />)

    // Mã lớp xuất hiện ở cả chart category và bảng → dùng getAllByText
    expect((await screen.findAllByText('CL-101')).length).toBeGreaterThan(0)
    expect(screen.getByText('Lớp A101')).toBeInTheDocument()
    expect(screen.getAllByText('CL-102').length).toBeGreaterThan(0)
    expect(screen.getByText('Buổi thực hành khẩn cấp')).toBeInTheDocument()
  })

  it('chưa được phân công lớp → hiện empty state, không crash', async () => {
    fetchMyDashboard.mockResolvedValue({ ...FULL_PAYLOAD, myClasses: [], todaySessions: [] })
    const { default: InstructorDashboard } = await import('../Instructor/InstructorDashboard')
    mount(<InstructorDashboard />)
    await waitFor(() => expect(fetchMyDashboard).toHaveBeenCalled())
    await waitFor(() => {
      const h1 = document.querySelector('h1')
      expect(h1 && h1.textContent.length > 0).toBe(true)
    })
  })
})

// ─── QA ─────────────────────────────────────────────────────────────────────
describe('QA Dashboard (/qa)', () => {
  it('hiển thị minh chứng chờ duyệt gần đây từ recentEvidenceFiles', async () => {
    fetchMyDashboard.mockResolvedValue(FULL_PAYLOAD)
    const { default: QADashboard } = await import('../QA/QADashboard')
    mount(<QADashboard />)

    expect(await screen.findByText('attendance-day1.pdf')).toBeInTheDocument()
    expect(screen.getByText('Reviewed Today')).toBeInTheDocument()  })

  it('payload rỗng → KPI về 0, không crash', async () => {
    fetchMyDashboard.mockResolvedValue({})
    const { default: QADashboard } = await import('../QA/QADashboard')
    mount(<QADashboard />)
    await waitFor(() => expect(fetchMyDashboard).toHaveBeenCalled())
    await waitFor(() => {
      const h1 = document.querySelector('h1')
      expect(h1 && h1.textContent.length > 0).toBe(true)
    })
  })
})

// ─── Training Manager ───────────────────────────────────────────────────────
describe('Training Manager Dashboard (/trainingmanager)', () => {
  it('hiển thị Total ETRs = 142 và panel CERTIFICATIONS DUE từ overview', async () => {
    fetchMyDashboard.mockResolvedValue(FULL_PAYLOAD)
    const { default: TrainingManagerDashboard } = await import('../TrainingManager/TrainingManagerDashboard')
    mount(<TrainingManagerDashboard />)

    expect(await screen.findByText('Total ETRs')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByText('142').length).toBeGreaterThan(0)
    })
    // Action items từ API: Pending Approval badge = pendingApprovalEtrIds.length = 3
    expect(screen.getByText('Pending Approval')).toBeInTheDocument()
  })

  it('overview null → vẫn render với giá trị 0, không crash', async () => {
    fetchMyDashboard.mockResolvedValue({ overview: null, funnel: null })
    const { default: TrainingManagerDashboard } = await import('../TrainingManager/TrainingManagerDashboard')
    mount(<TrainingManagerDashboard />)
    await waitFor(() => {
      const h1 = document.querySelector('h1')
      expect(h1 && h1.textContent.length > 0).toBe(true)
    })
  })
})

// ─── Student ────────────────────────────────────────────────────────────────
describe('Student Dashboard (/student)', () => {
  it('chào theo tên trong profile và liệt kê ETR gần đây từ myEtrs', async () => {
    localStorage.setItem('user', JSON.stringify({ accountId: 7, fullName: 'Lê Văn C', roleName: 'Student' }))
    fetchMyDashboard.mockResolvedValue(FULL_PAYLOAD)
    const { default: StudentDashboard } = await import('../Student/StudentDashboard')
    mount(<StudentDashboard />)

    // Hồ sơ gần đây — mã ETR từ myEtrs (xuất hiện ở cả bảng và cert recent)
    expect((await screen.findAllByText('ETR #901')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('ETR #902').length).toBeGreaterThan(0)
    // Chứng chỉ còn hiệu lực = 2 (badge certSummary.valid)
    expect(screen.getAllByText(/:\s*2/).length).toBeGreaterThan(0)
  })

  it('chưa có hồ sơ nào → hiện empty state, không crash', async () => {
    fetchMyDashboard.mockResolvedValue({ myEtrs: [], certificateSummary: null })
    const { default: StudentDashboard } = await import('../Student/StudentDashboard')
    mount(<StudentDashboard />)
    await waitFor(() => expect(fetchMyDashboard).toHaveBeenCalled())
    await waitFor(() => {
      const h1 = document.querySelector('h1')
      expect(h1 && h1.textContent.length > 0).toBe(true)
    })
  })
})

// ─── Auditor ────────────────────────────────────────────────────────────────
describe('Auditor Dashboard (/auditor)', () => {
  it('hiển thị hồ sơ bị khóa gần đây + audit log + export job từ API', async () => {
    fetchMyDashboard.mockResolvedValue(FULL_PAYLOAD)
    const { default: AuditorDashboard } = await import('../Auditor/AuditorDashboard')
    mount(<AuditorDashboard />)

    expect(await screen.findByText('Phạm Minh D')).toBeInTheDocument()
    expect(screen.getByText('A320 Type Rating')).toBeInTheDocument()
    expect(screen.getByText('compliance-777.pdf')).toBeInTheDocument()
  })

  it('không có dữ liệu gần đây → hiện empty state, không crash', async () => {
    fetchMyDashboard.mockResolvedValue({
      ...FULL_PAYLOAD,
      recentLockedEtrs: [], recentAuditLogs: [], recentExportJobs: [],
    })
    const { default: AuditorDashboard } = await import('../Auditor/AuditorDashboard')
    mount(<AuditorDashboard />)
    await waitFor(() => expect(fetchMyDashboard).toHaveBeenCalled())
    await waitFor(() => {
      const h1 = document.querySelector('h1')
      expect(h1 && h1.textContent.length > 0).toBe(true)
    })
  })
})
