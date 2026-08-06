import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Icon } from '@/design-system/icons';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'PairQrScanScreen'>;

const TBOT_QR_CODE_PATTERN = /[?&]code=(\d{6})(?:&|$)/;
const TBOT_QR_SERIAL_PATTERN = /[?&]serial=([^&]+)(?:&|$)/;

function parseTBotQrCode(text: string): { code: string; serial: string } | null {
  try {
    const url = new URL(text);
    const codePart = url.searchParams.get('code');
    const serialPart = url.searchParams.get('serial');
    if (codePart && /^\d{6}$/.test(codePart) && serialPart && serialPart.length > 0) {
      return { code: codePart, serial: serialPart };
    }

    // Fallback: regex match for non-standard URLs
    const codeMatch = TBOT_QR_CODE_PATTERN.exec(text);
    const serialMatch = TBOT_QR_SERIAL_PATTERN.exec(text);
    if (codeMatch && serialMatch) {
      return { code: codeMatch[1], serial: serialMatch[1] };
    }

    return null;
  } catch {
    // Not a valid URL — try regex fallback
    const codeMatch = TBOT_QR_CODE_PATTERN.exec(text);
    const serialMatch = TBOT_QR_SERIAL_PATTERN.exec(text);
    if (codeMatch && serialMatch) {
      return { code: codeMatch[1], serial: serialMatch[1] };
    }
    return null;
  }
}

export default function PairQrScanScreen({ navigation, route }: Props): React.JSX.Element {
  const { t } = useAppLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanError, setScanError] = React.useState<string | null>(null);
  const scannedRef = React.useRef(false);

  const params = route.params;

  const handleBarcodeScan = React.useCallback(
    (result: BarcodeScanningResult) => {
      if (scannedRef.current) return;
      const parsed = parseTBotQrCode(result.data);
      if (!parsed) {
        setScanError(t('This QR code is not a TBot pairing code.'));
        return;
      }
      scannedRef.current = true;
      navigation.navigate(ROUTES.PairWifiScreen, {
        ...(params ?? {}),
        code: parsed.code,
        serialNumber: parsed.serial,
      });
    },
    [navigation, params, t],
  );

  const handleEnterManually = React.useCallback(() => {
    navigation.navigate(ROUTES.PairCodeScreen, params);
  }, [navigation, params]);

  if (!permission) {
    return (
      <DeviceShell title={t('Scan QR Code')} onBack={() => navigation.navigate(ROUTES.PairFoundScreen, params)}>
        <Box style={styles.stateCard} alignItems="center" gap={14}>
          <Box style={styles.stateIcon} alignItems="center" justifyContent="center">
            <Icon name="ScanLine" size={32} color={DV.accent} strokeWidth={2.2} />
          </Box>
          <Text fontWeight="700" style={styles.stateTitle}>{t('Checking camera permission...')}</Text>
          <Text style={styles.permissionText}>{t('You can enter the pairing code manually at any time.')}</Text>
        </Box>
      </DeviceShell>
    );
  }

  if (!permission.granted) {
    return (
      <DeviceShell title={t('Scan QR Code')} onBack={() => navigation.navigate(ROUTES.PairFoundScreen, params)}>
        <Box style={styles.stateCard} alignItems="center" gap={16}>
          <Box style={styles.stateIcon} alignItems="center" justifyContent="center">
            <Icon name="CameraOff" size={32} color={DV.accent} strokeWidth={2.2} />
          </Box>
          <Text fontWeight="700" style={styles.stateTitle}>{t('Camera access is off')}</Text>
          <Text style={styles.permissionText}>
            {t('Camera access is needed. Enter the code manually.')}
          </Text>
          {!permission.canAskAgain ? null : (
            <DeviceBigBtn onClick={requestPermission}>{t('Allow Camera')}</DeviceBigBtn>
          )}
          <DeviceBigBtn secondary onClick={handleEnterManually}>
            {t('Enter code manually')}
          </DeviceBigBtn>
        </Box>
      </DeviceShell>
    );
  }

  return (
    <DeviceShell title={t('Scan QR Code')} onBack={() => navigation.navigate(ROUTES.PairFoundScreen, params)}>
      <Box flex={1}>
        <Box paddingHorizontal={20} paddingTop={16} paddingBottom={12}>
          <Text style={styles.instruction}>
            {t('Point the camera at the QR code shown on your Robot.')}
          </Text>
        </Box>

        <Box style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScan}
            accessibilityLabel={t('QR code scanner')}
          />
          <Box style={styles.overlay} pointerEvents="none">
            <Box style={styles.viewfinder} />
          </Box>
        </Box>

        {scanError ? (
          <Box style={styles.errorCard} marginHorizontal={20} marginTop={12}>
            <Icon name="CircleAlert" size={20} color="#C0392B" strokeWidth={2.4} />
            <Text style={styles.errorText}>{scanError}</Text>
            <TouchableOpacity
              onPress={() => setScanError(null)}
              style={styles.dismissBtn}
              accessibilityLabel={t('Dismiss error and scan again')}
              accessibilityRole="button"
            >
              <Text style={styles.dismissText}>{t('Try again')}</Text>
            </TouchableOpacity>
          </Box>
        ) : null}

        <Box paddingHorizontal={20} paddingTop={16} paddingBottom={30}>
          <TouchableOpacity
            onPress={handleEnterManually}
            style={styles.manualBtn}
            accessibilityLabel={t('Enter code manually')}
            accessibilityRole="button"
          >
            <Text fontWeight="500" style={styles.manualBtnText}>{t('Enter code manually')}</Text>
          </TouchableOpacity>
        </Box>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  stateCard: {
    backgroundColor: DV.card,
    borderColor: DV.hair,
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: 32,
    padding: 24,
  },
  stateIcon: { width: 68, height: 68, borderRadius: 24, backgroundColor: '#FFE5E5' },
  stateTitle: { color: DV.ink, fontSize: 19, textAlign: 'center' },
  instruction: { fontSize: 14, color: DV.ink2, lineHeight: 22, textAlign: 'center' },
  cameraContainer: { flex: 1, minHeight: 280, overflow: 'hidden', marginHorizontal: 20, borderRadius: 16, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  viewfinder: {
    width: 220,
    height: 220,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: DV.accent,
  },
  permissionText: { fontSize: 14, color: DV.ink2, lineHeight: 22, textAlign: 'center' },
  errorCard: {
    alignItems: 'center',
    backgroundColor: '#FFF5F3',
    borderColor: '#F2C7C1',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  errorText: { fontSize: 14, color: '#E53E3E', lineHeight: 22, textAlign: 'center' },
  dismissBtn: { marginTop: 8, padding: 8, alignItems: 'center' },
  dismissText: { fontSize: 14, color: DV.accent, fontWeight: '500' },
  manualBtn: { padding: 12, alignItems: 'center' },
  manualBtnText: { fontSize: 14, color: DV.accent },
});
