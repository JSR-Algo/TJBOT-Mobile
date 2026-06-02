type NotificationResponseLike = {
  readonly notification?: {
    readonly request?: {
      readonly content?: {
        readonly data?: Record<string, unknown>;
      };
    };
  };
};

type InitialNotificationSource = {
  readonly getLastNotificationResponseAsync?: () => Promise<NotificationResponseLike | null>;
};

export function notificationPayloadToUrl(payload: Record<string, unknown> | undefined): string | null {
  if (!payload) return null;

  const explicit = getString(payload, 'deepLink') ?? getString(payload, 'url');
  if (explicit) return explicit.startsWith('TJBot://') ? explicit : null;

  const target = getString(payload, 'target');
  if (target === 'settings_account') return 'TJBot://settings/account';
  if (target === 'settings_data_privacy') return 'TJBot://settings/data-privacy';

  const deviceId = getString(payload, 'deviceId') ?? getString(payload, 'device_id');
  if (!deviceId) return null;

  const summaryDate = getString(payload, 'summaryDate') ?? getString(payload, 'summary_date') ?? getString(payload, 'date');
  if (summaryDate) {
    return `TJBot://device/${encodeURIComponent(deviceId)}/summary/${encodeURIComponent(summaryDate)}`;
  }

  return `TJBot://device/${encodeURIComponent(deviceId)}`;
}

function getString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function notificationResponsePayload(response: NotificationResponseLike): Record<string, unknown> | undefined {
  return response.notification?.request?.content?.data;
}

export async function getInitialNotificationUrl(source: InitialNotificationSource | null): Promise<string | null> {
  if (!source?.getLastNotificationResponseAsync) return null;
  const response = await source.getLastNotificationResponseAsync();
  return response ? notificationPayloadToUrl(notificationResponsePayload(response)) : null;
}

export async function openNotificationResponseUrl(
  response: NotificationResponseLike,
  openUrl: (url: string) => Promise<unknown>,
): Promise<void> {
  const url = notificationPayloadToUrl(notificationResponsePayload(response));
  if (url) await openUrl(url);
}
