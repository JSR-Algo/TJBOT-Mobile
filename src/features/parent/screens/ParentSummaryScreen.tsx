import React from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronRight, HelpCircle, LockKeyhole, ShieldCheck, SlidersHorizontal, UserRound } from 'lucide-react-native';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import { Reveal } from '@/design-system/animations';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useAppLanguage } from '@/services/i18n/i18n';
import ParentScroll, { PA } from '../components/ParentScroll';
import { useParentGateGuard } from '../hooks/useParentGateGuard';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentSummaryScreen'>;
type IconComponent = React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

type ParentMenuRowProps = {
  icon: IconComponent;
  label: string;
  value?: string;
  destructive?: boolean;
  onPress: () => void;
};

export default function ParentSummaryScreen({ navigation }: Props) {
  const { t } = useAppLanguage();
  const { user, logout } = useAuth();
  useParentGateGuard(navigation, ROUTES.ParentSummaryScreen);

  const parentName = user?.name?.trim() || t('Parent');
  const parentEmail = user?.email?.trim() || '';
  const initials = profileInitials(parentName, parentEmail);

  const confirmSignOut = () => {
    Alert.alert(
      t('Sign out'),
      t('Sign out of TeeBot on this device?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        { text: t('Sign out'), style: 'destructive', onPress: () => void logout() },
      ],
    );
  };

  return (
    <ParentScroll title={t('Parent Zone')}>
      <Box paddingHorizontal={24} paddingTop={10}>
        <Reveal index={0} testID="parentProfileReveal">
          <TouchableOpacity
            testID="parentProfileCard"
            accessibilityRole="button"
            accessibilityLabel={t('Edit Profile')}
            activeOpacity={0.78}
            onPress={() => navigation.navigate(ROUTES.ParentAccountPrivacyScreen)}
            style={styles.profileCard}
          >
            <View style={styles.avatar}>
              <Text i18n={false} fontWeight="800" style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text i18n={false} fontWeight="800" numberOfLines={1} ellipsizeMode="tail" style={styles.profileName}>
                {parentName}
              </Text>
              {parentEmail ? (
                <Text i18n={false} numberOfLines={1} ellipsizeMode="tail" style={styles.profileEmail}>
                  {parentEmail}
                </Text>
              ) : null}
            </View>
            <Text fontWeight="700" numberOfLines={1} style={styles.editProfile}>{t('Edit Profile')}</Text>
          </TouchableOpacity>
        </Reveal>

        <Reveal index={1} testID="parentSafetyReveal">
          <SectionTitle>{t('Safety & Limits')}</SectionTitle>
          <View style={styles.safetyGrid}>
            <SafetyTile
              icon={SlidersHorizontal}
              label={t('Daily Limit')}
              value={t('Manage limits')}
              tone="mint"
              onPress={() => navigation.navigate(ROUTES.ParentSafetyScreen)}
            />
            <SafetyTile
              icon={ShieldCheck}
              label={t('Safety Filter')}
              value={t('Review settings')}
              tone="lavender"
              onPress={() => navigation.navigate(ROUTES.ParentSafetyScreen)}
            />
          </View>
        </Reveal>

        <Reveal index={2} testID="parentAccountReveal">
          <SectionTitle>{t('Account')}</SectionTitle>
          <View style={styles.menuCard}>
            <ParentMenuRow
              icon={UserRound}
              label={t('Account')}
              onPress={() => navigation.navigate(ROUTES.ParentAccountPrivacyScreen)}
            />
            <Divider />
            <ParentMenuRow
              icon={LockKeyhole}
              label={t('Subscription')}
              value={t('Manage')}
              onPress={() => navigation.navigate(ROUTES.SubscriptionsScreen)}
            />
            <Divider />
            <ParentMenuRow
              icon={HelpCircle}
              label={t('Help & FAQ')}
              onPress={() => navigation.navigate(ROUTES.HelpFaqScreen)}
            />
          </View>
        </Reveal>

        {/* Destructive control stays visually stable — no entrance motion. */}
        <TouchableOpacity
          testID="parentSignOut"
          accessibilityRole="button"
          activeOpacity={0.78}
          onPress={confirmSignOut}
          style={styles.signOutButton}
        >
          <Text fontWeight="800" style={styles.signOutText}>{t('Sign out')}</Text>
        </TouchableOpacity>
      </Box>
    </ParentScroll>
  );
}

