import client from '../http/client';
import { User } from '../../types';

export type AccountExportJob = {
  jobId: string;
  state: 'pending' | 'in_progress' | 'completed' | 'failed';
  etaSeconds: number | null;
  signedUrl: string | null;
  expiresAt: string | null;
};

export type AccountDeletionJob = {
  deletionJobId: string;
  status: 'in_grace_period' | 'completed' | 'cancelled' | 'failed';
  gracePeriodEndsAt: string | null;
  completedAt: string | null;
  cancelable: boolean;
  cancelledAt: string | null;
};

type ExportRawPayload = {
  job_id: string;
  state: AccountExportJob['state'];
  eta_seconds?: number | null;
  signed_url?: string | null;
  expires_at?: string | null;
};

type DeletionRawPayload = {
  deletion_job_id: string;
  status: AccountDeletionJob['status'];
  grace_period_ends_at?: string | null;
  completed_at?: string | null;
  cancelable?: boolean;
  cancelled_at?: string | null;
};

function unwrap<T>(data: { data?: T } | T): T {
  if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
    const inner = (data as { data?: T }).data;
    if (inner !== undefined) return inner;
  }
  return data as T;
}

function mapExport(raw: ExportRawPayload): AccountExportJob {
  return {
    jobId: raw.job_id,
    state: raw.state,
    etaSeconds: raw.eta_seconds ?? null,
    signedUrl: raw.signed_url ?? null,
    expiresAt: raw.expires_at ?? null,
  };
}

function mapDeletion(raw: DeletionRawPayload): AccountDeletionJob {
  const cancelled = raw.status === 'cancelled';
  return {
    deletionJobId: raw.deletion_job_id,
    status: raw.status,
    gracePeriodEndsAt: cancelled ? null : (raw.grace_period_ends_at ?? null),
    completedAt: raw.completed_at ?? null,
    cancelable: cancelled ? false : (raw.cancelable ?? false),
    cancelledAt: raw.cancelled_at ?? null,
  };
}

export async function requestAccountExport(requestId: string): Promise<AccountExportJob> {
  const response = await client.post('/identity/account/export-request', {}, { headers: { 'X-Request-Id': requestId } });
  return mapExport(unwrap<ExportRawPayload>(response.data));
}

export async function getAccountExportStatus(jobId: string): Promise<AccountExportJob> {
  const response = await client.get(`/identity/account/export-status/${jobId}`);
  return mapExport(unwrap<ExportRawPayload>(response.data));
}

export type AccountDeletionRequest = {
  confirmPhrase: string;
  password: string;
  reason?: string;
};

export async function requestAccountDeletion(input: AccountDeletionRequest, requestId: string): Promise<AccountDeletionJob> {
  const body: Record<string, string> = {
    confirm_phrase: input.confirmPhrase,
    password: input.password,
  };
  if (input.reason !== undefined) body.reason = input.reason;
  const response = await client.post('/identity/account/delete-request', body, { headers: { 'X-Request-Id': requestId } });
  return mapDeletion(unwrap<DeletionRawPayload>(response.data));
}

export async function getAccountDeletionStatus(deletionJobId: string): Promise<AccountDeletionJob> {
  const response = await client.get(`/identity/account/delete-status/${deletionJobId}`);
  return mapDeletion(unwrap<DeletionRawPayload>(response.data));
}

export async function cancelAccountDeletion(deletionJobId: string): Promise<AccountDeletionJob> {
  const response = await client.post(`/identity/account/delete-request/${deletionJobId}/cancel`);
  return mapDeletion(unwrap<DeletionRawPayload>(response.data));
}

export type EntitlementsSnapshot = {
  courses: string[];
  subscriptionStatus: string;
  robotActivated: boolean;
};

let entitlementsInFlight: Promise<EntitlementsSnapshot> | null = null;

export async function refreshEntitlementsAfterPurchase(): Promise<EntitlementsSnapshot> {
  if (entitlementsInFlight) return entitlementsInFlight;
  entitlementsInFlight = (async () => {
    try {
      const response = await client.get('/v1/account/entitlements');
      const raw = unwrap<{
        courses?: string[];
        subscription_status?: string;
        robot_activated?: boolean;
      }>(response.data);
      return {
        courses: raw.courses ?? [],
        subscriptionStatus: raw.subscription_status ?? 'inactive',
        robotActivated: raw.robot_activated ?? false,
      };
    } finally {
      entitlementsInFlight = null;
    }
  })();
  return entitlementsInFlight;
}

export async function deleteAccount(password: string): Promise<void> {
  await client.delete('/v1/account', { data: { password } });
}

export async function exportData(): Promise<object> {
  const response = await client.get('/v1/account/export');
  return response.data.data ?? response.data;
}

/**
 * Fetch the current user's account summary.
 *
 * Uses /v1/account/export until /v1/me is deployed under
 * task-s5-backend-v1-me-endpoint.
 */
export async function getAccountSummary(): Promise<User | null> {
  const response = await client.get('/v1/account/export');
  const data = (response.data.data ?? response.data) as {
    account?: { id?: string; email?: string; name?: string };
  };
  const account = data?.account;
  if (!account?.id || !account.email) return null;
  return {
    id: account.id,
    email: account.email,
    name: account.name ?? '',
  };
}
