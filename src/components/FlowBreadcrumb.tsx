import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors } from '@/design-system/referenceTheme';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = {
  currentIndex: number;
  steps: readonly string[];
  testID?: string;
};

export default function FlowBreadcrumb({ currentIndex, steps, testID }: Props): React.JSX.Element {
  const { t } = useAppLanguage();

  return (
    <View
      accessibilityLabel={steps.map(step => t(step)).join(', ')}
      accessibilityRole="summary"
      style={styles.root}
      testID={testID}
    >
      {steps.map((step, index) => {
        const isCurrent = index === currentIndex;
        const isComplete = index < currentIndex;
        return (
          <React.Fragment key={step}>
            {index > 0 ? (
              <ChevronRight color={referenceColors.inkMuted} size={13} strokeWidth={2.4} />
            ) : null}
            <View style={[styles.step, isCurrent && styles.currentStep, isComplete && styles.completeStep]}>
              <Text
                i18n={false}
                fontWeight={isCurrent ? '800' : '700'}
                numberOfLines={1}
                style={[styles.label, isCurrent && styles.currentLabel]}
              >
                {t(step)}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  step: {
    backgroundColor: referenceColors.cardSoft,
    borderRadius: 999,
    maxWidth: 142,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  currentStep: { backgroundColor: referenceColors.primarySoft },
  completeStep: { backgroundColor: referenceColors.secondarySoft },
  label: { color: referenceColors.inkMuted, fontSize: 10 },
  currentLabel: { color: referenceColors.primary },
});
