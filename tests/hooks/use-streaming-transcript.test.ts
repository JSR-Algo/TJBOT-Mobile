import { act, renderHook } from '@testing-library/react-native';

import { useStreamingTranscript } from '../../src/hooks/use-streaming-transcript';

describe('useStreamingTranscript ordering', () => {
  it('keeps confirmed transcript before the current partial', () => {
    const { result } = renderHook(() => useStreamingTranscript());

    act(() => {
      result.current[1].onPartial('hello');
    });
    expect(result.current[0]).toMatchObject({
      confirmedText: '',
      partialText: 'hello',
      displayText: 'hello',
      hasText: true,
    });

    act(() => {
      result.current[1].onFinal('hello');
      result.current[1].onPartial('robot');
    });
    expect(result.current[0]).toMatchObject({
      confirmedText: 'hello',
      partialText: 'robot',
      displayText: 'hello robot',
      hasText: true,
    });
  });

  it('finalize appends an unfinalized partial after confirmed segments then resets', () => {
    const { result } = renderHook(() => useStreamingTranscript());

    let finalized = '';
    act(() => {
      result.current[1].onFinal('first');
      result.current[1].onFinal('second');
      result.current[1].onPartial('third');
      finalized = result.current[1].finalize();
    });

    expect(finalized).toBe('first second third');
    expect(result.current[0]).toMatchObject({
      confirmedText: '',
      partialText: '',
      displayText: '',
      hasText: false,
    });
  });

  it('reset drops partial and confirmed text without emitting stale display text', () => {
    const { result } = renderHook(() => useStreamingTranscript());

    act(() => {
      result.current[1].onFinal('kept');
      result.current[1].onPartial('stale');
      result.current[1].reset();
    });

    expect(result.current[0]).toMatchObject({
      confirmedText: '',
      partialText: '',
      displayText: '',
      hasText: false,
    });
  });
});
