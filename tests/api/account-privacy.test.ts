import client from '@/services/http/client';
import {
  cancelAccountDeletion,
  getAccountDeletionSubscriptionStatus,
  getAccountDeletionStatus,
  getAccountExportStatus,
  requestAccountDeletion,
  requestAccountExport,
} from '@/services/api/account';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

const mockedClient = client as jest.Mocked<typeof client>;

describe('account privacy API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests account export with a stable idempotency key', async () => {
    mockedClient.post.mockResolvedValueOnce({
      data: { job_id: 'export-1', state: 'pending', eta_seconds: 1800 },
    });

    await expect(requestAccountExport('export-req-1')).resolves.toEqual({
      jobId: 'export-1',
      state: 'pending',
      etaSeconds: 1800,
      signedUrl: null,
      expiresAt: null,
    });

    expect(mockedClient.post).toHaveBeenCalledWith(
      '/identity/account/export-request',
      {},
      { headers: { 'X-Request-Id': 'export-req-1' } },
    );
  });

  it('polls export status by job id and preserves the signed download URL', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        job_id: 'export-1',
        state: 'completed',
        eta_seconds: null,
        signed_url: 'https://exports.test/archive.zip',
        expires_at: '2026-06-01T00:00:00.000Z',
      },
    });

    await expect(getAccountExportStatus('export-1')).resolves.toEqual({
      jobId: 'export-1',
      state: 'completed',
      etaSeconds: null,
      signedUrl: 'https://exports.test/archive.zip',
      expiresAt: '2026-06-01T00:00:00.000Z',
    });

    expect(mockedClient.get).toHaveBeenCalledWith('/identity/account/export-status/export-1');
  });

  it('requests account deletion with confirm phrase, password, and idempotency key', async () => {
    mockedClient.post.mockResolvedValueOnce({
      data: {
        deletion_job_id: 'delete-1',
        status: 'in_grace_period',
        grace_period_ends_at: '2026-06-15T00:00:00.000Z',
        cancelable: true,
      },
    });

    await expect(
      requestAccountDeletion(
        { confirmPhrase: 'DELETE my account', password: 'CorrectHorseBattery!9', reason: 'Parent request' },
        'delete-req-1',
      ),
    ).resolves.toEqual({
      deletionJobId: 'delete-1',
      status: 'in_grace_period',
      gracePeriodEndsAt: '2026-06-15T00:00:00.000Z',
      completedAt: null,
      cancelable: true,
      cancelledAt: null,
    });

    expect(mockedClient.post).toHaveBeenCalledWith(
      '/identity/account/delete-request',
      {
        confirm_phrase: 'DELETE my account',
        password: 'CorrectHorseBattery!9',
        reason: 'Parent request',
      },
      { headers: { 'X-Request-Id': 'delete-req-1' } },
    );
  });

  it('treats a missing billing subscription as inactive for account deletion', async () => {
    mockedClient.get.mockRejectedValueOnce({
      code: 'subscription_not_found',
      message: 'Subscription not found',
      retryable: false,
      status: 404,
    });

    await expect(getAccountDeletionSubscriptionStatus()).resolves.toBe('inactive');
    expect(mockedClient.get).toHaveBeenCalledWith('/billing/subscription');
  });

  it('returns the current billing subscription status for account deletion', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        data: {
          subscriptionId: 'subscription-1',
          status: 'active',
        },
      },
    });

    await expect(getAccountDeletionSubscriptionStatus()).resolves.toBe('active');
    expect(mockedClient.get).toHaveBeenCalledWith('/billing/subscription');
  });

  it('rejects a malformed billing subscription response instead of allowing deletion', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: { data: {} } });

    await expect(getAccountDeletionSubscriptionStatus()).rejects.toThrow('subscription_status_missing');
  });

  it('checks and cancels deletion by job id without issuing duplicate create calls', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        deletion_job_id: 'delete-1',
        status: 'in_grace_period',
        grace_period_ends_at: '2026-06-15T00:00:00.000Z',
        completed_at: null,
        cancelable: true,
      },
    });
    mockedClient.post.mockResolvedValueOnce({
      data: {
        deletion_job_id: 'delete-1',
        status: 'cancelled',
        cancelled_at: '2026-05-16T00:00:00.000Z',
      },
    });

    await getAccountDeletionStatus('delete-1');
    await expect(cancelAccountDeletion('delete-1')).resolves.toEqual({
      deletionJobId: 'delete-1',
      status: 'cancelled',
      gracePeriodEndsAt: null,
      completedAt: null,
      cancelable: false,
      cancelledAt: '2026-05-16T00:00:00.000Z',
    });

    expect(mockedClient.get).toHaveBeenCalledWith('/identity/account/delete-status/delete-1');
    expect(mockedClient.post).toHaveBeenCalledWith('/identity/account/delete-request/delete-1/cancel');
    expect(mockedClient.post).toHaveBeenCalledTimes(1);
  });
});
