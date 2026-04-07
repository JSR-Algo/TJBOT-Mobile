import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { useHousehold } from '../../contexts/HouseholdContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';
import { Button, Card } from '../../components';
import * as accountApi from '../../api/account';
import theme from '../../theme';

type ProfileNavigationProp = NativeStackNavigationProp<MainStackParamList>;

export function ProfileScreen(): React.JSX.Element {
  const { user, logout } = useAuth();
  const { activeHousehold, children } = useHousehold();
  const navigation = useNavigation<ProfileNavigationProp>();
  const [deletePending, setDeletePending] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all child data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => promptDeletePassword(),
        },
      ],
    );
  };

  const promptDeletePassword = () => {
    // React Native Alert doesn't support text inputs on all platforms,
    // so we use a state-driven inline form instead
    setDeletePending(true);
  };

  const confirmDelete = async (password: string) => {
    try {
      await accountApi.deleteAccount(password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await logout();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e?.response?.data?.message ?? 'Failed to delete account. Check your password.';
      Alert.alert('Error', msg);
      setDeletePending(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name ?? '—'}</Text>
        <Text style={styles.email}>{user?.email ?? '—'}</Text>
      </View>

      {/* Household */}
      {activeHousehold && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Household</Text>
          <Text style={styles.cardValue}>{activeHousehold.name}</Text>
          <Text style={styles.cardSubtext}>
            {children.length} {children.length === 1 ? 'child' : 'children'}
          </Text>
        </Card>
      )}

      {/* Children */}
      {children.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Children</Text>
          {children.map((child) => (
            <View key={child.id} style={styles.childRow}>
              <Text style={styles.childName}>{child.name}</Text>
              <Text style={styles.childYear}>Born {child.birth_year}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Notification settings */}
      <TouchableOpacity
        style={styles.navRow}
        onPress={() => navigation.navigate('NotificationPrefs')}
        activeOpacity={0.7}
      >
        <Text style={styles.navRowLabel}>Notification settings</Text>
        <Text style={styles.navRowChevron}>›</Text>
      </TouchableOpacity>

      {/* Sign out */}
      <Button
        label="Sign out"
        variant="danger"
        onPress={handleLogout}
      />

      {/* Delete account — shown inline after first confirmation */}
      {deletePending ? (
        <DeleteConfirmForm onConfirm={confirmDelete} onCancel={() => setDeletePending(false)} />
      ) : (
        <TouchableOpacity
          style={styles.deleteRow}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
          accessibilityLabel="Delete account"
          accessibilityRole="button"
          accessibilityHint="Permanently deletes your account and all data"
        >
          <Text style={styles.deleteRowText}>Delete account</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ── Inline delete confirmation form ───────────────────────────────────────────

function DeleteConfirmForm({
  onConfirm,
  onCancel,
}: {
  onConfirm: (password: string) => Promise<void>;
  onCancel: () => void;
}): React.JSX.Element {
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    if (!password) return;
    setLoading(true);
    await onConfirm(password);
    setLoading(false);
  };

  return (
    <View style={deleteFormStyles.container}>
      <Text style={deleteFormStyles.label}>Enter your password to confirm deletion:</Text>
      <TextInput
        style={deleteFormStyles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor={theme.colors.textSecondary}
        autoFocus
        autoCapitalize="none"
      />
      <View style={deleteFormStyles.buttons}>
        <TouchableOpacity style={deleteFormStyles.cancelBtn} onPress={onCancel}>
          <Text style={deleteFormStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[deleteFormStyles.deleteBtn, !password && deleteFormStyles.disabled]}
          onPress={handleConfirm}
          disabled={!password || loading}
        >
          <Text style={deleteFormStyles.deleteBtnText}>
            {loading ? 'Deleting…' : 'Delete account'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const deleteFormStyles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.error ?? '#E53E3E',
  },
  label: {
    ...theme.typography.body2,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  cancelText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.error ?? '#E53E3E',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  deleteBtnText: {
    ...theme.typography.body2,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

// ── Main styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  name: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  email: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
  },
  cardValue: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  cardSubtext: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  childRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  childName: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
  },
  childYear: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  navRowLabel: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
  },
  navRowChevron: {
    fontSize: 20,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  deleteRow: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  deleteRowText: {
    ...theme.typography.body2,
    color: theme.colors.error ?? '#E53E3E',
  },
});
