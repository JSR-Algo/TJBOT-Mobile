import { getRealtimeWsRoot } from '@/services/ws/realtime';

jest.mock('@/services/http/tokens', () => ({
  getAccessToken: jest.fn(),
}));

describe('realtime ws helpers', () => {
  it('derives ws root from API base', () => {
    expect(getRealtimeWsRoot()).toMatch(/^wss?:\/\//);
  });
});