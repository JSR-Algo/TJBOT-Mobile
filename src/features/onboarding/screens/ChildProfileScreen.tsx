import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Bot, Cat, Dog } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useHousehold } from '@/contexts/HouseholdContext';
import type { Child } from '@/types';
import { Config } from '@/config';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import * as authApi from '@/services/api/auth';
import { finalizeDevicePairing } from '@/features/device/pairing/finalizeDevicePairing';
import {
  allowsDevelopmentCoppaConsentBypass,
  childProfileSaveErrorMessage,
  pairingFinalizeErrorMessage,
  saveOnboardingChildProfile,
} from '../childProfileSave';

type Props = NativeStackScreenProps<RootStackParamList, 'ChildProfileScreen' | 'PairChildProfileScreen'> & {
  onProtectedFlowExit?: () => void;
};

const BUDDIES = [
  { id: 'dog', icon: Dog, label: 'Dog' },
  { id: 'cat', icon: Cat, label: 'Cat' },
  { id: 'robot', icon: Bot, label: 'Robot' },
] as const;

const AGES = [4, 5, 6] as const;
type ChildAge = (typeof AGES)[number];

function dobFromAge(age: ChildAge): string {
  return `${new Date().getFullYear() - age}-07-01`;
}

export default function ChildProfileScreen({ navigation, route, onProtectedFlowExit }: Props) {
  const { language, t } = useAppLanguage();
  const { activeHousehold, addChild, createHousehold } = useHousehold();
  const [childName, setChildName] = React.useState('');
  const [buddy, setBuddy] = React.useState<(typeof BUDDIES)[number]['id']>('dog');
  const [age, setAge] = React.useState<ChildAge>(5);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // In the from-pairing path, the child can be created successfully but the
  // finalize step still fail. Remember the created child so a retry FINISHES the
  // pairing for that same child instead of creating a duplicate profile.
  const createdChildRef = React.useRef<Child | null>(null);

  const returnToPreviousStep = (): void => {
    if (onProtectedFlowExit) {
      onProtectedFlowExit();
      return;
    }
    const pairing = route.params?.pairing;
    if (pairing) {
      navigation.navigate(ROUTES.PairRenameScreen, pairing);
      return;
    }
    navigation.navigate(ROUTES.ParentConsentScreen);
  };

  const saveChildProfile = async (): Promise<void> => {
    if (saving) return;
    const normalizedName = childName.trim();
    if (!normalizedName) {
      setError(t("Enter your child's name."));
      return;
    }
    setSaving(true);
    setError(null);

    let child: Child;
    if (createdChildRef.current) {
      // Retry of a from-pairing save whose child already exists — reuse it so we
      // finish the pairing rather than creating a duplicate profile.
      child = createdChildRef.current;
    } else {
      try {
        child = await saveOnboardingChildProfile({
          name: normalizedName,
          date_of_birth: dobFromAge(age),
          buddy,
        }, {
          activeHousehold,
          createHousehold,
          addChild,
          recordDevelopmentCoppaConsent: () => authApi.sendConsent('tok_test_bypass'),
          allowDevelopmentCoppaConsentBypass: allowsDevelopmentCoppaConsentBypass(__DEV__, Config.API_BASE_URL),
        });
      } catch (saveError: unknown) {
        setError(childProfileSaveErrorMessage(saveError));
        setSaving(false);
        return;
      }
      createdChildRef.current = child;
    }

    // Entered mid-pairing (PairRenameScreen routed here because the household had
    // no child): FINISH the pairing the parent started with the child they just
    // created, landing on the same DeviceHome/PairSuccess terminus as the happy
    // path. Do NOT fall through to MicAskScreen — that would abandon the
    // already-claimed robot in onboarding.
    const pairing = route.params?.pairing;
    if (pairing) {
      try {
        await finalizeDevicePairing(navigation, pairing, child.id);
      } catch (finalizeError: unknown) {
        // The child was created successfully; only the finalize step failed.
        // Surface a sensible error in-place (the parent can retry the save, which
        // now finds the existing child) rather than silently dead-ending.
        setError(pairingFinalizeErrorMessage(finalizeError));
      } finally {
        setSaving(false);
      }
      return;
    }

    if (onProtectedFlowExit) {
      onProtectedFlowExit();
      return;
    }

    // Plain onboarding (no pairing context): advance to the next onboarding step.
    navigation.navigate(ROUTES.MicAskScreen);
    setSaving(false);
  };

  return (
    <OnbShell
      title={t('Create profile')}
      step={1}
      total={3}
      onBack={returnToPreviousStep}
      backgroundColor="#E0F7FA"
      testID="childProfileScreen"
    >
      <Box paddingHorizontal={20} paddingTop={18} alignItems="center">
        <Text fontWeight="800" style={styles.stepBadge}>{t('Next step')}</Text>
        <Text fontWeight="800" style={styles.heading}>{t('Tell TeeBot about your child')}</Text>
      </Box>

      <Box testID="childProfileCard" style={styles.profileCard}>
      <Box paddingHorizontal={16} paddingTop={20}>
        <Text fontWeight="800" style={styles.fieldLabel}>{t("Child's name")}</Text>
        <TextInput
          value={childName}
          onChangeText={setChildName}
          placeholder={t('For example: Minh, Lan, or Tung')}
          placeholderTextColor={OB.ink3}
          style={styles.nameInput}
          autoCapitalize="words"
          autoCorrect={false}
          testID="childNameInput"
          accessibilityLabel={t("Child's name")}
        />
        <Text style={styles.note}>{t('So TeeBot can greet your child by name.')}</Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Text fontWeight="800" style={styles.fieldLabel}>{t('How old is your child?')}</Text>
        <Box style={styles.ageBandRow}>
          {AGES.map((candidate) => {
            const active = age === candidate;
            return (
              <TouchableOpacity
                key={candidate}
                onPress={() => setAge(candidate)}
                style={[styles.ageButton, active && styles.ageButtonActive]}
                activeOpacity={0.7}
                testID={candidate === 5 ? 'childAgeBand_PRE_K' : `childAge_${candidate}`}
                accessibilityRole="button"
                accessibilityLabel={translateTemplate('{{age}} years old', { age: candidate }, { locale: language })}
                accessibilityState={{ selected: active }}
              >
                <Text fontWeight="800" style={[styles.ageText, active && styles.ageTextActive]}>
                  {translateTemplate('{{age}} years old', { age: candidate }, { locale: language })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Text fontWeight="800" style={styles.fieldLabel}>{t('Which buddy does your child like?')}</Text>
        <Box style={styles.buddyGrid}>
          {BUDDIES.map((candidate) => {
            const active = buddy === candidate.id;
            const BuddyIcon = candidate.icon;
            return (
              <TouchableOpacity
                key={candidate.id}
                onPress={() => setBuddy(candidate.id)}
                style={[styles.buddyButton, active && styles.buddyButtonActive]}
                testID={`childBuddy_${candidate.id}`}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t(candidate.label)}
                accessibilityState={{ selected: active }}
              >
                <BuddyIcon size={40} color={active ? OB.accent : OB.ink3} strokeWidth={2.4} />
              </TouchableOpacity>
            );
          })}
        </Box>
      </Box>

      </Box>
      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30}>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}
        <OnbBigBtn testID="childProfileSaveButton" onClick={saveChildProfile}>{saving ? t('Saving...') : t('Continue')}</OnbBigBtn>
      </Box>
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    marginHorizontal: 16,
    marginTop: 22,
    paddingTop: 8,
    paddingBottom: 24,
    borderRadius: 44,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#F6E3CF',
    shadowColor: '#164E63',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  stepBadge: {
    fontSize: 10,
    color: OB.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heading: { fontSize: 32, color: OB.ink, lineHeight: 38, textAlign: 'center', letterSpacing: -0.5 },
  fieldLabel: { fontSize: 16, color: OB.ink, marginBottom: 12, marginLeft: 8 },
  nameInput: {
    minHeight: 62,
    borderWidth: 2,
    borderColor: OB.hair,
    borderRadius: 28,
    backgroundColor: OB.card,
    paddingHorizontal: 24,
    fontSize: 16,
    fontWeight: '700',
    color: OB.ink,
  },
  ageBandRow: { flexDirection: 'row', gap: 10 },
  ageButton: {
    flex: 1,
    minHeight: 60,
    borderWidth: 2,
    borderColor: OB.hair,
    borderRadius: 22,
    backgroundColor: OB.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageButtonActive: { borderColor: OB.accent, backgroundColor: OB.accent },
  ageText: { fontSize: 14, color: OB.ink2 },
  ageTextActive: { color: '#FFFFFF' },
  buddyGrid: { flexDirection: 'row', gap: 18 },
  buddyButton: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: OB.hair,
    borderRadius: 28,
    backgroundColor: OB.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buddyButtonActive: { borderColor: OB.accent },
  note: { fontSize: 12, color: OB.ink3, paddingTop: 8, paddingHorizontal: 12, lineHeight: 18 },
  error: { color: OB.danger, fontSize: 13, lineHeight: 19, marginBottom: 12 },
});
