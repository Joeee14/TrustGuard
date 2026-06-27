import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import Card from '../components/Card';
import Tag from '../components/Tag';
import Icon from '../components/Icon';
import ScreenHeader from '../components/ScreenHeader';
import { TrustGuardMark, TrustGuardWordmark } from '../components/TrustGuardLogo';
import { cardShadow } from '../theme';

export default function SettingsScreen({ navigation }) {
  const { t, themeName, toggleTheme } = useApp();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <ScreenHeader t={t} title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* About card */}
        <Card t={t} padding={18}>
          <View style={styles.aboutRow}>
            <TrustGuardMark size={48} t={t} />
            <TrustGuardWordmark size={20} t={t} tagline />
          </View>
          <Text style={[styles.aboutDesc, { color: t.textMuted }]}>
            We analyze sellers, certifications, ratings, and social mentions across the web, then surface safer alternatives in your market.
          </Text>
          <View style={styles.aboutTags}>
            <Tag t={t} icon="shield">Egypt</Tag>
            <Tag t={t} bg={t.bg2} color={t.textMuted}>v1.0.4</Tag>
            <Tag t={t} bg={t.bg2} color={t.textMuted}>Beta</Tag>
          </View>
        </Card>

        <SettingsGroup t={t} title="Appearance">
          <SettingsRow
            t={t}
            icon="sparkle"
            label="Theme"
            value={themeName === 'dark' ? 'Dark' : 'Light'}
            onPress={toggleTheme}
            toggle={themeName === 'dark'}
            onToggle={toggleTheme}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup t={t} title="Scans & data">
          <SettingsRow
            t={t}
            icon="map"
            label="Region"
            value="Egypt"
          />
          <SettingsRow
            t={t}
            icon="refresh"
            label="Clear cache"
            onPress={() => {}}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup t={t} title="About">
          <SettingsRow t={t} icon="info" label="How TrustGuard works" onPress={() => {}} />
          <SettingsRow t={t} icon="cert" label="Sources we check" onPress={() => {}} />
          <SettingsRow t={t} icon="chat" label="Send feedback" onPress={() => {}} isLast />
        </SettingsGroup>

        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsGroup({ t, title, children }) {
  return (
    <View>
      <Text style={[styles.groupTitle, { color: t.textMuted }]}>{title}</Text>
      <Card t={t} padding={0}>
        {children}
      </Card>
    </View>
  );
}

function SettingsRow({ t, icon, label, value, onPress, toggle, onToggle, isLast }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[
        styles.settingsRow,
        { borderBottomColor: t.border, borderBottomWidth: isLast ? 0 : 1 },
      ]}
    >
      <View style={[styles.settingsRowIcon, { backgroundColor: t.brandSoft }]}>
        <Icon name={icon} size={16} color={t.brand} strokeWidth={2} />
      </View>
      <Text style={[styles.settingsRowLabel, { color: t.text, flex: 1 }]}>{label}</Text>
      {value && (
        <Text style={[styles.settingsRowValue, { color: t.textMuted }]}>{value}</Text>
      )}
      {toggle !== undefined ? (
        <Switch
          value={toggle}
          onValueChange={onToggle}
          trackColor={{ false: t.bg2, true: t.brand }}
          thumbColor="#FFFDF6"
          ios_backgroundColor={t.bg2}
        />
      ) : onPress ? (
        <Icon name="chevron" size={14} color={t.textDim} strokeWidth={2} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 32,
    gap: 16,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aboutDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  aboutTags: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 12,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsRowIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  settingsRowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingsRowValue: {
    fontSize: 13,
    fontWeight: '500',
  },
});
