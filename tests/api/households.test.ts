import client from '@/services/http/client';
import {
  addChild,
  archiveChild,
  deleteChild,
  listChildren,
  setActiveChild,
  updateChild,
} from '@/services/api/households';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedClient = client as jest.Mocked<typeof client>;

describe('households child profile API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a child with documented payload and stable request id', async () => {
    mockedClient.post.mockResolvedValueOnce({
      data: {
        data: {
          id: 'child-1',
          household_id: 'household-1',
          name: 'Panda friend',
          birth_year: 2018,
          age_gate_passed: true,
          created_at: '2026-05-16T00:00:00.000Z',
        },
      },
    });

    const payload = {
      name: 'Panda friend',
      date_of_birth: '2018-01-01',
      vocabulary_level: 'beginner' as const,
      learning_style: 'visual' as const,
    };

    await expect(addChild('household-1', payload, 'child-create-req-1')).resolves.toEqual({
      id: 'child-1',
      household_id: 'household-1',
      name: 'Panda friend',
      birth_year: 2018,
      age_gate_passed: true,
      created_at: '2026-05-16T00:00:00.000Z',
    });

    expect(mockedClient.post).toHaveBeenCalledWith(
      '/households/household-1/children',
      payload,
      { headers: { 'X-Request-Id': 'child-create-req-1' } },
    );
  });

  it('lists children for a household', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'child-1',
            household_id: 'household-1',
            name: 'Panda friend',
            birth_year: 2018,
            age_gate_passed: true,
            created_at: '2026-05-16T00:00:00.000Z',
          },
        ],
      },
    });

    await expect(listChildren('household-1')).resolves.toHaveLength(1);
    expect(mockedClient.get).toHaveBeenCalledWith('/households/household-1/children');
  });

  it('updates, archives, schedules deletion, and switches active child through backend routes', async () => {
    mockedClient.put.mockResolvedValueOnce({ data: { data: { id: 'child-1', name: 'Fox friend' } } });
    mockedClient.post.mockResolvedValueOnce({ data: { data: { id: 'child-1', status: 'archived' } } });
    mockedClient.patch.mockResolvedValueOnce({ data: { data: { id: 'child-1', status: 'scheduled_for_deletion' } } });
    mockedClient.post.mockResolvedValueOnce({ data: { data: { child_id: 'child-1' } } });

    await updateChild('household-1', 'child-1', { display_name: 'Fox friend' });
    await archiveChild('child-1');
    await deleteChild('child-1');
    await setActiveChild('child-1');

    expect(mockedClient.put).toHaveBeenCalledWith('/households/household-1/children/child-1', { display_name: 'Fox friend' });
    expect(mockedClient.post).toHaveBeenCalledWith('/children/child-1/archive');
    expect(mockedClient.patch).toHaveBeenCalledWith('/identity/children/child-1', { status: 'scheduled_for_deletion' });
    expect(mockedClient.post).toHaveBeenCalledWith('/profile/active-child', { child_id: 'child-1' });
  });

  it('surfaces backend child limit, COPPA, and foreign-access errors without rewriting them', async () => {
    const limitError = { code: 'MAX_CHILD_LIMIT_REACHED', message: 'Max child limit reached', retryable: false };
    const coppaError = { code: 'COPPA_REQUIRED', message: 'COPPA required', retryable: false };
    const forbiddenError = { code: 'FORBIDDEN', message: 'Forbidden', retryable: false };

    mockedClient.post.mockRejectedValueOnce(limitError);
    await expect(addChild('household-1', { name: 'Panda friend', date_of_birth: '2018-01-01' }, 'child-create-req-2'))
      .rejects.toBe(limitError);

    mockedClient.post.mockRejectedValueOnce(coppaError);
    await expect(addChild('household-1', { name: 'Panda friend', date_of_birth: '2018-01-01' }, 'child-create-req-3'))
      .rejects.toBe(coppaError);

    mockedClient.get.mockRejectedValueOnce(forbiddenError);
    await expect(listChildren('foreign-household')).rejects.toBe(forbiddenError);
  });
});
