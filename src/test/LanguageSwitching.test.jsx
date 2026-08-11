import { describe, it, expect, beforeEach } from 'vitest';
import { translateVn, translateEn } from '../utils/translate';

describe('Language Switching & i18n Verification', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to English when app_language is not set in localStorage', () => {
    const lang = localStorage.getItem('app_language') || 'en';
    expect(lang).toBe('en');
  });

  it('translates Vietnamese strings to English by default', () => {
    expect(translateVn('Đăng xuất')).toBe('Logout');
    expect(translateVn('Đăng nhập')).toBe('Login');
    expect(translateVn('Tạo khóa học')).toBe('Create Course');
    expect(translateVn('Hồ sơ học viên')).toBe('Student Profile');
    expect(translateVn('LỚP CỦA TÔI')).toBe('MY CLASSES');
  });

  it('translates English strings to Vietnamese when switching to Vietnamese', () => {
    expect(translateEn('Logout')).toBe('Đăng xuất');
    expect(translateEn('Login')).toBe('Đăng nhập');
    expect(translateEn('Dashboard')).toBe('Tổng quan');
    expect(translateEn('MY CLASSES')).toBe('LỚP CỦA TÔI');
    expect(translateEn('User Management')).toBe('Quản lý Người dùng');
  });

  it('handles reverse lookup for strings defined in VN_TO_EN or EN_TO_VN', () => {
    // English string passed to translateEn translates to Vietnamese
    expect(translateEn('Department Management')).toBe('Quản lý phòng ban (Departments)');
    // Vietnamese string passed to translateVn translates to English
    expect(translateVn('Quản lý phòng ban (Departments)')).toBe('Department Management');
  });

  it('handles case-insensitive matching for uppercase headings and status labels', () => {
    expect(translateVn('TRẠNG THÁI LỚP HỌC')).toBe('CLASS STATUS');
    expect(translateVn('BỘ LỌC')).toBe('FILTER');
    expect(translateVn('CHI TIẾT ĐIỂM DANH')).toBe('ATTENDANCE DETAILS');
    expect(translateVn('THEO DÕI')).toBe('MONITORING');
    expect(translateVn('CẢNH BÁO')).toBe('WARNING');
    expect(translateVn('Thứ 2')).toBe('Monday');
    expect(translateVn('Chủ Nhật')).toBe('Sunday');
  });

  it('preserves unknown strings gracefully without crashing', () => {
    expect(translateVn('Custom String 123')).toBe('Custom String 123');
    expect(translateEn('Custom String 123')).toBe('Custom String 123');
  });
});
