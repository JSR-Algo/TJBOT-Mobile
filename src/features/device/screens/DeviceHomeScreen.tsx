import React from 'react';
import { Image, type ImageSourcePropType, ScrollView, StyleSheet } from 'react-native';
import { Bell, CloudDownload, FileText, Moon, Music, Star } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceHomeScreen'>;

const robotFaceSource: ImageSourcePropType = require('../../../assets/export-html-7/robot-face.png');

export default function DeviceHomeScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Box paddingHorizontal={24} paddingTop={74} paddingBottom={10}>
        <Text fontWeight="800" style={styles.pageTitle}>Robot <Text style={styles.serial}>• ROB-2A8F</Text></Text>
      </Box>

      <Box paddingHorizontal={20}>
        <Box style={styles.heroCard} flexDirection="row" gap={16} alignItems="center">
          <Box style={styles.robotThumb} alignItems="center" justifyContent="center">
            <Image source={robotFaceSource} style={styles.robotImage} resizeMode="contain" accessibilityLabel="Robot face" />
          </Box>
          <Box flex={1}>
            <Text fontWeight="800" style={styles.statusText}>ONLINE  •  IDLE</Text>
            <Text fontWeight="800" style={styles.readyText}>Ready for today</Text>
            <Box flexDirection="row" gap={8} style={{ marginTop: 4 }}>
              <Text style={styles.metaText}>78%</Text>
              <Text style={styles.metaText}>•</Text>
              <Text style={styles.metaText}>Wi-Fi</Text>
            </Box>
          </Box>
          <Box style={styles.deviceGlyph} />
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={22}>
        <Text fontWeight="800" style={styles.sectionLabel}>TODAY</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon={<FileText size={18} color="#2D3436" strokeWidth={2.7} />} title="Unit 2 · Animals" body="Lesson 4 of 6 · about 4 minutes" onClick={() => navigation.navigate(ROUTES.DeviceSessionScreen)} />
          <DeviceRow icon={<Bell size={18} color="#A679D8" strokeWidth={2.7} />} title="3 words to revisit" body="Robot will sneak these in tomorrow" />
          <DeviceRow icon={<Star size={18} color="#FF6F61" strokeWidth={2.7} />} title="Yesterday: 1 lesson · 4 min" body="Tap to see what your child practiced" onClick={() => navigation.navigate(ROUTES.TodayProgressScreen)} />
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={22}>
        <Text fontWeight="800" style={styles.sectionLabel}>ROBOT</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon={<Music size={18} color="#2D3436" strokeWidth={2.7} />} title="Make Robot chime" body="Find Robot if it's misplaced" onClick={() => navigation.navigate(ROUTES.DeviceLostScreen)} />
          <DeviceRow icon={<Moon size={18} color="#2D3436" strokeWidth={2.7} />} title="Quiet hours" body="9:00 PM - 7:00 AM" />
          <DeviceRow icon={<CloudDownload size={18} color="#2A6FDB" strokeWidth={2.7} />} title="Sync content" body="Up to date · 2 minutes ago" />
          <DeviceRow icon={<CloudDownload size={18} color="#FF6F61" strokeWidth={2.7} />} title="Firmware" body="v1.4.2 · update available" onClick={() => navigation.navigate(ROUTES.DeviceFirmwareScreen)} />
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={22}>
        <Text fontWeight="800" style={styles.sectionLabel}>THIS ROBOT</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon={<Star size={18} color="#FFC857" strokeWidth={2.7} />} title="Buddy: Panda · Just starting" body="Tap to change avatar or level" />
          <DeviceRow icon={<FileText size={18} color="#2A6FDB" strokeWidth={2.7} />} title="Safety & privacy" />
          <DeviceRow danger title="Unpair this Robot" icon={<Bell size={18} color="#C0392B" strokeWidth={2.7} />} />
        </Box>
      </Box>

      <Box height={126} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAF5EB' },
  content: { paddingBottom: 28 },
  pageTitle: { fontSize: 21, color: '#2D3436', letterSpacing: 0 },
  serial: { color: '#636E72', fontSize: 19, fontWeight: '900' },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EBDCC7',
    shadowColor: '#A98F77',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
    elevation: 3,
    overflow: 'hidden',
  },
  robotThumb: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#FAF5EB' },
  robotImage: { width: 58, height: 58 },
  statusText: { fontSize: 9, color: '#1F8A5B', letterSpacing: 0.4 },
  readyText: { fontSize: 18, color: '#2D3436', marginTop: 3 },
  metaText: { fontSize: 12, color: '#636E72', fontWeight: '700' },
  deviceGlyph: {
    width: 48,
    height: 48,
    borderRadius: 15,
    borderWidth: 6,
    borderColor: '#D6D1C9',
    opacity: 0.8,
  },
  sectionLabel: { fontSize: 10, color: '#636E72', letterSpacing: 1.1, marginBottom: 9 },
  rowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EBDCC7',
    paddingVertical: 4,
    paddingHorizontal: 4,
    shadowColor: '#A98F77',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
    overflow: 'hidden',
  },
});
