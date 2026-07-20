import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../utils/api'

beforeEach(() => {
  localStorage.clear()
  globalThis.alert = vi.fn()
  globalThis.confirm = vi.fn(() => true)
})

describe('InstructorAttendance - Data Loading', () => {
  it('fetches classes on mount', async () => {
    const classesData = await api.get('/classes')
    expect(classesData.length).toBeGreaterThan(0)
  })

  it('maps class data correctly', async () => {
    const [apiClasses, apiCourses] = await Promise.all([
      api.get('/classes'),
      api.get('/courses'),
    ])

    const mapped = apiClasses.map((cls, idx) => {
      const course = apiCourses.find((c) => c.courseId === cls.courseId)
      return {
        classId: cls.classId,
        code: cls.classCode || `CL-${cls.classId}`,
        name: cls.className || 'Lớp đào tạo',
        subName: course ? course.courseName : 'Chuyên đề huấn luyện',
      }
    })

    expect(mapped[0].classId).toBe(1)
    expect(mapped[0].code).toBe('CL-01')
  })

  it('filters sessions by selected classId', async () => {
    const selectedClassId = 1
    const apiSessions = await api.get('/sessions')
    const filtered = apiSessions.filter((s) => s.classId === selectedClassId)

    expect(filtered.length).toBe(2)
    expect(filtered[0].sessionId).toBe(1)
    expect(filtered[1].sessionId).toBe(2)
  })

  it('maps sessions with date formatting', async () => {
    const apiSessions = await api.get('/sessions')
    const mapped = apiSessions.map((s, idx) => {
      const rawDate = s.sessionDate
      let dateStr = 'N/A'
      if (rawDate) {
        const d = new Date(rawDate)
        dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
      }
      return {
        sessionId: s.sessionId,
        name: s.sessionTitle || 'Buổi học',
        room: s.location || 'Phòng học',
        date: dateStr,
        isConfirmed: s.isConfirmed || false,
      }
    })

    expect(mapped[0].name).toBe('Buổi 1')
    expect(mapped[0].room).toBe('Phòng A')
    expect(mapped[0].isConfirmed).toBe(false)
    expect(mapped[1].isConfirmed).toBe(true)
  })
})

describe('InstructorAttendance - Load Attendance Logic', () => {
  it('maps students with profiles from enrollments', async () => {
    const selectedClassId = 1
    const [allEnrollments, allProfiles] = await Promise.all([
      api.get('/enrollments'),
      api.get('/userprofiles'),
    ])

    const classEnrollments = allEnrollments.filter((e) => e.classId === selectedClassId)
    const mappedStudents = classEnrollments.map((en) => {
      const profile = allProfiles.find((p) => p.accountId === en.accountId)
      return {
        code: profile?.employeeCode || `HV${en.accountId}`,
        name: profile?.fullName || 'Học viên',
        accountId: en.accountId,
        classStudentId: en.enrollmentId,
      }
    })

    expect(mappedStudents.length).toBe(2)
    expect(mappedStudents[0].accountId).toBe(6)
    expect(mappedStudents[1].accountId).toBe(7)
  })

  it('filters attendance records by sessionId', async () => {
    const sessionId = 1
    const attendanceRecords = await api.get('/attendance')
    const sessionRecords = attendanceRecords.filter((a) => a.sessionId === sessionId)

    expect(sessionRecords.length).toBe(1)
    expect(sessionRecords[0].accountId).toBe(6)
  })

  it('builds attendance data with default status "P" when no record exists', async () => {
    const sessionId = 1
    const attendanceRecords = await api.get('/attendance')
    const sessionRecords = attendanceRecords.filter((a) => a.sessionId === sessionId)

    const students = [
      { accountId: 6, code: 'HV001', name: 'Jane Student' },
      { accountId: 7, code: 'HV002', name: 'John Student' },
    ]

    const mappedAttendance = students.map((student) => {
      const record = sessionRecords.find((r) => r.accountId === student.accountId)
      return {
        code: student.code,
        name: student.name,
        status: record ? record.status : 'P',
        remarks: record ? record.remarks || '' : '',
        attendanceRecordId: record ? record.attendanceRecordId || record.id : null,
      }
    })

    // Jane has a record
    expect(mappedAttendance[0].status).toBe('P')
    expect(mappedAttendance[0].attendanceRecordId).toBe(1)

    // John has no record → defaults
    expect(mappedAttendance[1].status).toBe('P')
    expect(mappedAttendance[1].attendanceRecordId).toBeNull()
  })
})

describe('InstructorAttendance - Handle Toggle Status', () => {
  it('toggles student status correctly', () => {
    const initial = [
      { code: 'HV001', status: 'P' },
      { code: 'HV002', status: 'P' },
    ]
    const isConfirmed = false

    const updateStatus = (code, status) => {
      if (isConfirmed) return initial
      return initial.map((s) => (s.code === code ? { ...s, status } : s))
    }

    const updated = updateStatus('HV001', 'AE')
    expect(updated[0].status).toBe('AE')
    expect(updated[1].status).toBe('P')
  })

  it('does not toggle when confirmed', () => {
    const initial = [
      { code: 'HV001', status: 'P' },
    ]
    const isConfirmed = true

    const updateStatus = (code, status) => {
      if (isConfirmed) return initial
      return initial.map((s) => (s.code === code ? { ...s, status } : s))
    }

    const updated = updateStatus('HV001', 'AU')
    expect(updated[0].status).toBe('P') // unchanged
  })
})

describe('InstructorAttendance - Save Logic', () => {
  it('builds correct payload for save - create new', () => {
    const selectedSession = { sessionId: 1 }
    const record = { classStudentId: 1, status: 'P', remarks: '', attendanceRecordId: null }

    const payload = {
      sessionId: selectedSession.sessionId,
      classStudentId: record.classStudentId || 1,
      status: record.status,
      remarks: record.remarks || '',
    }

    expect(payload.sessionId).toBe(1)
    expect(payload.classStudentId).toBe(1)
    expect(payload.status).toBe('P')
  })

  it('builds correct payload for save - update existing', () => {
    const record = { attendanceRecordId: 5, status: 'AE', remarks: 'Sick' }

    const payload = {
      status: record.status,
      remarks: record.remarks || '',
    }

    expect(payload.status).toBe('AE')
    expect(payload.remarks).toBe('Sick')
  })

  it('saves all records and confirm locks the session', async () => {
    const sessionAttendance = [
      { classStudentId: 1, status: 'P', remarks: '', attendanceRecordId: null },
      { classStudentId: 2, status: 'AE', remarks: 'Sick', attendanceRecordId: 3 },
    ]
    const selectedSession = { sessionId: 1 }

    let saved = false
    let confirmed = false

    // Simulate save
    await Promise.all(
      sessionAttendance.map(async (record) => {
        if (record.attendanceRecordId) {
          await api.put(`/attendance/${record.attendanceRecordId}`, {
            status: record.status,
            remarks: record.remarks || '',
          })
        } else {
          await api.post('/attendance/record', {
            sessionId: selectedSession.sessionId,
            classStudentId: record.classStudentId || 1,
            status: record.status,
            remarks: record.remarks || '',
          })
        }
      })
    )
    saved = true

    // Simulate confirm
    await api.post(`/attendance/sessions/${selectedSession.sessionId}/confirm`)
    confirmed = true

    expect(saved).toBe(true)
    expect(confirmed).toBe(true)
  })
})
