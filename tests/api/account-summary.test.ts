import client from '@/services/http/client';
import { getAccountSummary } from '@/services/api/account';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const mockedClient = client as jest.Mocked<typeof client>;

describe('getAccountSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extracts nested account data when present', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        data: {
          account: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      },
    });

    const result = await getAccountSummary();

    expect(result).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(mockedClient.get).toHaveBeenCalledWith('/account/export');
  });

  it('extracts flat account data when nested is missing', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        id: 'user-456',
        email: 'flat@example.com',
        name: 'Flat User',
      },
    });

    const result = await getAccountSummary();

    expect(result).toEqual({
      id: 'user-456',
      email: 'flat@example.com',
      name: 'Flat User',
    });
  });

  it('prefers nested account data over flat when both present', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        data: {
          account: {
            id: 'nested-id',
            email: 'nested@example.com',
            name: 'Nested User',
          },
          id: 'flat-id',
          email: 'flat@example.com',
          name: 'Flat User',
        },
      },
    });

    const result = await getAccountSummary();

    expect(result).toEqual({
      id: 'nested-id',
      email: 'nested@example.com',
      name: 'Nested User',
    });
  });

  it('falls back to user_id when id is missing', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        data: {
          user_id: 'user-789',
          email: 'userid@example.com',
          name: 'UserID User',
        },
      },
    });

    const result = await getAccountSummary();

    expect(result).toEqual({
      id: 'user-789',
      email: 'userid@example.com',
      name: 'UserID User',
    });
  });

  it('returns null when id is missing entirely', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        data: {
          email: 'noid@example.com',
          name: 'No ID User',
        },
      },
    });

    const result = await getAccountSummary();

    expect(result).toBeNull();
  });

  it('returns null when email is missing', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        data: {
          id: 'user-no-email',
          name: 'No Email User',
        },
      },
    });

    const result = await getAccountSummary();

    expect(result).toBeNull();
  });

  it('returns null when both id and email are missing', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        data: {
          name: 'No ID or Email User',
        },
      },
    });

    const result = await getAccountSummary();

    expect(result).toBeNull();
  });

  it('defaults name to empty string when not provided', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        data: {
          id: 'user-no-name',
          email: 'noname@example.com',
        },
      },
    });

    const result = await getAccountSummary();

    expect(result).toEqual({
      id: 'user-no-name',
      email: 'noname@example.com',
      name: '',
    });
  });

  it('unwraps nested data envelope correctly', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        data: {
          account: {
            id: 'wrapped-id',
            email: 'wrapped@example.com',
            name: 'Wrapped User',
          },
        },
      },
    });

    const result = await getAccountSummary();

    expect(result).not.toBeNull();
    expect(result?.id).toBe('wrapped-id');
  });

  it('falls back to top-level data when inner data envelope is missing', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        account: {
          id: 'toplevel-id',
          email: 'toplevel@example.com',
          name: 'Top Level User',
        },
      },
    });

    const result = await getAccountSummary();

    expect(result).toEqual({
      id: 'toplevel-id',
      email: 'toplevel@example.com',
      name: 'Top Level User',
    });
  });

  it('handles empty nested account object', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        data: {
          account: {},
          id: 'fallback-id',
          email: 'fallback@example.com',
          name: 'Fallback User',
        },
      },
    });

    const result = await getAccountSummary();

    expect(result).toEqual({
      id: 'fallback-id',
      email: 'fallback@example.com',
      name: 'Fallback User',
    });
  });

  it('prioritizes nested email over flat email', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        data: {
          account: {
            id: 'id-1',
            email: 'nested@example.com',
          },
          email: 'flat@example.com',
        },
      },
    });

    const result = await getAccountSummary();

    expect(result?.email).toBe('nested@example.com');
  });

  it('prioritizes nested name over flat name', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        data: {
          account: {
            id: 'id-1',
            email: 'test@example.com',
            name: 'Nested Name',
          },
          name: 'Flat Name',
        },
      },
    });

    const result = await getAccountSummary();

    expect(result?.name).toBe('Nested Name');
  });

  it('handles null and undefined values gracefully', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        data: {
          account: {
            id: null,
            email: undefined,
          },
          id: 'fallback-id',
          email: 'fallback@example.com',
        },
      },
    });

    const result = await getAccountSummary();

    expect(result?.id).toBe('fallback-id');
    expect(result?.email).toBe('fallback@example.com');
  });
});
