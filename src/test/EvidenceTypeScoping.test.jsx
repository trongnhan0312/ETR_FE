import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import InstructorEvidence from '../Instructor/InstructorEvidence'
import { LanguageProvider } from '../context/LanguageContext'
import { api } from '../utils/api'

vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../utils/cloudinary', () => ({
  uploadToCloudinary: vi.fn(),
  validateEvidenceFile: vi.fn(),
}))

vi.mock('../components/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    ToastContainer: () => null,
  }),
}))

describe('Evidence Type Scoping & Credential Separation', () => {
  const mockEvidenceTypes = [
    {
      evidenceTypeId: 1,
      typeName: 'Aircraft Maintenance Log (AML)',
      typeCode: 'AML',
      departmentScope: 'ENG',
      subjectTypeScope: 'Practical',
      isMandatory: false,
      category: 'SubjectEvidence',
    },
    {
      evidenceTypeId: 2,
      typeName: 'Flight Simulator Session Log',
      typeCode: 'SIM_LOG',
      departmentScope: 'FC',
      subjectTypeScope: 'Practical',
      isMandatory: false,
      category: 'SubjectEvidence',
    },
    {
      evidenceTypeId: 3,
      typeName: 'Theory Exam Score Sheet',
      typeCode: 'EXAM_SCORE',
      departmentScope: 'ALL',
      subjectTypeScope: 'Theory',
      isMandatory: false,
      category: 'SubjectEvidence',
    },
    {
      evidenceTypeId: 4,
      typeName: 'Medical & English Proficiency',
      typeCode: 'MED_ELP',
      departmentScope: 'ALL',
      subjectTypeScope: 'ALL',
      isMandatory: false,
      category: 'Credential',
    },
    {
      evidenceTypeId: 19,
      typeName: 'Minh chứng khác / Tài liệu bổ trợ',
      typeCode: 'OTHER_EVIDENCE',
      departmentScope: 'ALL',
      subjectTypeScope: 'ALL',
      isMandatory: false,
      category: 'SubjectEvidence',
    },
  ]

  const mockClasses = [
    { classId: 101, classCode: 'CL-PILOT-01', className: 'Lớp Phi Công 01', courseId: 1 },
  ]

  const mockCourses = [
    { courseId: 1, courseName: 'Khóa Đào Tạo Phi Công Thương Mại', departmentId: 1 },
  ]

  const mockSubjects = [
    { subjectId: 10, subjectCode: 'SIM101', subjectName: 'Huấn luyện buồng lái mô phỏng', subjectType: 'Practical' },
  ]

  const mockEnrollments = [
    { enrollmentId: 501, accountId: 1001, classId: 101 },
  ]

  const mockLearners = [
    { accountId: 1001, fullName: 'Nguyễn Văn Phi Công', departmentId: 1, departmentCode: 'FC', departmentName: 'Flight Crew' },
  ]

  const mockEtrs = [
    { etrCourseRecordId: 9001, enrollmentId: 501 },
  ]

  const mockEtrDetails = {
    etrCourseRecordId: 9001,
    enrollmentId: 501,
    subjectResults: [
      { subjectResultId: 888, subjectId: 10, status: 'IN_PROGRESS' },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('app_language', 'vi')

    api.get.mockImplementation((url) => {
      if (url === '/classes') return Promise.resolve(mockClasses)
      if (url === '/courses') return Promise.resolve(mockCourses)
      if (url === '/EvidenceTypes') return Promise.resolve(mockEvidenceTypes)
      if (url === '/subjects') return Promise.resolve(mockSubjects)
      if (url === '/enrollments') return Promise.resolve(mockEnrollments)
      if (url === '/UserProfiles/learners') return Promise.resolve(mockLearners)
      if (url === '/etr') return Promise.resolve(mockEtrs)
      if (url === '/Evidences') return Promise.resolve([])
      if (url === '/etr/9001') return Promise.resolve(mockEtrDetails)
      return Promise.resolve([])
    })
  })

  it('tách hoàn toàn giấy tờ sức khỏe/ELP (MED_ELP, Credential) khỏi dropdown upload minh chứng môn học', async () => {
    render(
      <LanguageProvider>
        <InstructorEvidence />
      </LanguageProvider>
    )

    await waitFor(() => {
      expect(screen.queryByText('Đang tải loại bằng chứng...')).toBeNull()
    })

    // Loại MED_ELP không bao giờ xuất hiện trong select
    const medElpOption = screen.queryByText('Medical & English Proficiency')
    expect(medElpOption).toBeNull()
  })

  it('lọc danh mục loại minh chứng phù hợp với chuyên ngành FC và môn Practical', async () => {
    render(
      <LanguageProvider>
        <InstructorEvidence />
      </LanguageProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Flight Simulator Session Log')).toBeTruthy()
    })

    // Môn Practical của phi công không hiển thị AML (bảo dưỡng kỹ thuật)
    expect(screen.queryByText('Aircraft Maintenance Log (AML)')).toBeNull()

    // Minh chứng khác luôn xuất hiện
    expect(screen.getByText('Minh chứng khác / Tài liệu bổ trợ')).toBeTruthy()
  })

  it('lọc danh mục loại minh chứng phù hợp với học viên Kỹ thuật (ENG)', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/classes') return Promise.resolve(mockClasses)
      if (url === '/courses') return Promise.resolve(mockCourses)
      if (url === '/EvidenceTypes') return Promise.resolve([
        ...mockEvidenceTypes,
        {
          evidenceTypeId: 10,
          typeName: 'Pre-flight Walkaround Checklist',
          typeCode: 'WALKAROUND',
          departmentScope: 'ALL',
          subjectTypeScope: 'Practical',
          isMandatory: true,
          description: 'Bắt buộc đối với mọi môn thực hành an toàn',
          category: 'SubjectEvidence',
        }
      ])
      if (url === '/subjects') return Promise.resolve(mockSubjects)
      if (url === '/enrollments') return Promise.resolve(mockEnrollments)
      if (url === '/UserProfiles/learners') return Promise.resolve([
        { accountId: 1001, fullName: 'Trần Kỹ Thuật Máy Bay', departmentId: 3, departmentCode: 'ENG', departmentName: 'Aircraft Maintenance' }
      ])
      if (url === '/etr') return Promise.resolve(mockEtrs)
      if (url === '/Evidences') return Promise.resolve([])
      if (url === '/etr/9001') return Promise.resolve(mockEtrDetails)
      return Promise.resolve([])
    })

    render(
      <LanguageProvider>
        <InstructorEvidence />
      </LanguageProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Aircraft Maintenance Log (AML)')).toBeTruthy()
    })

    // Không hiển thị SIM_LOG dành riêng cho FC
    expect(screen.queryByText('Flight Simulator Session Log')).toBeNull()

    // Hiển thị nhãn bắt buộc và mô tả nếu có
    expect(screen.getByText('Pre-flight Walkaround Checklist')).toBeTruthy()
  })
})
