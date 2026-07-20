import '@testing-library/jest-dom'

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: (key) => localStorageMock.store[key] || null,
  setItem: (key, value) => { localStorageMock.store[key] = String(value) },
  removeItem: (key) => { delete localStorageMock.store[key] },
  clear: () => { localStorageMock.store = {} },
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock fetch
globalThis.fetch = async (url, options) => {
  const method = options?.method || 'GET'
  console.log(`[TEST FETCH] ${method} ${url}`)

  if (url.includes('/error')) {
    return { ok: false, status: 500, text: () => Promise.resolve('Server error') }
  }

  // Default mock responses
  const mockData = {
    '/api/classes': [
      { classId: 1, classCode: 'CL-01', className: 'Lớp A', courseId: 1, status: 'Đang diễn ra', subjectId: 1 },
      { classId: 2, classCode: 'CL-02', className: 'Lớp B', courseId: 1, status: 'Đang diễn ra', subjectId: 1 },
    ],
    '/api/courses': [
      { courseId: 1, courseName: 'Khóa học A' },
    ],
    '/api/Assessments': [
      { assessmentId: 1, subjectId: 1, assessmentName: 'Kiểm tra giữa kỳ' },
    ],
    '/api/sessions': [
      { sessionId: 1, classId: 1, sessionTitle: 'Buổi 1', sessionDate: '2026-07-20', location: 'Phòng A', subjectId: 1, assessmentId: 1, isConfirmed: false },
      { sessionId: 2, classId: 1, sessionTitle: 'Buổi 2', sessionDate: '2026-07-21', location: 'Phòng B', subjectId: 1, assessmentId: 1, isConfirmed: true },
    ],
    '/api/enrollments': [
      { enrollmentId: 1, accountId: 6, classId: 1, status: 'Active' },
      { enrollmentId: 2, accountId: 7, classId: 1, status: 'Active' },
    ],
    '/api/userprofiles': [
      { accountId: 6, fullName: 'Jane Student', employeeCode: 'HV001' },
      { accountId: 7, fullName: 'John Student', employeeCode: 'HV002' },
    ],
    '/api/etr': [
      { etrCourseRecordId: 1, enrollmentId: 1, status: 'InProgress', isLocked: false },
      { etrCourseRecordId: 2, enrollmentId: 2, status: 'InProgress', isLocked: false },
    ],
    '/api/AssessmentResults': [
      { assessmentResultId: 1, assessmentId: 1, accountId: 6, subjectResultId: 1, score: 85, remark: 'Good', isPublished: false, sessionId: 1 },
      { assessmentResultId: 2, assessmentId: 1, accountId: 7, subjectResultId: 2, score: 92, remark: 'Excellent', isPublished: true, sessionId: 1 },
    ],
    '/api/PracticalChecklistResults': [
      { practicalChecklistResultId: 1, sessionId: 1, subjectResultId: 1, practicalChecklistId: 1, score: 75, resultStatus: 'Passed', isPublished: false, verificationComment: 'Well done' },
      { practicalChecklistResultId: 2, sessionId: 2, subjectResultId: 2, practicalChecklistId: 1, score: 45, resultStatus: 'Failed', isPublished: true, verificationComment: 'Needs improvement' },
    ],
    '/api/attendance': [
      { attendanceRecordId: 1, sessionId: 1, accountId: 6, status: 'P', remarks: '' },
    ],
  }

  const cleanUrl = url.replace(/https?:\/\/[^/]+\/api/, '/api').split('?')[0].split('/').slice(0, 4).join('/')

  // Match mock data
  let responseData = null
  for (const [key, data] of Object.entries(mockData)) {
    if (url.includes(key)) {
      responseData = data
      break
    }
  }

  // Handle specific endpoints with IDs
  if (url.includes('/etr/1')) {
    responseData = {
      etrCourseRecordId: 1,
      enrollmentId: 1,
      status: 'InProgress',
      subjectResults: [
        { subjectResultId: 1, subjectId: 1, status: 'Pending' },
      ]
    }
  }
  if (url.includes('/etr/2')) {
    responseData = {
      etrCourseRecordId: 2,
      enrollmentId: 2,
      status: 'InProgress',
      subjectResults: [
        { subjectResultId: 2, subjectId: 1, status: 'Pending' },
      ]
    }
  }

  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(responseData || []),
    text: () => Promise.resolve(JSON.stringify(responseData || [])),
  }
}

// Mock window.alert
globalThis.alert = (msg) => { console.log(`[ALERT] ${msg}`) }

// Mock window.confirm
globalThis.confirm = () => true
