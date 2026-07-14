import AsyncStorage from '@react-native-async-storage/async-storage';
import { acknowledgeRewardSeen } from '@/services/api/rewards.api';
import { enqueueRewardSeen, isRewardSeenQueued, replayRewardSeenQueue, setRewardQueueScope } from '@/features/rewards/offline/rewardSeenQueue';

jest.mock('@/services/api/rewards.api', () => ({ acknowledgeRewardSeen: jest.fn() }));

const mockAcknowledge = acknowledgeRewardSeen as jest.MockedFunction<typeof acknowledgeRewardSeen>;

describe('reward seen queue', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    setRewardQueueScope('parent-1', 'house-1');
  });

  it('queues each immutable reward id once', async () => {
    await enqueueRewardSeen('reward-1');
    await enqueueRewardSeen('reward-1');
    await enqueueRewardSeen('reward-2');
    expect(JSON.parse((await AsyncStorage.getItem('@TJBot/reward_seen_queue/parent-1/house-1')) ?? '[]')).toEqual(['reward-1', 'reward-2']);
    await expect(isRewardSeenQueued('reward-1')).resolves.toBe(true);
    await expect(isRewardSeenQueued('reward-3')).resolves.toBe(false);
  });

  it('does not lose either reward when two enqueues race on the same scope', async () => {
    const key = '@TJBot/reward_seen_queue/parent-1/house-1';
    const originalGetItem = (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).getMockImplementation();
    if (!originalGetItem) throw new Error('AsyncStorage.getItem mock implementation is required');
    let releaseFirstRead: () => void = () => undefined;
    let releaseSecondRead: () => void = () => undefined;
    let firstReadStarted: () => void = () => undefined;
    const firstStarted = new Promise<void>(resolve => { firstReadStarted = resolve; });
    const firstGate = new Promise<void>(resolve => { releaseFirstRead = resolve; });
    const secondGate = new Promise<void>(resolve => { releaseSecondRead = resolve; });
    let matchingReads = 0;
    let secondReadStarted = false;
    let firstReadReleased = false;
    jest.spyOn(AsyncStorage, 'getItem').mockImplementation(async storageKey => {
      if (storageKey !== key) return originalGetItem(storageKey);
      matchingReads += 1;
      if (matchingReads === 1) {
        firstReadStarted();
        await firstGate;
        return null;
      }
      if (matchingReads === 2) {
        if (firstReadReleased) return originalGetItem(storageKey);
        secondReadStarted = true;
        await secondGate;
        return null;
      }
      return originalGetItem(storageKey);
    });

    const first = enqueueRewardSeen('reward-a');
    await firstStarted;
    const second = enqueueRewardSeen('reward-b');
    await Promise.resolve();
    await Promise.resolve();
    if (secondReadStarted) {
      releaseSecondRead();
      await second;
      firstReadReleased = true;
      releaseFirstRead();
    } else {
      releaseSecondRead();
      firstReadReleased = true;
      releaseFirstRead();
    }
    await Promise.all([first, second]);

    expect(JSON.parse((await originalGetItem(key)) ?? '[]').sort()).toEqual(['reward-a', 'reward-b']);
  });

  it('reads and writes an explicit immutable scope instead of the current global scope', async () => {
    const originalScope = { accountId: 'parent-1', householdScope: 'house-1' };
    const replacementScope = { accountId: 'parent-2', householdScope: 'house-2' };
    await enqueueRewardSeen('original-reward', originalScope);
    await enqueueRewardSeen('replacement-reward', replacementScope);
    setRewardQueueScope('parent-1', 'house-1');

    await expect(isRewardSeenQueued('replacement-reward', replacementScope)).resolves.toBe(true);
    await expect(isRewardSeenQueued('replacement-reward', originalScope)).resolves.toBe(false);
    await expect(isRewardSeenQueued('original-reward', replacementScope)).resolves.toBe(false);
  });

  it('removes successful acknowledgements and retains failures', async () => {
    await enqueueRewardSeen('reward-1');
    await enqueueRewardSeen('reward-2');
    mockAcknowledge.mockResolvedValueOnce({ rewardId: 'reward-1', seen: true, seenAt: '2026-07-13T00:00:00.000Z' }).mockRejectedValueOnce(new Error('offline'));
    await replayRewardSeenQueue();
    expect(await AsyncStorage.getItem('@TJBot/reward_seen_queue/parent-1/house-1')).toBe('["reward-2"]');
  });

  it('preserves an enqueue that starts while replay is awaiting the backend', async () => {
    await enqueueRewardSeen('replayed-reward');
    let resolveAcknowledgement: (value: { rewardId: string; seen: true; seenAt: string }) => void = () => undefined;
    mockAcknowledge.mockImplementationOnce(() => new Promise(resolve => { resolveAcknowledgement = resolve; }));
    const replay = replayRewardSeenQueue();
    await waitForMockCall(mockAcknowledge);
    await expect(isRewardSeenQueued('replayed-reward')).resolves.toBe(true);
    await enqueueRewardSeen('during-replay');
    resolveAcknowledgement({ rewardId: 'replayed-reward', seen: true, seenAt: '2026-07-15T00:00:00.000Z' });
    await replay;

    await expect(isRewardSeenQueued('replayed-reward')).resolves.toBe(false);
    await expect(isRewardSeenQueued('during-replay')).resolves.toBe(true);
  });

  it('continues processing operations after a storage rejection', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(enqueueRewardSeen('failed-reward')).rejects.toThrow('storage unavailable');

    await enqueueRewardSeen('later-reward');
    await expect(isRewardSeenQueued('later-reward')).resolves.toBe(true);
  });

  it('never replays another parent account queue', async () => {
    await enqueueRewardSeen('reward-parent-1');
    setRewardQueueScope('parent-2', 'house-2');
    await enqueueRewardSeen('reward-parent-2');
    mockAcknowledge.mockResolvedValue({ rewardId: 'reward-parent-2', seen: true, seenAt: '2026-07-13T00:00:00.000Z' });
    await replayRewardSeenQueue();
    expect(mockAcknowledge).toHaveBeenCalledWith('reward-parent-2');
    expect(mockAcknowledge).not.toHaveBeenCalledWith('reward-parent-1');
  });

  it('is a safe no-op before an account is active', async () => {
    setRewardQueueScope(null, null);
    await expect(replayRewardSeenQueue()).resolves.toBeUndefined();
    expect(mockAcknowledge).not.toHaveBeenCalled();
  });

  it('preserves another account pending queue across account switches', async () => {
    await enqueueRewardSeen('reward-parent-1');
    setRewardQueueScope('parent-2', 'house-2');
    setRewardQueueScope('parent-1', 'house-1');
    mockAcknowledge.mockResolvedValue({ rewardId: 'reward-parent-1', seen: true, seenAt: '2026-07-13T00:00:00.000Z' });
    await replayRewardSeenQueue();
    expect(mockAcknowledge).toHaveBeenCalledWith('reward-parent-1');
  });

  it('does not replay a different household queue under the same account', async () => {
    await enqueueRewardSeen('house-1-reward');
    setRewardQueueScope('parent-1', 'house-2');
    await enqueueRewardSeen('house-2-reward');
    mockAcknowledge.mockResolvedValue({ rewardId: 'house-2-reward', seen: true, seenAt: '2026-07-13T00:00:00.000Z' });
    await replayRewardSeenQueue();
    expect(mockAcknowledge).toHaveBeenCalledWith('house-2-reward');
    expect(mockAcknowledge).not.toHaveBeenCalledWith('house-1-reward');
  });

  it('waits for household hydration before replaying a pending account queue', async () => {
    await enqueueRewardSeen('pending-reward');
    setRewardQueueScope('parent-1', null);
    await replayRewardSeenQueue();
    expect(mockAcknowledge).not.toHaveBeenCalled();

    setRewardQueueScope('parent-1', 'house-1');
    mockAcknowledge.mockResolvedValue({ rewardId: 'pending-reward', seen: true, seenAt: '2026-07-13T00:00:00.000Z' });
    await replayRewardSeenQueue();
    expect(mockAcknowledge).toHaveBeenCalledTimes(1);
  });
});

async function waitForMockCall(mock: { mock: { calls: unknown[][] } }): Promise<void> {
  for (let attempt = 0; attempt < 20 && mock.mock.calls.length === 0; attempt += 1) {
    await Promise.resolve();
  }
  expect(mock).toHaveBeenCalled();
}
