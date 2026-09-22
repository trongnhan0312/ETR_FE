import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { dispatchAppBack, handleAppBack, useSubViewBack } from '../utils/navigation';

describe('Universal Navigation & Subview Back Tests', () => {
  it('dispatchAppBack should return false when no sub-view is active', () => {
    const handled = dispatchAppBack();
    expect(handled).toBe(false);
  });

  it('useSubViewBack should intercept app:navigate-back when active', () => {
    const onBackMock = vi.fn();
    const { rerender } = renderHook(
      ({ isActive }) => useSubViewBack(isActive, onBackMock),
      { initialProps: { isActive: true } }
    );

    const handled = dispatchAppBack();
    expect(handled).toBe(true);
    expect(onBackMock).toHaveBeenCalledTimes(1);

    // When inactive, should not intercept
    rerender({ isActive: false });
    const handledWhenInactive = dispatchAppBack();
    expect(handledWhenInactive).toBe(false);
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it('handleAppBack should not navigate when sub-view handled the event', () => {
    const navigateMock = vi.fn();
    const onBackMock = vi.fn();

    renderHook(() => useSubViewBack(true, onBackMock));

    handleAppBack(navigateMock, '/instructor');
    expect(onBackMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('handleAppBack should navigate(-1) when history stack has previous entries', () => {
    const navigateMock = vi.fn();
    // Simulate history state with idx > 0
    const originalState = window.history.state;
    Object.defineProperty(window.history, 'state', {
      value: { idx: 2 },
      writable: true,
      configurable: true,
    });

    handleAppBack(navigateMock, '/instructor');
    expect(navigateMock).toHaveBeenCalledWith(-1);

    // Restore
    Object.defineProperty(window.history, 'state', {
      value: originalState,
      writable: true,
      configurable: true,
    });
  });

  it('handleAppBack should navigate to fallbackPath when history stack is at root (idx === 0)', () => {
    const navigateMock = vi.fn();
    const originalState = window.history.state;
    Object.defineProperty(window.history, 'state', {
      value: { idx: 0 },
      writable: true,
      configurable: true,
    });

    handleAppBack(navigateMock, '/instructor');
    expect(navigateMock).toHaveBeenCalledWith('/instructor');

    // Restore
    Object.defineProperty(window.history, 'state', {
      value: originalState,
      writable: true,
      configurable: true,
    });
  });
});
