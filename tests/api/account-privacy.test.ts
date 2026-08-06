import client from '@/services/http/client';
import {
  cancelAccountDeletion,
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

  it('nullifies grace period when deletion is cancelled', async () => {
    mockedClient.post.mockResolvedValueOnce({
      data: {
        deletion_job_id: 'delete-2',
        status: 'cancelled',
        grace_period_ends_at: '2026-06-20T00:00:00.000Z',
        cancelable: true,
        cancelled_at: '2026-05-17T00:00:00.000Z',
      },
    });

    const result = await cancelAccountDeletion('delete-2');

    expect(result.gracePeriodEndsAt).toBeNull();
    expect(result.status).toBe('cancelled');
  });

  it('sets cancelable to false when deletion is cancelled', async () => {
    mockedClient.post.mockResolvedValueOnce({
      data: {
        deletion_job_id: 'delete-3',
        status: 'cancelled',
        cancelable: true,
        cancelled_at: '2026-05-18T00:00:00.000Z',
      },
    });

    const result = await cancelAccountDeletion('delete-3');

    expect(result.cancelable).toBe(false);
  });

  it('preserves grace period when deletion is in progress', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        deletion_job_id: 'delete-4',
        status: 'in_grace_period',
        grace_period_ends_at: '2026-06-25T00:00:00.000Z',
        cancelable: true,
      },
    });

    const result = await getAccountDeletionStatus('delete-4');

    expect(result.gracePeriodEndsAt).toBe('2026-06-25T00:00:00.000Z');
    expect(result.cancelable).toBe(true);
  });

  it('defaults null grace period when not provided', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        deletion_job_id: 'delete-5',
        status: 'in_grace_period',
      },
    });

    const result = await getAccountDeletionStatus('delete-5');

    expect(result.gracePeriodEndsAt).toBeNull();
  });

  it('defaults cancelable to false when not provided', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        deletion_job_id: 'delete-6',
        status: 'in_grace_period',
      },
    });

    const result = await getAccountDeletionStatus('delete-6');

    expect(result.cancelable).toBe(false);
  });

  it('handles completed deletion status', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        deletion_job_id: 'delete-7',
        status: 'completed',
        completed_at: '2026-06-01T00:00:00.000Z',
      },
    });

    const result = await getAccountDeletionStatus('delete-7');

    expect(result.status).toBe('completed');
    expect(result.gracePeriodEndsAt).toBeNull();
    expect(result.cancelable).toBe(false);
  });

  it('handles failed deletion status', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        deletion_job_id: 'delete-8',
        status: 'failed',
      },
    });

    const result = await getAccountDeletionStatus('delete-8');

    expect(result.status).toBe('failed');
    expect(result.gracePeriodEndsAt).toBeNull();
    expect(result.cancelable).toBe(false);
  });
});
