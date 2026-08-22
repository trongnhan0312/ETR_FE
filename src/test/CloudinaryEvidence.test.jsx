import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Tests cho tính năng Cloudinary evidence + carry-over retake (2026-08)
//  1. utils/cloudinary.js — validateEvidenceFile + uploadToCloudinary
//  2. StudentMyETR — badge GIỮ NGUYÊN / CẦN HỌC LẠI trên màn hình chi tiết ETR
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../Student/student.scss', () => ({}))

const makeFile = (name, type, size = 1024) => new File(['x'], name, { type })

// ─── 1. validateEvidenceFile ────────────────────────────────────────────────
describe('validateEvidenceFile (whitelist khớp BE EvidenceService)', () => {
  let validateEvidenceFile
  beforeAll(async () => {
    const mod = await import('../utils/cloudinary')
    validateEvidenceFile = mod.validateEvidenceFile
  })

  it('trả về lỗi khi không có file', () => {
    expect(validateEvidenceFile(null)).toContain('Thiếu tệp tin')
  })

  it('chấp nhận PDF đúng mime', () => {
    expect(validateEvidenceFile(makeFile('bang-chung.pdf', 'application/pdf'))).toBeNull()
  })

  it('chấp nhận JPG/PNG/GIF/WEBP đúng mime', () => {
    expect(validateEvidenceFile(makeFile('a.jpg', 'image/jpeg'))).toBeNull()
    expect(validateEvidenceFile(makeFile('a.jpeg', 'image/jpeg'))).toBeNull()
    expect(validateEvidenceFile(makeFile('a.png', 'image/png'))).toBeNull()
    expect(validateEvidenceFile(makeFile('a.gif', 'image/gif'))).toBeNull()
    expect(validateEvidenceFile(makeFile('a.webp', 'image/webp'))).toBeNull()
  })

  it('tin vào extension khi trình duyệt để trống mime', () => {
    const f = makeFile('scan.pdf', '')
    Object.defineProperty(f, 'type', { value: '' })
    expect(validateEvidenceFile(f)).toBeNull()
  })

  it('từ chối DOCX (BE đã bỏ khỏi whitelist)', () => {
    expect(validateEvidenceFile(makeFile('van-ban.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')))
      .toContain('không được hỗ trợ')
  })

  it('từ chối extension lạ (.exe)', () => {
    expect(validateEvidenceFile(makeFile('virus.exe', 'application/octet-stream')))
      .toContain('không được hỗ trợ')
  })

  it('từ chối khi mime không khớp whitelist dù extension hợp lệ', () => {
    expect(validateEvidenceFile(makeFile('fake.pdf', 'text/plain')))
      .toContain('Kiểu tệp')
  })
})

// ─── 2. uploadToCloudinary ──────────────────────────────────────────────────
// Module đọc import.meta.env lúc import → phải resetModules + stubEnv trước mỗi lần load.
let loadCloudinary
beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  loadCloudinary = async ({ cloud = 'test-cloud', preset = 'test-preset' } = {}) => {
    if (cloud !== null) vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', cloud)
    if (preset !== null) vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', preset)
    return import('../utils/cloudinary')
  }
})

