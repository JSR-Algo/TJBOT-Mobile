import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { Home } from 'lucide-react-native';
import { MainTabNavigator, routeBreadcrumbsFor } from '@/navigation/MainTabNavigator';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { ChildProfileAvatar } from '@/navigation/ChildProfileAvatar';
import { MainTabIcon, SLEEK_TAB_ICON_SOURCES, SLEEK_TAB_IDLE_ICON_SOURCES } from '@/navigation/SleekTabBarVisuals';

describe('main tab active state', () => {
  it('renders a selected indicator and stronger icon stroke for the focused stroke fallback', () => {
    const screen = render(<MainTabIcon Icon={Home} color="#FF6B6B" focused />);

    const containerStyle = StyleSheet.flatten(screen.getByTestId('mainTabIconContainer').props.style);
    expect(containerStyle).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(255, 107, 107, 0.16)',
      }),
    );

    const icon = screen.getByTestId('icon-Home');
    expect(icon.props.color).toBe('#FF6B6B');
    expect(icon.props.strokeWidth).toBe(2.8);
  });

  it('keeps inactive stroke fallback icons muted without the selected indicator', () => {
    const screen = render(<MainTabIcon Icon={Home} color="#636E72" focused={false} />);

    const containerStyle = StyleSheet.flatten(screen.getByTestId('mainTabIconContainer').props.style);
    expect(containerStyle).toEqual(
      expect.objectContaining({
        backgroundColor: 'transparent',
      }),
    );

    const icon = screen.getByTestId('icon-Home');
    expect(icon.props.color).toBe('#636E72');
    expect(icon.props.strokeWidth).toBe(2.2);
  });

  it('shows full-color local artwork when the Home tab is selected', () => {
    const screen = render(
      <MainTabIcon
        Icon={Home}
        color="#FF6B6B"
        focused
        imageSource={SLEEK_TAB_ICON_SOURCES.Home}
      />,
    );

    const image = screen.getByTestId('mainTabColorIcon');
    expect(image.props.source).toBe(SLEEK_TAB_ICON_SOURCES.Home);
    expect(StyleSheet.flatten(image.props.style).opacity).toBeUndefined();
    expect(screen.queryByTestId('icon-Home')).toBeNull();
  });

  it('renders dedicated greyscale artwork when a tab is idle', () => {
    const screen = render(
      <MainTabIcon
        Icon={Home}
        color="#636E72"
        focused={false}
        imageSource={SLEEK_TAB_ICON_SOURCES.Devices}
        idleImageSource={SLEEK_TAB_IDLE_ICON_SOURCES.Devices}
        tabName="Devices"
      />,
    );

    const image = screen.getByTestId('mainTabColorIcon');
    expect(image.props.source).toBe(SLEEK_TAB_IDLE_ICON_SOURCES.Devices);
    expect(StyleSheet.flatten(image.props.style)).toEqual(expect.objectContaining({
      opacity: 0.92,
    }));
    const containerStyle = StyleSheet.flatten(screen.getByTestId('mainTabIconContainer').props.style);
    expect(containerStyle).toEqual(expect.objectContaining({ backgroundColor: 'transparent' }));
  });

  it('ships local colorful and idle sources for every main tab', () => {
    expect(Object.keys(SLEEK_TAB_ICON_SOURCES).sort()).toEqual(
      ['Devices', 'Home', 'Library', 'Profile', 'Progress'].sort(),
    );
    expect(Object.keys(SLEEK_TAB_IDLE_ICON_SOURCES).sort()).toEqual(
      ['Devices', 'Home', 'Library', 'Profile', 'Progress'].sort(),
    );
  });

  it('personalizes the child portrait and keeps a safe empty-name fallback', () => {
    const screen = render(
      <ChildProfileAvatar accessibilityLabel="Child profile" name="Lan" />,
    );
    expect(screen.getByTestId('appShellChildAvatarInitial').props.children).toBe('L');

    screen.rerender(
      <ChildProfileAvatar accessibilityLabel="Child profile" name="" />,
    );
    expect(screen.getByTestId('appShellChildAvatarInitial').props.children).toBe('?');
  });

  it('keeps the canonical Today header and Devices entry in the shared shell', () => {
    const navigation = {
      canGoBack: jest.fn(() => false),
      goBack: jest.fn(),
      navigate: jest.fn(),
    };
    const screen = render(
      <MainTabNavigator navigation={navigation} routeName={ROUTES.HomeHubScreen}>
        <View testID="homeContent" />
      </MainTabNavigator>,
    );

    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText("Mia's learning plan")).toBeTruthy();
    expect(screen.getByTestId('appShellProfile')).toBeTruthy();
    expect(screen.getByTestId('appShellChildAvatar').props.accessibilityRole).toBe('image');
    expect(screen.getByTestId('appShellChildAvatar').props.accessibilityLabel).toBe('Child profile');
    expect(screen.getByTestId('appShellChildAvatarInitial').props.children).toBe('M');
    expect(screen.getByTestId('appShellLanguage')).toBeTruthy();
    expect(screen.getByTestId('appShellSettings')).toBeTruthy();
    expect(screen.getByTestId('homeTab').props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(screen.getByTestId('devicesTab'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.DeviceHomeScreen);
  });

  it('falls back to Home when an OTA receives a stale persisted route', () => {
    const staleRoute = ROUTES.HomeChildProfileScreen;

    expect(routeBreadcrumbsFor(staleRoute)).toEqual([ROUTES.HomeHubScreen, staleRoute]);
  });

  it('animates the persistent pill indicator to the newly selected tab', () => {
    const start = jest.fn();
    const spring = jest.spyOn(Animated, 'spring').mockReturnValue({ start } as never);
    const navigation = {
      canGoBack: jest.fn(() => false),
      goBack: jest.fn(),
      navigate: jest.fn(),
    };
    const screen = render(
      <MainTabNavigator navigation={navigation} routeName={ROUTES.HomeHubScreen}>
        <View testID="homeContent" />
      </MainTabNavigator>,
    );

    spring.mockClear();
    screen.rerender(
      <MainTabNavigator navigation={navigation} routeName={ROUTES.CourseLibraryScreen}>
        <View testID="libraryContent" />
      </MainTabNavigator>,
    );

    expect(screen.getByTestId('authenticatedAppShellTabs')).toBeTruthy();
    expect(screen.getByTestId('activeTabIndicator')).toBeTruthy();
    expect(spring).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 2,
        useNativeDriver: true,
      }),
    );
    expect(start).toHaveBeenCalled();
    spring.mockRestore();
  });

  it('keeps Devices full-color with pill while every other tab is grey', () => {
    const navigation = {
      canGoBack: jest.fn(() => false),
      goBack: jest.fn(),
      navigate: jest.fn(),
    };
    const screen = render(
      <MainTabNavigator navigation={navigation} routeName={ROUTES.DeviceHomeScreen}>
        <View testID="devicesContent" />
      </MainTabNavigator>,
    );

    expect(screen.getByTestId('devicesTab').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('homeTab').props.accessibilityState).toEqual({ selected: false });
    expect(screen.getByTestId('libraryTab').props.accessibilityState).toEqual({ selected: false });
    expect(screen.getByTestId('progressTab').props.accessibilityState).toEqual({ selected: false });
    expect(screen.getByTestId('profileTab').props.accessibilityState).toEqual({ selected: false });
    expect(screen.getByTestId('activeTabIndicator')).toBeTruthy();

    const icons = screen.getAllByTestId('mainTabColorIcon');
    expect(icons).toHaveLength(5);
    const devicesIcon = icons.find(node => node.props.source === SLEEK_TAB_ICON_SOURCES.Devices);
    expect(devicesIcon).toBeTruthy();
    expect(StyleSheet.flatten(devicesIcon?.props.style).opacity).toBeUndefined();

    const idleSources = [
      SLEEK_TAB_IDLE_ICON_SOURCES.Home,
      SLEEK_TAB_IDLE_ICON_SOURCES.Library,
      SLEEK_TAB_IDLE_ICON_SOURCES.Progress,
      SLEEK_TAB_IDLE_ICON_SOURCES.Profile,
    ];
    for (const idleSource of idleSources) {
      const idleIcon = icons.find(node => node.props.source === idleSource);
      expect(idleIcon).toBeTruthy();
      expect(StyleSheet.flatten(idleIcon?.props.style)).toEqual(expect.objectContaining({ opacity: 0.92 }));
    }
  });

  it('does not keep Devices full-color when another tab is selected', () => {
    const navigation = {
      canGoBack: jest.fn(() => false),
      goBack: jest.fn(),
      navigate: jest.fn(),
    };
    const screen = render(
      <MainTabNavigator navigation={navigation} routeName={ROUTES.HomeHubScreen}>
        <View testID="homeContent" />
      </MainTabNavigator>,
    );

    expect(screen.getByTestId('homeTab').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('devicesTab').props.accessibilityState).toEqual({ selected: false });

    const icons = screen.getAllByTestId('mainTabColorIcon');
    const devicesIdle = icons.find(node => node.props.source === SLEEK_TAB_IDLE_ICON_SOURCES.Devices);
    expect(devicesIdle).toBeTruthy();
    expect(icons.some(node => node.props.source === SLEEK_TAB_ICON_SOURCES.Devices)).toBe(false);
    expect(icons.some(node => node.props.source === SLEEK_TAB_ICON_SOURCES.Home)).toBe(true);
  });
});
