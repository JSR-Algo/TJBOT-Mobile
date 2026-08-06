import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import NeedsSyncScreen from '@/features/course-library/screens/NeedsSyncScreen';
import client from '@/services/http/client';
import type { DeviceStatus } from '@/services/api/device.api';

// T3.1 — NeedsSyncScreen's "Reconnect Robot now" is the parent's only retry after
// a FAILED/needs_sync assignment. It used to call GET /course-library/:id/sync-status,
// which the backend retired: course-library.controller.ts answers 410 ENDPOINT_RETIRED
// unconditionally. The screen caught the error and told the parent to check their
// Wi-Fi, so the button could never succeed no matter what the robot did.
//
// These tests drive the REAL http client (mocked at the adapter) so they assert the
// actual URLs the screen requests — the previous suite mocked getRobotSyncStatus
// itself, which is exactly why a permanently-410 call looked healthy in CI.
jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

const mockedClient = client as jest.Mocked<typeof client>;

const DEVICE: DeviceStatus = {
  id: 'dev-1',
  name: 'Casa Robot',
  online: true,
  batteryPercent: 80,
} as DeviceStatus;

function navigationFor() {
  return {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    canGoBack: jest.fn(() => true),
    isFocused: jest.fn(() => true),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
  };
}

function renderScreen(params: Record<string, unknown> | undefined) {
  const navigation = navigationFor();
  render(
    <NeedsSyncScreen
      navigation={navigation as never}
      route={{ key: 'ns', name: ROUTES.NeedsSyncScreen, params } as never}
    />,
  );
  return navigation;
}

function requestedPaths(): string[] {
  return mockedClient.get.mock.calls.map((call) => String(call[0]));
}

/** Preload payload in the server's snake_case wire shape. */
function preload(state: string) {
  return {
    data: {
      data: {
        assignment_id: 'asg-1',
        state,
        profile: 'espTft',
        critical_total: 3,
        critical_ready: state === 'READY' ? 3 : 1,
        assets: [],
      },
    },
  };
}

describe('NeedsSyncScreen reconnect uses live device preload status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('never calls the retired /course-library/:id/sync-status endpoint', async () => {
    mockedClient.get.mockImplementation(async (path: string) => {
      if (path === '/devices/household/me') return { data: { data: [DEVICE] } } as never;
      if (path === '/devices/dev-1/preload-status') return preload('READY') as never;
      throw new Error(`unexpected GET ${path}`);
    });

    renderScreen({ courseId: 'c_zoo', deviceId: 'dev-1' });
    await act(async () => {
      fireEvent.press(screen.getByText('Reconnect Robot now'));
    });

    await waitFor(() => expect(mockedClient.get).toHaveBeenCalled());
    expect(requestedPaths().some((path) => path.includes('sync-status'))).toBe(false);
    expect(requestedPaths().some((path) => path.includes('/course-library/'))).toBe(false);
  });

  it('READY preload advances to CourseAddedScreen', async () => {
    mockedClient.get.mockImplementation(async (path: string) => {
      if (path === '/devices/dev-1/preload-status') return preload('READY') as never;
      throw new Error(`unexpected GET ${path}`);
    });

    const navigation = renderScreen({ courseId: 'c_zoo', deviceId: 'dev-1' });
    await act(async () => {
      fireEvent.press(screen.getByText('Reconnect Robot now'));
    });

    await waitFor(() =>
      expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CourseAddedScreen, { courseId: 'c_zoo' }),
    );
    expect(screen.queryByText(/hasn't finished downloading/i)).toBeNull();
  });

  it('non-READY preload keeps the parent on the screen with actionable guidance', async () => {
    mockedClient.get.mockImplementation(async (path: string) => {
      if (path === '/devices/dev-1/preload-status') return preload('PRELOADING') as never;
      throw new Error(`unexpected GET ${path}`);
    });

    const navigation = renderScreen({ courseId: 'c_zoo', deviceId: 'dev-1' });
    await act(async () => {
      fireEvent.press(screen.getByText('Reconnect Robot now'));
    });

    await waitFor(() => expect(screen.getByText(/hasn't finished downloading/i)).toBeTruthy());
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.CourseAddedScreen, expect.anything());
  });

  it('resolves the household device when no deviceId is routed in', async () => {
    mockedClient.get.mockImplementation(async (path: string) => {
      if (path === '/devices/household/me') return { data: { data: [DEVICE] } } as never;
      if (path === '/devices/dev-1/preload-status') return preload('READY') as never;
      throw new Error(`unexpected GET ${path}`);
    });

    const navigation = renderScreen({ courseId: 'c_zoo' });
    await act(async () => {
      fireEvent.press(screen.getByText('Reconnect Robot now'));
    });

    await waitFor(() => expect(requestedPaths()).toContain('/devices/household/me'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CourseAddedScreen, { courseId: 'c_zoo' });
  });

  it('surfaces a distinct message when no robot is paired yet (no dead end)', async () => {
    mockedClient.get.mockImplementation(async (path: string) => {
      if (path === '/devices/household/me') return { data: { data: [] } } as never;
      throw new Error(`unexpected GET ${path}`);
    });

    const navigation = renderScreen({ courseId: 'c_zoo' });
    await act(async () => {
      fireEvent.press(screen.getByText('Reconnect Robot now'));
    });

    await waitFor(() => expect(screen.getByText(/no robot/i)).toBeTruthy());
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.CourseAddedScreen, expect.anything());
  });

  it('a network failure is reported as a retryable connection problem', async () => {
    mockedClient.get.mockRejectedValue(new Error('offline'));

    const navigation = renderScreen({ courseId: 'c_zoo', deviceId: 'dev-1' });
    await act(async () => {
      fireEvent.press(screen.getByText('Reconnect Robot now'));
    });

    await waitFor(() => expect(screen.getByText(/couldn't reach/i)).toBeTruthy());
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.CourseAddedScreen, expect.anything());
  });

  it('double-tap issues a single preload check (no duplicate in-flight requests)', async () => {
    let resolvePreload: ((value: unknown) => void) | undefined;
    mockedClient.get.mockImplementation((path: string) => {
      if (path === '/devices/dev-1/preload-status') {
        return new Promise((resolve) => {
          resolvePreload = resolve;
        }) as never;
      }
      throw new Error(`unexpected GET ${path}`);
    });

    renderScreen({ courseId: 'c_zoo', deviceId: 'dev-1' });
    const button = screen.getByText('Reconnect Robot now');
    await act(async () => {
      fireEvent.press(button);
      fireEvent.press(button);
    });

    const preloadCalls = requestedPaths().filter((path) => path === '/devices/dev-1/preload-status');
    expect(preloadCalls).toHaveLength(1);

    await act(async () => {
      resolvePreload?.(preload('READY'));
    });
  });
});
