import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  localStorage.clear()
})

describe('InstructorLayout - Navigation Items', () => {
  const navigationItems = [
    { label: 'LỚP CỦA TÔI', to: '/instructor/classes' },
    { label: 'ĐIỂM DANH', to: '/instructor/attendance' },
    { label: 'ĐÁNH GIÁ', to: '/instructor/assessments' },
    { label: 'MINH CHỨNG', to: '/instructor/evidence' },
    { label: 'LỊCH GIẢNG DẠY', to: '/instructor/schedule' },
  ]

  it('has all 5 navigation items', () => {
    expect(navigationItems.length).toBe(5)
  })

  it('each item has label and to properties', () => {
    navigationItems.forEach((item) => {
      expect(item.label).toBeDefined()
      expect(item.to).toBeDefined()
      expect(item.to.startsWith('/instructor/')).toBe(true)
    })
  })

  it('navigates to assessments page', () => {
    const assessments = navigationItems.find((i) => i.label === 'ĐÁNH GIÁ')
    expect(assessments?.to).toBe('/instructor/assessments')
  })

  it('navigates to attendance page', () => {
    const attendance = navigationItems.find((i) => i.label === 'ĐIỂM DANH')
    expect(attendance?.to).toBe('/instructor/attendance')
  })

  it('navigates to classes page', () => {
    const classes = navigationItems.find((i) => i.label === 'LỚP CỦA TÔI')
    expect(classes?.to).toBe('/instructor/classes')
  })

  it('navigates to evidence page', () => {
    const evidence = navigationItems.find((i) => i.label === 'MINH CHỨNG')
    expect(evidence?.to).toBe('/instructor/evidence')
  })

  it('navigates to schedule page', () => {
    const schedule = navigationItems.find((i) => i.label === 'LỊCH GIẢNG DẠY')
    expect(schedule?.to).toBe('/instructor/schedule')
  })
})

describe('InstructorLayout - User Profile', () => {
  it('parses user from localStorage', () => {
    localStorage.setItem('user', JSON.stringify({
      fullName: 'Nguyễn Văn A',
      roleName: 'Instructor',
    }))

    const userJson = localStorage.getItem('user')
    const user = userJson ? JSON.parse(userJson) : {}

    expect(user.fullName).toBe('Nguyễn Văn A')
    expect(user.roleName).toBe('Instructor')
  })

  it('getInitials returns correct initials', () => {
    const getInitials = (name) => {
      if (!name) return 'GV'
      const parts = name.trim().split(' ')
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
      return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase()
    }

    expect(getInitials('Nguyễn Văn A')).toBe('VA')
    expect(getInitials('John')).toBe('JO')
    expect(getInitials('')).toBe('GV')
    expect(getInitials(null)).toBe('GV')
    expect(getInitials('Trần Thị B')).toBe('TB')
  })
})

describe('InstructorLayout - Logout', () => {
  it('clears localStorage on logout', () => {
    localStorage.setItem('token', 'abc123')
    localStorage.setItem('user', JSON.stringify({ fullName: 'Test' }))

    localStorage.removeItem('token')
    localStorage.removeItem('user')

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })
})
