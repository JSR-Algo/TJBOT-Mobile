import React from 'react';
import { StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Screen from '@/components/Screen';
import TopBar from '@/components/TopBar';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'HelpFaqScreen'>;

const FAQS = [
  { q: "Is my child's voice recorded?", a: "No. Voice is processed in real time and not stored. We don't keep audio or transcripts." },
  { q: 'Why does the app need a microphone?', a: "Speaking practice is the core of Robot English. The mic only turns on during a lesson." },
  { q: 'My child is shy — will the robot wait?', a: 'Yes. The robot uses gentle prompts and never penalizes silence. Children can pause anytime.' },
  { q: 'How long is a lesson?', a: 'About 5–8 minutes. You can change the lesson length in Parent Settings.' },
  { q: 'Can my child play offline?', a: 'Voice lessons need a connection. Review games for known words work offline.' },
  { q: 'How do I cancel my subscription?', a: 'Open Parent Space → Settings → Subscription → Manage billing.' },
] as const;

export default function HelpFaqScreen({ navigation }: Props) {
  const { t } = useAppLanguage();
  const [query, setQuery] = React.useState('');
  const [openQuestion, setOpenQuestion] = React.useState<string | null>(FAQS[0].q);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleFaqs = normalizedQuery.length === 0
    ? FAQS
    : FAQS.filter(faq => t(faq.q).toLocaleLowerCase().includes(normalizedQuery)
      || t(faq.a).toLocaleLowerCase().includes(normalizedQuery));

  return (
    <Screen
      header={<TopBar title="Help & FAQ" onBack={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return;
        }
        navigation.navigate(ROUTES.ParentSummaryScreen);
      }} />}
      scroll
    >
      <Box paddingHorizontal={16} paddingTop={14} paddingBottom={4}>
        <TextInput
          testID="helpFaqSearchInput"
          accessibilityLabel={t('Search help…')}
          value={query}
          onChangeText={setQuery}
          placeholder={t('Search help…')}
          placeholderTextColor="#8B8B96"
          style={styles.searchInput}
        />
      </Box>

      <Box paddingHorizontal={16} paddingTop={12}>
        <Box style={styles.faqList} borderRadius={14} overflow="hidden">
          {visibleFaqs.map((f, i) => {
            const isOpen = openQuestion === f.q;
            return (
              <Box
                key={f.q}
                style={i < visibleFaqs.length - 1 ? styles.faqItemBorder : undefined}
              >
                <TouchableOpacity
                  onPress={() => setOpenQuestion(isOpen ? null : f.q)}
                  style={styles.faqBtn}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`FAQ: ${t(f.q)}`}
                  accessibilityState={{ expanded: isOpen }}
                >
                  <Text fontWeight="500" style={styles.faqQ}>{f.q}</Text>
                  <Text style={[styles.chevron, isOpen && { transform: [{ rotate: '180deg' }] }]}>⌄</Text>
                </TouchableOpacity>
                {isOpen ? (
                  <Box paddingHorizontal={14} paddingBottom={14}>
                    <Text style={styles.faqA}>{f.a}</Text>
                  </Box>
                ) : null}
              </Box>
            );
          })}
          {visibleFaqs.length === 0 ? (
            <Text testID="helpFaqEmptyResult" style={styles.emptyResult}>
              {t('No help topics found.')}
            </Text>
          ) : null}
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={16}>
        <Text style={styles.sectionHeader}>STILL NEED HELP?</Text>
        <Box style={styles.helpList} borderRadius={14} overflow="hidden">
          <TouchableOpacity
            style={[styles.helpRow, styles.helpRowBorder]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(ROUTES.SupportScreen)}
            accessibilityRole="button"
            accessibilityLabel={t('Contact support')}
          >
            <Text style={{ fontSize: 15, color: '#2B2140', flex: 1 }}>✉ Contact support</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.helpRow}
            activeOpacity={0.7}
            disabled
            accessibilityRole="button"
            accessibilityLabel={t('Open user guide')}
            accessibilityState={{ disabled: true }}
          >
            <Text style={{ fontSize: 15, color: '#2B2140', flex: 1 }}>📄 Open user guide</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
        </Box>
      </Box>
      <Box height={24} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchInput: { padding: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)', borderRadius: 10, backgroundColor: '#fff', fontSize: 15, color: '#2B2140' },
  faqList: { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)' },
  faqItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)' },
  faqBtn: { padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  faqQ: { flex: 1, fontSize: 15, color: '#2B2140', lineHeight: 21 },
  chevron: { fontSize: 14, color: '#8B8B96', marginTop: 1 },
  faqA: { fontSize: 14, color: '#5C4F77', lineHeight: 21 },
  emptyResult: { padding: 16, textAlign: 'center', fontSize: 14, color: '#5C4F77' },
  sectionHeader: { fontSize: 12, color: '#8B8B96', letterSpacing: 0.8, fontWeight: '600', paddingBottom: 8 },
  helpList: { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)' },
  helpRow: { padding: 14, flexDirection: 'row', alignItems: 'center' },
  helpRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)' },
  rowChevron: { fontSize: 18, color: '#8B8B96' },
});
