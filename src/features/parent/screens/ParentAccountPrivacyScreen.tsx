import React from 'react';
import { Linking, StyleSheet, TextInput, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { Icon, type IconName } from '@/design-system/icons';
import ParentScroll, { PA } from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import {
  cancelAccountDeletion,
  getAccountDeletionStatus,
  getAccountExportStatus,
  requestAccountDeletion,
  requestAccountExport,
  refreshEntitlementsAfterPurchase,
  type AccountDeletionJob,
  type AccountExportJob,
} from '@/services/api/account';
import { normalizeError } from '@/utils/errors';
import { useParentGateGuard } from '../hooks/useParentGateGuard';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentAccountPrivacyScreen'>;

const DELETE_PHRASE = 'DELETE my account';

function newRequestId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function errorCode(error: unknown): string | undefined {
  return normalizeError(error).code;
}

function privacyErrorMessage(error: unknown): string {
  switch (errorCode(error)) {
    case 'FORBIDDEN':
      return 'You do not have permission for this account action.';
    case 'GONE':
      return 'This privacy link or export has expired. Request a new one.';
    case 'CONFLICT':
    case 'DELETION_NOT_CANCELABLE':
    case 'USER_EXISTS':
      return 'Request already exists or cannot start yet.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Privacy request limit reached. Try again later.';
    default:
      return 'Privacy request failed. Try again.';
  }
}

function subscriptionBlocksDeletion(status: string): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

function isSafeDownloadUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

function PrivacyActionButton({
  label,
  accessibilityLabel,
  onPress,
  style,
  textColor = PA.ink,
  disabled = false,
  icon,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void | Promise<void>;
  style: StyleProp<ViewStyle>;
  textColor?: string;
  disabled?: boolean;
  icon?: IconName;
}): React.ReactElement {
  const { t } = useAppLanguage();
  const state = disabled ? { disabled: true } : { disabled: false };
  return (
    <TouchableOpacity
      onPress={() => {
        void onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={t(accessibilityLabel)}
      accessibilityState={state}
      style={[style, disabled && styles.buttonDisabled]}
      activeOpacity={0.75}
    >
      <Box flexDirection="row" alignItems="center" gap={7}>
        {icon ? <Icon name={icon} size={16} color={textColor} strokeWidth={2.4} /> : null}
        <Text accessible={false} style={[styles.actionText, { color: textColor }]}>
          {label}
        </Text>
      </Box>
    </TouchableOpacity>
  );
}

export default function ParentAccountPrivacyScreen({ navigation }: Props) {
  useParentGateGuard(navigation, ROUTES.ParentAccountPrivacyScreen);
  const { t } = useAppLanguage();
  const [exportConfirm, setExportConfirm] = React.useState('');
  const [deleteConfirm, setDeleteConfirm] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [message, setMessage] = React.useState<string | null>(null);
  const [exportJob, setExportJob] = React.useState<AccountExportJob | null>(null);
  const [deletionJob, setDeletionJob] = React.useState<AccountDeletionJob | null>(null);
  const [subscriptionChecking, setSubscriptionChecking] = React.useState(true);
  const [subscriptionBlocked, setSubscriptionBlocked] = React.useState(false);
  const [subscriptionCheckFailed, setSubscriptionCheckFailed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    refreshEntitlementsAfterPurchase()
      .then((entitlements) => {
        if (mounted) {
          setSubscriptionChecking(false);
          setSubscriptionCheckFailed(false);
          setSubscriptionBlocked(subscriptionBlocksDeletion(entitlements.subscriptionStatus));
        }
      })
      .catch(() => {
        if (mounted) {
          setSubscriptionChecking(false);
          setSubscriptionCheckFailed(true);
          setSubscriptionBlocked(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const exportTitle = exportJob?.state === 'completed' ? 'Export ready' : exportJob ? 'Export pending' : 'No export requested';
  const deleteTitle =
    deletionJob?.status === 'cancelled'
      ? 'Deletion cancelled'
      : deletionJob?.status === 'in_grace_period'
        ? 'Deletion grace period active'
        : 'No deletion requested';
  const deletionDisabled = busy || subscriptionChecking || subscriptionBlocked || subscriptionCheckFailed;

  const createExport = async (): Promise<void> => {
    if (busy) return;
    if (exportConfirm !== 'EXPORT') {
      setMessage('Type EXPORT to request your account archive.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const job = await requestAccountExport(newRequestId('privacy-export'));
      setExportJob(job);
      setMessage('Export request received.');
    } catch (error: unknown) {
      setMessage(privacyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const refreshExport = async (): Promise<void> => {
    if (!exportJob || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      setExportJob(await getAccountExportStatus(exportJob.jobId));
    } catch (error: unknown) {
      setMessage(privacyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const createDeletion = async (): Promise<void> => {
    if (deletionDisabled) return;
    if (deleteConfirm !== DELETE_PHRASE) {
      setMessage(`Type ${DELETE_PHRASE} to continue.`);
      return;
    }
    if (!password) {
      setMessage('Enter your password to continue.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const job = await requestAccountDeletion(
        {
          confirmPhrase: DELETE_PHRASE,
          password,
          reason: 'Requested from mobile parent settings.',
        },
        newRequestId('privacy-delete'),
      );
      setDeletionJob(job);
      setPassword('');
      setMessage('Deletion scheduled. You can cancel during the grace period.');
    } catch (error: unknown) {
      setMessage(privacyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const refreshDeletion = async (): Promise<void> => {
    if (!deletionJob || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      setDeletionJob(await getAccountDeletionStatus(deletionJob.deletionJobId));
    } catch (error: unknown) {
      setMessage(privacyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const cancelDeletion = async (): Promise<void> => {
    if (!deletionJob || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const cancelled = await cancelAccountDeletion(deletionJob.deletionJobId);
      setDeletionJob(cancelled);
      setDeleteConfirm('');
      setPassword('');
      setMessage('Deletion cancelled. Your account remains active.');
    } catch (error: unknown) {
      setMessage(privacyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const openDownload = async (): Promise<void> => {
    if (exportJob?.signedUrl) {
      if (!isSafeDownloadUrl(exportJob.signedUrl)) {
        setMessage('Export download could not open. Request a new export if the link expired.');
        return;
      }
      try {
        await Linking.openURL(exportJob.signedUrl);
      } catch {
        setMessage('Export download could not open. Request a new export if the link expired.');
      }
    }
  };

  return (
    <ParentScroll title="Account privacy" onBack={() => navigation.navigate(ROUTES.ParentSettingsScreen)}>
      <Box paddingHorizontal={16} paddingTop={18} paddingBottom={8}>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {subscriptionBlocked ? (
          <Text style={styles.warning}>Cancel active subscription before deleting this account.</Text>
        ) : null}
        {subscriptionChecking ? (
          <Text style={styles.warning}>Checking subscription before account deletion.</Text>
        ) : null}
        {subscriptionCheckFailed ? (
          <Text style={styles.warning}>Subscription status unavailable. Try again before deleting this account.</Text>
        ) : null}
      </Box>

      <PRowGroup header="Export">
        <Box style={styles.section}>
          <Box flexDirection="row" alignItems="center" gap={10} style={styles.sectionHeading}>
            <Box style={styles.sectionIcon} alignItems="center" justifyContent="center">
              <Icon name="FileArchive" size={20} color={PA.accent} strokeWidth={2.3} />
            </Box>
            <Text fontWeight="600" style={styles.heading}>{exportTitle}</Text>
          </Box>
          <Text style={styles.body}>Your account archive is prepared securely and expires after the download window.</Text>
          <TextInput
            value={exportConfirm}
            onChangeText={setExportConfirm}
            placeholder="EXPORT"
            accessibilityLabel={t('Export confirmation')}
            placeholderTextColor={PA.ink3}
            autoCapitalize="characters"
            style={styles.input}
          />
          <Box flexDirection="row" gap={10} style={styles.buttonRow}>
            <PrivacyActionButton
              label="Request export"
              accessibilityLabel="Request account export"
              onPress={createExport}
              disabled={busy}
              style={styles.button}
              textColor="#fff"
              icon="PackageOpen"
            />
            {exportJob ? (
              <PrivacyActionButton
                label="Refresh export status"
                accessibilityLabel="Refresh account export status"
                onPress={refreshExport}
                disabled={busy}
                style={styles.secondaryButton}
                icon="RefreshCw"
              />
            ) : null}
          </Box>
          {exportJob?.signedUrl ? (
            <PrivacyActionButton
              label="Download export"
              accessibilityLabel="Download account export"
              onPress={openDownload}
              style={styles.linkButton}
              icon="Download"
            />
          ) : null}
        </Box>
      </PRowGroup>

      <PRowGroup header="Delete account">
        <Box style={styles.section}>
          <Box flexDirection="row" alignItems="center" gap={10} style={styles.sectionHeading}>
            <Box style={styles.dangerIcon} alignItems="center" justifyContent="center">
              <Icon name="Trash2" size={20} color="#C0392B" strokeWidth={2.3} />
            </Box>
            <Text fontWeight="600" style={styles.heading}>{deleteTitle}</Text>
          </Box>
          <Text style={styles.body}>Deletion starts a 30-day grace period before account data is removed.</Text>
          <TextInput
            value={deleteConfirm}
            onChangeText={setDeleteConfirm}
            placeholder={DELETE_PHRASE}
            accessibilityLabel={t('Delete confirmation phrase')}
            placeholderTextColor={PA.ink3}
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t('Password')}
            accessibilityLabel={t('Account password')}
            placeholderTextColor={PA.ink3}
            secureTextEntry
            style={styles.input}
          />
          <Box flexDirection="row" gap={10} style={styles.buttonRow}>
            <PrivacyActionButton
              label="Request deletion"
              accessibilityLabel="Request account deletion"
              onPress={createDeletion}
              disabled={deletionDisabled}
              style={styles.dangerButton}
              textColor="#fff"
              icon="Trash2"
            />
            {deletionJob ? (
              <PrivacyActionButton
                label="Refresh deletion status"
                accessibilityLabel="Refresh account deletion status"
                onPress={refreshDeletion}
                disabled={busy}
                style={styles.secondaryButton}
                icon="RefreshCw"
              />
            ) : null}
          </Box>
          {deletionJob?.cancelable ? (
            <PrivacyActionButton
              label="Cancel deletion"
              accessibilityLabel="Cancel account deletion"
              onPress={cancelDeletion}
              style={styles.linkButton}
              textColor={PA.accent}
              icon="Undo2"
            />
          ) : null}
        </Box>
      </PRowGroup>

      <Box height={36} />
    </ParentScroll>
  );
}

const styles = StyleSheet.create({
  section: { padding: 16, backgroundColor: PA.card },
  sectionHeading: { marginBottom: 8 },
  sectionIcon: { backgroundColor: '#FFE5E5', borderRadius: 14, height: 40, width: 40 },
  dangerIcon: { backgroundColor: '#FDECEC', borderRadius: 14, height: 40, width: 40 },
  heading: { flex: 1, fontSize: 16, color: PA.ink },
  body: { fontSize: 14, color: PA.ink2, lineHeight: 20, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: PA.hair,
    backgroundColor: PA.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: PA.ink,
    marginBottom: 10,
  },
  buttonRow: { flexWrap: 'wrap' },
  button: { overflow: 'hidden', backgroundColor: PA.accent, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryButton: { overflow: 'hidden', borderWidth: 1, borderColor: PA.hair, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dangerButton: { overflow: 'hidden', backgroundColor: '#C0392B', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkButton: { paddingTop: 12, paddingBottom: 12, minHeight: 44, justifyContent: 'center' },
  actionText: { fontWeight: '700', fontSize: 14 },
  buttonDisabled: { opacity: 0.45 },
  message: { color: PA.accent, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  warning: { color: '#C0392B', fontSize: 14, lineHeight: 20 },
});
