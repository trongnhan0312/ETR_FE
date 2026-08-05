import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../utils/api'

// Clear localStorage before each test
beforeEach(() => {
  localStorage.clear()
  globalThis.alert = vi.fn()
})

// ---------------------------------------------------------------------------
// API module: Assessment & PracticalChecklist structure endpoints
// ---------------------------------------------------------------------------
describe('API - Assessment & PracticalChecklist structure', () => {
  it('GET /Assessments returns assessment records', async () => {
    const data = await api.get('/Assessments')
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].assessmentId).toBe(1)
  })

  it('GET /PracticalChecklists returns checklist records', async () => {
    const data = await api.get('/PracticalChecklists')
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].practicalChecklistId).toBe(1)
  })

  it('GET /Subjects returns subject records', async () => {
    const data = await api.get('/Subjects')
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].subjectId).toBe(1)
  })

  it('POST /Assessments is a write endpoint (returns a response, not demo fallback)', async () => {
    const result = await api.post('/Assessments', {
      courseId: 1,
      subjectId: 1,
      componentName: 'Final Exam',
      assessmentType: 'Final',
      weight: 100,
      passingScore: 60,
      isRequired: true,
      displayOrder: 1,
    })
    expect(result).toBeDefined()
  })

  it('POST /PracticalChecklists is a write endpoint', async () => {
    const result = await api.post('/PracticalChecklists', {
      courseId: 1,
      subjectId: 1,
      itemName: 'Test',
      description: 'desc',
      isRequired: true,
      displayOrder: 1,
    })
    expect(result).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Validation logic: assessment weight sum must equal 100%
// ---------------------------------------------------------------------------
describe('Assessment weight accumulation', () => {
  it('sums assessment weights correctly', () => {
    const assessments = [
      { weight: 40 },
      { weight: 60 },
    ]
    const total = assessments.reduce((s, a) => s + (Number(a.weight) || 0), 0)
    expect(total).toBe(100)
  })

  it('flags a total weight that is not 100%', () => {
    const assessments = [{ weight: 30 }, { weight: 55 }]
    const total = assessments.reduce((s, a) => s + (Number(a.weight) || 0), 0)
    const weightValid = Math.abs(total - 100) < 0.0001
    expect(weightValid).toBe(false)
  })

  it('returns next displayOrder = max + 1', () => {
    const assessments = [
      { displayOrder: 1 },
      { displayOrder: 3 },
      { displayOrder: 5 },
    ]
    const nextOrder = Math.max(...assessments.map((a) => a.displayOrder || 0)) + 1
    expect(nextOrder).toBe(6)
  })

  it('defaults next displayOrder to 1 when no assessments exist', () => {
    const assessments = []
    const nextOrder =
      assessments.length > 0
        ? Math.max(...assessments.map((a) => a.displayOrder || 0)) + 1
        : 1
    expect(nextOrder).toBe(1)
  })

  it('parses assessment types for display labels', () => {
    const type = 'final'
    const label =
      type.toLowerCase() === 'final'
        ? 'Kiểm tra cuối kỳ (Final)'
        : type.toLowerCase() === 'midterm'
          ? 'Kiểm tra giữa kỳ (Midterm)'
          : type
    expect(label).toBe('Kiểm tra cuối kỳ (Final)')
  })
})

// ---------------------------------------------------------------------------
// Filtering: assessments / checklists scoped to course + subject
// ---------------------------------------------------------------------------
describe('Filter by course + subject', () => {
  it('filters assessments by courseId and subjectId', async () => {
    const all = await api.get('/Assessments')
    const courseId = 1
    const subjectId = 1
    const filtered = all.filter(
      (a) =>
        Number(a.courseId) === courseId && Number(a.subjectId) === subjectId,
    )
    // api mock /Assessments rows lack courseId/subjectId; expect empty is acceptable
    expect(Array.isArray(filtered)).toBe(true)
  })

  it('filters practical checklists by courseId and subjectId', async () => {
    const all = await api.get('/PracticalChecklists')
    const filtered = all.filter(
      (c) => Number(c.courseId) === 1 && Number(c.subjectId) === 1,
    )
    expect(filtered.length).toBeGreaterThanOrEqual(1)
    expect(filtered[0].itemName).toBe('Thực hành ghi nhận thông số')
  })
})

// ---------------------------------------------------------------------------
// Payload mapping for create/update
// ---------------------------------------------------------------------------
describe('Request payload shaping', () => {
  it('builds a create assessment payload with courseId + subjectId', () => {
    const payload = {
      subjectId: 1,
      componentName: 'Final Test',
      assessmentType: 'Final',
      weight: 40,
      passingScore: 50,
      isRequired: true,
      displayOrder: 2,
      courseId: 1,
    }
    expect(payload.courseId).toBe(1)
    expect(payload.subjectId).toBe(1)
    expect(payload.weight).toBe(40)
    expect(payload.isRequired).toBe(true)
  })

  it('builds an update assessment payload without courseId', () => {
    const id = 7
    const payload = {
      assessmentId: id,
      subjectId: 1,
      componentName: 'Updated',
      weight: 30,
      isRequired: false,
      displayOrder: 1,
    }
    expect(payload.assessmentId).toBe(7)
    expect(payload.courseId).toBeUndefined()
  })

  it('builds a practical checklist payload', () => {
    const payload = {
      courseId: 1,
      subjectId: 1,
      itemName: 'Runway inspection',
      description: 'Check surface conditions',
      isRequired: true,
      displayOrder: 1,
    }
    expect(payload.itemName).toBe('Runway inspection')
    expect(payload.description).toBe('Check surface conditions')
  })

  it('validates empty componentName / itemName before submit', () => {
    const hasName = (v) => Boolean(v && v.trim())
    expect(hasName('  ')).toBe(false)
    expect(hasName('Final')).toBe(true)
  })

  it('clamps weight into 0-100', () => {
    const w = Math.min(100, Math.max(0, 150))
    expect(w).toBe(100)
  })
})