describe('uploadToCloudinary', () => {
  it('ném lỗi rõ ràng khi CHƯA cấu hình Cloudinary (thiếu cloud/preset)', async () => {
    const { uploadToCloudinary } = await loadCloudinary({ cloud: '', preset: '' })
    await expect(uploadToCloudinary(makeFile('a.pdf', 'application/pdf')))
      .rejects.toThrow(/Cloudinary/)
  })

  it('chặn sớm định dạng sai TRƯỚC khi gọi fetch', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { uploadToCloudinary } = await loadCloudinary()
    // Lỗi có thể ở dạng VI (nguồn) hoặc EN (đã qua translateVn trong từ điển)
    await expect(uploadToCloudinary(makeFile('x.docx', 'application/msword')))
      .rejects.toThrow(/không được hỗ trợ|Unsupported file format/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('upload thành công → trả đúng shape JSON BE cần (fileUrl/publicId/fileName/mimeType/fileSize)', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        secure_url: 'https://res.cloudinary.com/test-cloud/raw/upload/v1/evidence/a.pdf',
        public_id: 'evidence/a',
      }),
    })
    vi.stubGlobal('fetch', fetchSpy)

    const { uploadToCloudinary } = await loadCloudinary()
    const file = makeFile('a.pdf', 'application/pdf', 2048)
    const result = await uploadToCloudinary(file)

    expect(result).toEqual({
      fileUrl: 'https://res.cloudinary.com/test-cloud/raw/upload/v1/evidence/a.pdf',
      publicId: 'evidence/a',
      fileName: 'a.pdf',
      mimeType: 'application/pdf',
      // jsdom File size = độ dài nội dung ('x' = 1 byte), không nhận tham số size
      fileSize: file.size,
    })
    expect(result.fileSize).toBeGreaterThan(0)

    // Đúng endpoint unsigned upload của Cloudinary + có upload_preset trong form
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://api.cloudinary.com/v1_1/test-cloud/auto/upload')
    expect(opts.method).toBe('POST')
    expect(opts.body).toBeInstanceOf(FormData)
    expect(opts.body.get('upload_preset')).toBe('test-preset')
    expect(opts.body.get('file')).toBeTruthy()
  })

  it('từ chối nếu Cloudinary trả về URL không phải https (BE bắt buộc https tuyệt đối)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ secure_url: 'http://insecure.example.com/a.pdf', public_id: 'a' }),
    }))
    const { uploadToCloudinary } = await loadCloudinary()
    await expect(uploadToCloudinary(makeFile('a.pdf', 'application/pdf')))
      .rejects.toThrow(/https/)
  })

  it('lỗi từ Cloudinary (preset sai / file bị chặn) → throw kèm message chi tiết', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'Upload preset not found' } }),
    }))
    const { uploadToCloudinary } = await loadCloudinary()
    await expect(uploadToCloudinary(makeFile('a.pdf', 'application/pdf')))
      .rejects.toThrow(/Upload preset not found/)
  })
})

// ─── 3. StudentMyETR — badge carry-over trên màn hình chi tiết ──────────────
describe('StudentMyETR - hiển thị môn giữ nguyên / cần học lại', () => {
  const renderPage = async () => {
    // Ép ngôn ngữ VI để assert đúng chuỗi nguồn trong component
    localStorage.setItem('app_language', 'vi')

    // Mock api: danh sách 1 hồ sơ + detail trả 2 môn (1 carry-over, 1 học lại)
    vi.doMock('../utils/api', () => ({
      api: {
        get: vi.fn(async (url) => {
          if (/\/Etr\/my-etr/i.test(url)) {
            return [{ etrCourseRecordId: 7, enrollmentId: 3, status: 'InProgress' }]
          }
          if (/\/Etr\/7$/i.test(url) || /\/Etr\/7\?/i.test(url)) {
            return {
              etrCourseRecordId: 7,
              enrollmentId: 3,
              status: 'InProgress',
              // PascalCase như BE thật (EtrSubjectDetailResponse)
              SubjectResults: [
                { SubjectResultId: 1, SubjectId: 1, Status: 'Passed', IsSignedOff: true, IsCarriedOver: true },
                { SubjectResultId: 2, SubjectId: 2, Status: 'Failed', IsSignedOff: false, IsCarriedOver: false },
              ],
              EvidenceFiles: [],
              ApprovalHistories: [],
            }
          }
          return []
        }),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      },
    }))

    const [{ default: StudentMyETR }, { LanguageProvider }] = await Promise.all([
      import('../Student/StudentMyETR'),
      import('../context/LanguageContext'),
    ])

    render(
      <LanguageProvider>
        <StudentMyETR />
      </LanguageProvider>
    )
  }

  it('môn IsCarriedOver=true hiện nhãn GIỮ NGUYÊN, môn=false hiện CẦN HỌC LẠI', async () => {
    await renderPage()

    // List view tải xong → mở chi tiết hồ sơ #7
    fireEvent.click(await screen.findByRole('button', { name: /Chi tiết/i }))

    // Badge theo từng nhóm (legend cũng chứa 2 nhãn nên findAll >= 1 badge + 1 legend)
    const carriedBadges = await screen.findAllByText('GIỮ NGUYÊN')
    const retakeBadges = await screen.findAllByText('CẦN HỌC LẠI')
    expect(carriedBadges.length).toBeGreaterThanOrEqual(2) // 1 badge + 1 legend
    expect(retakeBadges.length).toBeGreaterThanOrEqual(2)
  })

  it('hiển thị bảng kết quả với cả hai dòng môn học sau khi mở chi tiết', async () => {
    await renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Chi tiết/i }))

    await waitFor(() => {
      expect(screen.getAllByText('Môn #1').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Môn #2').length).toBeGreaterThan(0)
    })
    // Legend giải thích 2 nhóm có mặt
    expect(screen.getByText(/giữ kết quả từ lần học trước/i)).toBeTruthy()
    expect(screen.getByText(/phải học\/thi lại trong kỳ này/i)).toBeTruthy()
  })
})
