// Physical-confirm claim / provisioning service client.
//
// Base URLs are config-driven via the shared axios client. The realtime
// WebSocket URL is never constructed here; callers consume the explicit
// `ws_url` / `websocket.url` returned by GET /v1/device/bootstrap.

import client from '@/services/http/client';

// ---------------------------------------------------------------------------
// Physical-confirm claim — POST /v1/claim/request + GET /v1/claim/status/:id
// ---------------------------------------------------------------------------

export interface AvailableClaimDevice {
  deviceId: string;
  displayName: string;
  model: string;
  state: string;
  requiresPhysicalConfirm: boolean;
  expiresAt: string | null;
}

interface AvailableClaimDeviceDto {
  device_id?: string;
  display_name?: string;
  model?: string;
  state?: string;
  requires_physical_confirm?: boolean;
  expires_at?: string | null;
}

interface AvailableClaimDevicesResponseDto {
  devices?: AvailableClaimDeviceDto[];
}

function normalizeAvailableDevice(dto: AvailableClaimDeviceDto): AvailableClaimDevice {
  return {
    deviceId: dto.device_id ?? '',
    displayName: dto.display_name ?? '',
    model: dto.model ?? '',
    state: dto.state ?? '',
    requiresPhysicalConfirm: dto.requires_physical_confirm ?? false,
    expiresAt: dto.expires_at ?? null,
  };
}

export async function listAvailableClaimDevices(): Promise<AvailableClaimDevice[]> {
  const response = await client.get<AvailableClaimDevicesResponseDto>('/claim/available-devices');
  return (response.data.devices ?? []).map(normalizeAvailableDevice);
}

export interface RequestClaimParams {
  deviceId: string;
}

export type ClaimRequestStatus = 'WAITING_PHYSICAL_CONFIRM' | string;

export interface ClaimRequestResult {
  claimId: string;
  deviceId: string;
  status: ClaimRequestStatus;
  message: string;
  expiresAt: string;
}

interface ClaimRequestResponseDto {
  claim_id?: string;
  device_id?: string;
  state?: string;
  status?: string;
  message?: string;
  expires_at?: string;
}

function normalizeClaimRequest(dto: ClaimRequestResponseDto | undefined): ClaimRequestResult {
  const data = dto ?? {};
  return {
    claimId: data.claim_id ?? '',
    deviceId: data.device_id ?? '',
    status: data.status ?? data.state ?? 'WAITING_PHYSICAL_CONFIRM',
    message: data.message ?? '',
    expiresAt: data.expires_at ?? '',
  };
}

export async function requestClaim(params: RequestClaimParams): Promise<ClaimRequestResult> {
  const response = await client.post<ClaimRequestResponseDto>('/claim/request', {
    device_id: params.deviceId,
  });
  return normalizeClaimRequest(response.data);
}

export type ClaimStatus =
  | 'WAITING_PHYSICAL_CONFIRM'
  | 'CLAIM_CONFIRMED'
  | 'CLAIMED'
  | 'CLAIM_CONFIRM_TIMEOUT'
  | 'FAILED'
  | string;

export interface ClaimStatusResult {
  claimId: string;
  deviceId: string;
  status: ClaimStatus;
  online: boolean;
  expiresAt: string | null;
  failureCode: string | null;
}

interface ClaimStatusResponseDto {
  claim_id?: string;
  device_id?: string;
  status?: string;
  online?: boolean;
  expires_at?: string | null;
  failure_code?: string | null;
}

function normalizeClaimStatus(dto: ClaimStatusResponseDto | undefined): ClaimStatusResult {
  const data = dto ?? {};
  return {
    claimId: data.claim_id ?? '',
    deviceId: data.device_id ?? '',
    status: data.status ?? 'WAITING_PHYSICAL_CONFIRM',
    online: data.online ?? false,
    expiresAt: data.expires_at ?? null,
    failureCode: data.failure_code ?? null,
  };
}

export async function getClaimStatus(claimId: string): Promise<ClaimStatusResult> {
  const response = await client.get<ClaimStatusResponseDto>(
    `/claim/status/${encodeURIComponent(claimId)}`,
  );
  return normalizeClaimStatus(response.data);
}

// ---------------------------------------------------------------------------
// BLE verification code — POST /v1/devices/ble-code/{serialNumber}
// ---------------------------------------------------------------------------

export interface BleCodeResult {
  /** 6-character BLE pairing code (hex, uppercase). */
  code: string;
  /** ISO-8601 expiry (5 minutes after issuance). */
  expiresAt: string;
}

interface BleCodeResponseDto {
  code?: string;
  expires_at?: string;
  expiresAt?: string;
}

/**
 * Generate the BLE verification code for a serial so the zero-code flow can
 * claim without the parent typing anything. Backend rate-limits this (429).
 */
export async function generateBleCode(serialNumber: string): Promise<BleCodeResult> {
  const response = await client.post<BleCodeResponseDto>(
    `/devices/ble-code/${encodeURIComponent(serialNumber)}`,
  );
  const data = response.data ?? {};
  return {
    code: data.code ?? '',
    expiresAt: data.expires_at ?? data.expiresAt ?? '',
  };
}

// ---------------------------------------------------------------------------
// Bootstrap discovery — GET /v1/device/bootstrap (public, no auth)
// ---------------------------------------------------------------------------
//
// The connection URLs (ws_url in particular) are owned by the backend and MUST
// be consumed from here rather than hardcoded on the client. This mirrors what
// the firmware does on first boot to seed NVS.

export interface BootstrapPairingConfig {
  enabled: boolean;
  ttlSeconds: number;
  bleTimeoutSeconds: number;
  apTimeoutSeconds: number;
}

export interface BootstrapConfig {
  apiUrl: string;
  espServerUrl: string;
  otaUrl: string;
  /** Realtime WebSocket URL — consume this; never construct a ws:// by hand. */
  wsUrl: string;
  pairing: BootstrapPairingConfig;
}

interface BootstrapResponseDto {
  api_url?: string;
  esp_server_url?: string;
  ota_url?: string;
  ws_url?: string;
  websocket?: {
    url?: string;
  };
  pairing?: {
    enabled?: boolean;
    ttl_seconds?: number;
    ble_timeout_seconds?: number;
    ap_timeout_seconds?: number;
  };
}

function normalizeBootstrap(dto: BootstrapResponseDto | undefined): BootstrapConfig {
  const data = dto ?? {};
  const pairing = data.pairing ?? {};
  return {
    apiUrl: data.api_url ?? '',
    espServerUrl: data.esp_server_url ?? '',
    otaUrl: data.ota_url ?? '',
    wsUrl: data.ws_url ?? data.websocket?.url ?? '',
    pairing: {
      enabled: pairing.enabled ?? false,
      ttlSeconds: pairing.ttl_seconds ?? 0,
      bleTimeoutSeconds: pairing.ble_timeout_seconds ?? 0,
      apTimeoutSeconds: pairing.ap_timeout_seconds ?? 0,
    },
  };
}

/**
 * Fetch env-driven connection config and pairing timeouts. Public endpoint — no
 * auth required. Realtime callers consume {@link BootstrapConfig.wsUrl}.
 */
export async function fetchBootstrapConfig(): Promise<BootstrapConfig> {
  const response = await client.get<BootstrapResponseDto>('/device/bootstrap');
  return normalizeBootstrap(response.data);
}
