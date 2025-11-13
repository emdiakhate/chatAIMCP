import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRetry, retryWithBackoff } from './useRetry';

describe('useRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute function successfully on first attempt', async () => {
    const { result } = renderHook(() => useRetry({ maxAttempts: 3 }));
    const mockFn = vi.fn().mockResolvedValue('success');

    const data = await result.current.execute(mockFn);

    expect(data).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(result.current.attempts).toBe(1);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should retry on failure and eventually succeed', async () => {
    const { result } = renderHook(() =>
      useRetry({ maxAttempts: 3, initialDelay: 10 })
    );

    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValueOnce('success');

    const data = await result.current.execute(mockFn);

    expect(data).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(result.current.attempts).toBe(3);
    expect(result.current.error).toBeNull();
  });

  it('should fail after max attempts', async () => {
    const { result } = renderHook(() =>
      useRetry({ maxAttempts: 2, initialDelay: 10 })
    );

    const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));

    await expect(result.current.execute(mockFn)).rejects.toThrow('Always fails');

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(result.current.attempts).toBe(2);
    expect(result.current.error).toEqual(new Error('Always fails'));
  });

  it('should call onRetry callback on each retry', async () => {
    const onRetry = vi.fn();
    const { result } = renderHook(() =>
      useRetry({ maxAttempts: 3, initialDelay: 10, onRetry })
    );

    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockResolvedValueOnce('success');

    await result.current.execute(mockFn);

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, new Error('Fail 1'));
  });

  it('should reset state', () => {
    const { result } = renderHook(() => useRetry());

    result.current.reset();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.attempts).toBe(0);
  });
});

describe('retryWithBackoff', () => {
  it('should retry with exponential backoff', async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValueOnce('success');

    const result = await retryWithBackoff(mockFn, {
      maxAttempts: 2,
      initialDelay: 10,
    });

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should throw after max attempts', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));

    await expect(
      retryWithBackoff(mockFn, { maxAttempts: 2, initialDelay: 10 })
    ).rejects.toThrow('Always fails');

    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});
