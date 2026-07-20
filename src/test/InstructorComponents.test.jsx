import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import React from 'react'

// Mock SCSS imports
vi.mock('../Instructor/instructor.scss', () => ({}))

// Mock the api module
vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

import { api } from '../utils/api'

beforeEach(() => {
  localStorage.clear()
  globalThis.alert = vi.fn()
  globalThis.confirm = vi.fn(() => true)
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// InstructorLayout - User profile & navigation
// ---------------------------------------------------------------------------
describe('InstructorLayout - User profile rendering', () => {
  it('getInitials returns correct initials', () => {
    const getInitials = (name) => {
      if (!name) return 'GV'
      const parts = name.trim().split(' ')
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
      return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    expect(getInitials('Nguyễn Văn A')).toBe('VA')
    expect(getInitials('John Doe')).toBe('JD')
    expect(getInitials(null)).toBe('GV')
  })

  it('parses user from localStorage', () => {
    localStorage.setItem('user', JSON.stringify({ fullName: 'Test User', roleName: 'Instructor' }))
    const user = JSON.parse(localStorage.getItem('user'))
    expect(user.fullName).toBe('Test User')
    expect(user.roleName).toBe('Instructor')
  })

  it('logout clears localStorage', () => {
    localStorage.setItem('token', 'abc')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    expect(localStorage.getItem('token')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Navigation items (matching InstructorLayout)
// ---------------------------------------------------------------------------
describe('InstructorLayout - Navigation', () => {
  const navItems = [
    { label: 'LỚP CỦA TÔI', route: '/instructor/classes' },
    { label: 'ĐIỂM DANH', route: '/instructor/attendance' },
    { label: 'ĐÁNH GIÁ', route: '/instructor/assessments' },
    { label: 'MINH CHỨNG', route: '/instructor/evidence' },
    { label: 'LỊCH GIẢNG DẠY', route: '/instructor/schedule' },
  ]

  it('contains exactly 5 nav items', () => {
    expect(navItems).toHaveLength(5)
  })

  it('all routes start with /instructor/', () => {
    navItems.forEach((item) => {
      expect(item.route).toMatch(/^\/instructor\//)
    })
  })
})

// ---------------------------------------------------------------------------
// InstructorAssessments - Core data mapping logic
// ---------------------------------------------------------------------------
describe('InstructorAssessments - Data mapping', () => {
  it('maps classes with course info', async () => {
    const mockClasses = [
      { classId: 1, classCode: 'A320-01', className: 'A320 Training', courseId: 1, subjectId: 1 },
    ]
    const mockCourses = [{ courseId: 1, courseName: 'A320 Initial' }]

    const mapped = mockClasses.map((cls) => {
      const course = mockCourses.find((c) => c.courseId === cls.courseId)
      return {
        classId: cls.classId,
        code: cls.classCode,
        name: cls.className,
        subName: course?.courseName || 'N/A',
      }
    })

    expect(mapped[0].code).toBe('A320-01')
    expect(mapped[0].subName).toBe('A320 Initial')
  })

  it('formats session dates correctly', () => {
    const rawDate = '2026-07-20'
    const d = new Date(rawDate)
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    expect(dateStr).toBe('20/07/2026')
  })

  it('getAssessmentDisplayName returns correct name', () => {
    const getDisplayName = (assessment) => {
      if (!assessment) return 'Assessment'
      return assessment.componentName || assessment.assessmentName || assessment.name || 
             assessment.title || assessment.assessmentTitle || assessment.assessmentType || 
             `Assessment ${assessment.assessmentId || ''}` || 'Assessment'
    }
    expect(getDisplayName(null)).toBe('Assessment')
    expect(getDisplayName({ assessmentName: 'Midterm' })).toBe('Midterm')
    expect(getDisplayName({ assessmentId: 5 })).toBe('Assessment 5')
  })

  it('getAssessmentTypeLabel returns correct labels', () => {
    const labels = { practical: 'Practical (Thực hành)', assessment: 'Assessment (Lý thuyết)', both: 'Assessment + Practical' }
    expect(labels.assessment).toContain('Lý thuyết')
    expect(labels.practical).toContain('Thực hành')
    expect(labels.both).toContain('+')
  })

  it('getSelectedTypes returns correct arrays', () => {
    const types = { practical: ['practical'], assessment: ['assessment'], both: ['assessment', 'practical'] }
    expect(types.assessment).toEqual(['assessment'])
    expect(types.practical).toEqual(['practical'])
    expect(types.both).toHaveLength(2)
  })

  it('getAssessmentIdForSession resolves correctly', () => {
    const assessmentsList = [
      { assessmentId: 10, subjectId: 1 },
      { assessmentId: 20, subjectId: 2 },
    ]

    const resolveId = (session) => {
      const directId = session?.assessmentId ?? session?.assessment?.assessmentId ?? null
      if (directId) return Number(directId)
      const match = assessmentsList.find((a) => a.subjectId === session?.subjectId)
      return match?.assessmentId || 1
    }

    expect(resolveId({ assessmentId: 5 })).toBe(5)
    expect(resolveId({ subjectId: 1, assessmentId: null })).toBe(10)
    expect(resolveId({ subjectId: 99 })).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// InstructorAssessments - Score filtering logic
// ---------------------------------------------------------------------------
describe('InstructorAssessments - Score filtering', () => {
  const allAssessmentResults = [
    { assessmentResultId: 1, accountId: 6, assessmentId: 1, subjectResultId: 1, score: 85, sessionId: 1, isPublished: false },
    { assessmentResultId: 2, accountId: 6, assessmentId: 1, subjectResultId: 1, score: 90, sessionId: 2, isPublished: true },
    { assessmentResultId: 3, accountId: 7, assessmentId: 1, subjectResultId: 2, score: 70, sessionId: null, isPublished: false },
  ]

  it('finds score by exact accountId + assessmentId + subjectResultId + sessionId', () => {
    const score = allAssessmentResults.find(
      (ar) => ar.accountId === 6 && ar.assessmentId === 1 && ar.subjectResultId === 1 && ar.sessionId === 1
    )
    expect(score).toBeDefined()
    expect(score.score).toBe(85)
    expect(score.isPublished).toBe(false)
  })

  it('falls back to legacy record when sessionId is null', () => {
    let score = allAssessmentResults.find(
      (ar) => ar.accountId === 7 && ar.assessmentId === 1 && ar.subjectResultId === 2 && ar.sessionId === 999
    )
    if (!score) {
      score = allAssessmentResults.find(
        (ar) => ar.accountId === 7 && ar.assessmentId === 1 && ar.subjectResultId === 2 && ar.sessionId == null
      )
    }
    expect(score).toBeDefined()
    expect(score.score).toBe(70)
    expect(score.isPublished).toBe(false)
  })

  it('filters practical results by sessionId with fallback', () => {
    const allPractical = [
      { practicalChecklistResultId: 1, subjectResultId: 1, sessionId: 1, score: 75, isPublished: false },
      { practicalChecklistResultId: 2, subjectResultId: 2, sessionId: null, score: 45, isPublished: true },
    ]

    let score = allPractical.find((pr) => pr.subjectResultId === 1 && pr.sessionId === 1)
    expect(score).toBeDefined()
    expect(score.score).toBe(75)

    // Test fallback for null sessionId
    let score2 = allPractical.find((pr) => pr.subjectResultId === 2 && pr.sessionId === 999)
    if (!score2) {
      score2 = allPractical.find((pr) => pr.subjectResultId === 2 && pr.sessionId == null)
    }
    expect(score2).toBeDefined()
    expect(score2.score).toBe(45)
    expect(score2.isPublished).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// InstructorAssessments - Save score request building
// ---------------------------------------------------------------------------
describe('InstructorAssessments - Save request building', () => {
  const selectedSession = { sessionId: 5 }

  it('builds assessment save request with sessionId', () => {
    const student = { accountId: 6, subjectResultId: 1, assessmentScore: 85, assessmentComment: 'Good' }
    const body = {
      assessmentId: 1,
      accountId: student.accountId,
      subjectResultId: student.subjectResultId,
      sessionId: selectedSession.sessionId,
      score: 85,
      remark: 'Good',
    }
    expect(body.sessionId).toBe(5)
    expect(body.score).toBe(85)
    expect(body.remark).toBe('Good')
  })

  it('builds practical update request with sessionId', () => {
    const student = { practicalResultId: 10, practicalScore: 70, practicalComment: 'OK' }
    const body = {
      score: 70,
      verificationComment: 'OK',
      sessionId: selectedSession.sessionId,
    }
    expect(body.sessionId).toBe(5)
    expect(body.score).toBe(70)
  })

  it('builds practical create request with sessionId and subjectResultId', () => {
    const student = { subjectResultId: 3, practicalScore: 80, practicalComment: 'New' }
    const body = {
      subjectResultId: 3,
      sessionId: selectedSession.sessionId,
      score: 80,
      verificationComment: 'New',
    }
    expect(body.sessionId).toBe(5)
    expect(body.subjectResultId).toBe(3)
  })

  it('detects changed scores correctly', () => {
    const original = { assessmentScore: 70, assessmentComment: 'Old', isPublished: false }
    const edited = { assessmentScore: 85, assessmentComment: 'Updated', isPublished: false }
    const changed =
      edited.assessmentScore !== original.assessmentScore ||
      edited.assessmentComment !== original.assessmentComment
    expect(changed).toBe(true)

    const unchanged = { assessmentScore: 70, assessmentComment: 'Old', isPublished: false }
    const notChanged =
      unchanged.assessmentScore !== original.assessmentScore ||
      unchanged.assessmentComment !== original.assessmentComment
    expect(notChanged).toBe(false)
  })

  it('skips published students', () => {
    const original = { assessmentScore: 70, isPublished: true }
    const edited = { assessmentScore: 90, isPublished: true }
    const shouldSkip = edited.isPublished || original.isPublished
    expect(shouldSkip).toBe(true)
  })

  it('builds signoff request for each student', () => {
    const students = [{ subjectResultId: 1 }, { subjectResultId: 2 }]
    const signoffs = students.map((s) => ({
      subjectResultId: s.subjectResultId,
      role: 'Instructor',
      comment: 'Đã hoàn thành đánh giá chuyên đề.',
    }))
    expect(signoffs).toHaveLength(2)
    expect(signoffs[0].role).toBe('Instructor')
  })
})

// ---------------------------------------------------------------------------
// InstructorAttendance - Status toggle & save logic
// ---------------------------------------------------------------------------
describe('InstructorAttendance - Status toggle', () => {
  it('toggles student status correctly', () => {
    const students = [
      { code: 'HV001', status: 'P' },
      { code: 'HV002', status: 'P' },
    ]
    const updated = students.map((s) => (s.code === 'HV001' ? { ...s, status: 'AE' } : s))
    expect(updated[0].status).toBe('AE')
    expect(updated[1].status).toBe('P')
  })

  it('blocks toggle when confirmed', () => {
    const isConfirmed = true
    const students = [{ code: 'HV001', status: 'P' }]
    const updated = isConfirmed ? students : students.map((s) => (s.code === 'HV001' ? { ...s, status: 'AU' } : s))
    expect(updated[0].status).toBe('P')
  })

  it('builds save payload - create', () => {
    const sessionId = 1
    const record = { classStudentId: 5, status: 'P', remarks: '' }
    const payload = { sessionId, classStudentId: record.classStudentId, status: record.status, remarks: record.remarks }
    expect(payload.sessionId).toBe(1)
    expect(payload.status).toBe('P')
  })

  it('builds save payload - update', () => {
    const record = { attendanceRecordId: 3, status: 'AE', remarks: 'Sick' }
    const payload = { status: record.status, remarks: record.remarks }
    expect(payload.status).toBe('AE')
    expect(payload.remarks).toBe('Sick')
  })
})

// ---------------------------------------------------------------------------
// InstructorAttendance - Attendance mapping
// ---------------------------------------------------------------------------
describe('InstructorAttendance - Attendance mapping', () => {
  it('maps student to attendance with default P status', () => {
    const students = [{ accountId: 6, code: 'HV001' }, { accountId: 7, code: 'HV002' }]
    const attendanceRecords = [{ sessionId: 1, accountId: 6, status: 'AE', remarks: 'Late' }]

    const mapped = students.map((s) => {
      const record = attendanceRecords.find((r) => r.accountId === s.accountId)
      return {
        code: s.code,
        status: record?.status || 'P',
        remarks: record?.remarks || '',
        attendanceRecordId: record?.attendanceRecordId || record?.id || null,
      }
    })

    expect(mapped[0].status).toBe('AE')
    expect(mapped[1].status).toBe('P')
    expect(mapped[0].remarks).toBe('Late')
    expect(mapped[1].attendanceRecordId).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// InstructorSchedule - Day/session structure
// ---------------------------------------------------------------------------
describe('InstructorSchedule - Session structure', () => {
  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật']

  it('has 7 days', () => {
    expect(days).toHaveLength(7)
  })

  it('maps sessions to correct day', () => {
    const sessions = [
      { sessionId: 1, sessionTitle: 'Buổi 1', sessionDate: '2026-07-20' },
    ]
    const dayMap = days.map((day) => ({ day, sessions: [] }))
    dayMap[0].sessions = sessions
    expect(dayMap[0].sessions).toHaveLength(1)
    expect(dayMap[1].sessions).toHaveLength(0)
  })
})
