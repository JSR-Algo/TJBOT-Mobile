import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

export const AUTH_STACK_SCREEN_OPTIONS = {
  headerShown: false,
  animation: 'fade',
  gestureEnabled: false,
} satisfies NativeStackNavigationOptions;

export const ONBOARDING_STACK_SCREEN_OPTIONS = {
  headerShown: false,
  animation: 'slide_from_right',
  gestureEnabled: false,
} satisfies NativeStackNavigationOptions;

export const PROTECTED_STACK_SCREEN_OPTIONS = {
  headerShown: false,
  animation: 'slide_from_right',
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
} satisfies NativeStackNavigationOptions;

export const MODAL_STACK_SCREEN_OPTIONS = {
  headerShown: false,
  presentation: 'modal',
  animation: 'slide_from_bottom',
  gestureEnabled: true,
} satisfies NativeStackNavigationOptions;
