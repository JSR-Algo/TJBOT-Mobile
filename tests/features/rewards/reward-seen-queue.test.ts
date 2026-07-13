import AsyncStorage from '@react-native-async-storage/async-storage';
import { acknowledgeRewardSeen } from '@/services/api/rewards.api';
import { enqueueRewardSeen, replayRewardSeenQueue, setRewardQueueAccount } from '@/features/rewards/offline/rewardSeenQueue';

jest.mock('@/services/api/rewards.api', () => ({ acknowledgeRewardSeen: jest.fn() }));

const mockAcknowledge = acknowledgeRewardSeen as jest.MockedFunction<typeof acknowledgeRewardSeen>;

describe('reward seen queue', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    setRewardQueueAccount('parent-1');
  });

  it('queues each immutable reward id once', async () => {
    await enqueueRewardSeen('reward-1');
    await enqueueRewardSeen('reward-1');
    await enqueueRewardSeen('reward-2');
    expect(JSON.parse((await AsyncStorage.getItem('@TJBot/reward_seen_queue/parent-1')) ?? '[]')).toEqual(['reward-1', 'reward-2']);
  });

  it('removes successful acknowledgements and retains failures', async () => {
    await enqueueRewardSeen('reward-1');
    await enqueueRewardSeen('reward-2');
    mockAcknowledge.mockResolvedValueOnce({ rewardId: 'reward-1', seen: true, seenAt: '2026-07-13T00:00:00.000Z' }).mockRejectedValueOnce(new Error('offline'));
    await replayRewardSeenQueue();
    expect(await AsyncStorage.getItem('@TJBot/reward_seen_queue/parent-1')).toBe('["reward-2"]');
  });

  it('never replays another parent account queue', async () => {
    await enqueueRewardSeen('reward-parent-1');
    setRewardQueueAccount('parent-2');
    await enqueueRewardSeen('reward-parent-2');
    mockAcknowledge.mockResolvedValue({ rewardId: 'reward-parent-2', seen: true, seenAt: '2026-07-13T00:00:00.000Z' });
    await replayRewardSeenQueue();
    expect(mockAcknowledge).toHaveBeenCalledWith('reward-parent-2');
    expect(mockAcknowledge).not.toHaveBeenCalledWith('reward-parent-1');
  });

  it('is a safe no-op before an account is active', async () => {
    setRewardQueueAccount(null);
    await expect(replayRewardSeenQueue()).resolves.toBeUndefined();
    expect(mockAcknowledge).not.toHaveBeenCalled();
  });

  it('preserves another account pending queue across account switches', async () => {
    await enqueueRewardSeen('reward-parent-1');
    setRewardQueueAccount('parent-2');
    setRewardQueueAccount('parent-1');
    mockAcknowledge.mockResolvedValue({ rewardId: 'reward-parent-1', seen: true, seenAt: '2026-07-13T00:00:00.000Z' });
    await replayRewardSeenQueue();
    expect(mockAcknowledge).toHaveBeenCalledWith('reward-parent-1');
  });
});
