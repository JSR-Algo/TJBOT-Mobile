import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import ParentScroll, {
  PARENT_SCROLL_TAB_CLEARANCE,
} from '@/features/parent/components/ParentScroll';

describe('ParentScroll tab-bar clearance', () => {
  it('exports clearance above the floating tab bar height (~96px)', () => {
    expect(PARENT_SCROLL_TAB_CLEARANCE).toBeGreaterThanOrEqual(110);
  });

  it('applies contentContainer bottom inset so last CTAs are not under tabs', () => {
    const { getByTestId } = render(
      <ParentScroll title="Parent Space">
        <Text>Return to child play area</Text>
      </ParentScroll>,
    );

    const scroll = getByTestId('parentScroll');
    const contentStyle = Array.isArray(scroll.props.contentContainerStyle)
      ? Object.assign({}, ...scroll.props.contentContainerStyle)
      : scroll.props.contentContainerStyle;

    expect(contentStyle?.paddingBottom).toBe(PARENT_SCROLL_TAB_CLEARANCE);
  });
});
