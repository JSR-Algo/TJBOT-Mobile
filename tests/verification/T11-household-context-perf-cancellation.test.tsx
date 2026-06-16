/**
 * Verification test for T11: Parallelize household fetches and replace arbitrary timeouts.
 *
 * This test must fail on the current HouseholdContext implementation and pass after
 * the T11 refactor:
 *   - refresh() fetches households and active-household children in parallel
 *   - in-flight requests are cancelled on unmount via AbortController
 *   - the 12 s fallback timeout is removed
 *   - last-known household data is cached in AsyncStorage
 *   - the provider value is memoized
 */

import React, { useRef, useState } from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import { Text, Button, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const authState = { isAuthenticated: false, isLoading: false };

const mockList = jest.fn() as jest.Mock<Promise<unknown[]>>;
const mockListChildren = jest.fn() as jest.Mock<Promise<unknown[]>>;

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => authState,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../src/services/api/households', () => ({
  list: (...args: unknown[]) => mockList(...args),
  listChildren: (...args: unknown[]) => mockListChildren(...args),
  create: jest.fn(),
  addChild: jest.fn(),
  get: jest.fn(),
  updateChild: jest.fn(),
  archiveChild: jest.fn(),
  deleteChild: jest.fn(),
  setActiveChild: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage');

import { HouseholdProvider, useHousehold } from '../../src/contexts/HouseholdContext';

const HOUSEHOLDS_CACHE_KEY = '@tbot/household-context:households';
const ONBOARDING_KEY = 'onboarding_complete_v1';

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function LoadingProbe(): React.JSX.Element {
  const ctx = useHousehold();
  return <Text testID="loading">{ctx.isLoading ? 'LOADING' : 'IDLE'}</Text>;
}

function HouseholdNameProbe(): React.JSX.Element {
  const ctx = useHousehold();
  return <Text testID="name">{ctx.households[0]?.name ?? 'NONE'}</Text>;
}

function RefreshProbe(): React.JSX.Element {
  const ctx = useHousehold();
  return (
    <TouchableOpacity testID="refresh" onPress={() => { void ctx.refresh(); }}>
      <Text>Refresh</Text>
    </TouchableOpacity>
  );
}

function RenderCountProbe(): React.JSX.Element {
  const _ctx = useHousehold();
  const renders = useRef(0);
  renders.current += 1;
  return <Text testID="renders">{renders.current}</Text>;
}

describe('HouseholdContext performance & cancellation (T11)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await SecureStore.deleteItemAsync(ONBOARDING_KEY);
    authState.isAuthenticated = false;
    authState.isLoading = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('hydrates the last known household list from AsyncStorage before the API responds', async () => {
    await AsyncStorage.setItem(
      HOUSEHOLDS_CACHE_KEY,
      JSON.stringify([{ id: 'cached-hh', name: 'Cached Home' }]),
    );

    authState.isAuthenticated = true;
    const listDefer = deferred<unknown[]>();
    mockList.mockImplementation(() => listDefer.promise);

    const { getByTestId } = render(
      <HouseholdProvider>
        <HouseholdNameProbe />
      </HouseholdProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByTestId('name').props.children).toBe('Cached Home');
  });

  it('writes the resolved household list to AsyncStorage after a successful refresh', async () => {
    authState.isAuthenticated = true;
    mockList.mockResolvedValue([{ id: 'api-hh', name: 'API Home' }]);
    mockListChildren.mockResolvedValue([]);

    const { getByTestId } = render(
      <HouseholdProvider>
        <LoadingProbe />
      </HouseholdProvider>,
    );

    await waitFor(() => expect(getByTestId('loading').props.children).toBe('IDLE'));

    await waitFor(() =>
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        HOUSEHOLDS_CACHE_KEY,
        JSON.stringify([{ id: 'api-hh', name: 'API Home' }]),
      ),
    );
  });

  it('fetches households and active-household children in parallel on refresh', async () => {
    authState.isAuthenticated = true;

    // Prime an active household with a first successful refresh.
    mockList.mockResolvedValue([{ id: 'hh-1', name: 'Home' }]);
    mockListChildren.mockResolvedValue([{ id: 'child-1', name: 'Kid' }]);

    const { getByTestId } = render(
      <HouseholdProvider>
        <LoadingProbe />
        <RefreshProbe />
      </HouseholdProvider>,
    );

    await waitFor(() => expect(getByTestId('loading').props.children).toBe('IDLE'));

    // Reset mocks and make both calls hang so we can observe that both were started.
    mockList.mockReset();
    mockListChildren.mockReset();

    const listDefer = deferred<unknown[]>();
    const childrenDefer = deferred<unknown[]>();
    mockList.mockImplementation(() => listDefer.promise);
    mockListChildren.mockImplementation(() => childrenDefer.promise);

    fireEvent.press(getByTestId('refresh'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockListChildren).toHaveBeenCalledTimes(1);
    expect(mockListChildren).toHaveBeenCalledWith('hh-1');
  });

  it('aborts in-flight refresh requests on unmount with AbortController', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    authState.isAuthenticated = true;

    const listDefer = deferred<unknown[]>();
    mockList.mockImplementation(() => listDefer.promise);

    const { unmount } = render(
      <HouseholdProvider>
        <LoadingProbe />
      </HouseholdProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockList).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      await Promise.resolve();
    });

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });

  it('does not fall back to a 12 s arbitrary loading timeout', async () => {
    jest.useFakeTimers();
    authState.isAuthenticated = true;

    // Never resolve: we want to see what happens after the old 12 s window.
    mockList.mockImplementation(() => new Promise<unknown[]>(() => {}));

    const { getByTestId } = render(
      <HouseholdProvider>
        <LoadingProbe />
      </HouseholdProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByTestId('loading').props.children).toBe('LOADING');

    act(() => {
      jest.advanceTimersByTime(13000);
    });

    // After the fix there is no 12 s fallback clearing loading state.
    expect(getByTestId('loading').props.children).toBe('LOADING');
  });

  it('memoizes the provider value to avoid re-render cascades', async () => {
    function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
      const [tick, setTick] = useState(0);
      return (
        <>
          <HouseholdProvider>{children}</HouseholdProvider>
          <Button title="tick" onPress={() => setTick((t) => t + 1)} testID="tick" />
          <Text testID="tick-val">{tick}</Text>
        </>
      );
    }

    const { getByTestId } = render(
      <Wrapper>
        <RenderCountProbe />
      </Wrapper>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByTestId('renders').props.children).toBe(1);

    fireEvent.press(getByTestId('tick'));

    expect(getByTestId('tick-val').props.children).toBe(1);
    expect(getByTestId('renders').props.children).toBe(1);
  });
});