function ParentMenuRow({ icon: Icon, label, value, destructive = false, onPress }: ParentMenuRowProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.74}
      onPress={onPress}
      style={styles.menuRow}
    >
      <View style={[styles.menuIcon, destructive && styles.menuIconDestructive]}>
        <Icon color={destructive ? PA.accent : PA.ink2} size={20} strokeWidth={2.2} />
      </View>
      <Text fontWeight="700" style={[styles.menuLabel, destructive && styles.destructiveText]}>{label}</Text>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      <ChevronRight color={PA.ink3} size={19} strokeWidth={2.2} />
    </TouchableOpacity>
  );
}

function SafetyTile({
  icon: Icon,
  label,
  onPress,
  tone,
  value,
}: {
  icon: IconComponent;
  label: string;
  onPress: () => void;
  tone: 'mint' | 'lavender';
  value: string;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.safetyTile, tone === 'mint' ? styles.safetyTileMint : styles.safetyTileLavender]}
    >
      <View style={styles.safetyIcon}>
        <Icon color={tone === 'mint' ? '#187A54' : '#6752A8'} size={21} strokeWidth={2.4} />
      </View>
      <Text fontWeight="800" style={styles.safetyLabel}>{label}</Text>
      <Text fontWeight="700" style={styles.safetyValue}>{value}</Text>
    </TouchableOpacity>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text fontWeight="800" style={styles.sectionTitle}>{children}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function profileInitials(name: string, email: string): string {
  const source = name.trim() || email.split('@')[0] || 'P';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'P';
}

const styles = StyleSheet.create({
  profileCard: {
    minHeight: 86,
    borderRadius: 26,
    backgroundColor: PA.card,
    borderWidth: 1,
    borderColor: PA.hair,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: PA.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFE8E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: PA.accent,
    fontSize: 20,
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  profileName: {
    color: PA.ink,
    fontSize: 18,
    lineHeight: 24,
  },
  profileEmail: {
    color: PA.ink2,
    fontSize: 13,
    lineHeight: 18,
  },
  editProfile: {
    color: PA.accent,
    fontSize: 13,
  },
  sectionTitle: {
    color: PA.ink2,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 28,
    marginBottom: 10,
    marginLeft: 4,
  },
  safetyGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  safetyTile: {
    flex: 1,
    minWidth: 0,
    minHeight: 144,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'flex-end',
    shadowColor: PA.ink,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  safetyTileMint: { backgroundColor: '#DCF6E9' },
  safetyTileLavender: { backgroundColor: '#EEE8FF' },
  safetyIcon: {
    position: 'absolute',
    top: 15,
    left: 15,
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyLabel: { color: PA.ink, fontSize: 16, lineHeight: 21 },
  safetyValue: { color: PA.ink2, fontSize: 12, lineHeight: 17, marginTop: 5 },
  menuCard: {
    borderRadius: 24,
    backgroundColor: PA.card,
    borderWidth: 1,
    borderColor: PA.hair,
    overflow: 'hidden',
  },
  menuRow: {
    minHeight: 68,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F5EEE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDestructive: {
    backgroundColor: '#FFF0EC',
  },
  menuLabel: {
    flex: 1,
    color: PA.ink,
    fontSize: 16,
  },
  menuValue: {
    color: PA.ink3,
    fontSize: 13,
  },
  destructiveText: {
    color: PA.accent,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PA.hair,
    marginLeft: 66,
  },
  signOutButton: {
    minHeight: 58,
    marginTop: 28,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD2C8',
    backgroundColor: '#FFF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: PA.accent,
    fontSize: 16,
  },
});
