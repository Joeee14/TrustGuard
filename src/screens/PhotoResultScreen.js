import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import Card from '../components/Card';
import Icon from '../components/Icon';
import { AlternativeRow } from './ResultScreen';
import { searchByImage } from '../services/api';
import { cardShadow } from '../theme';

const FILTER_STORES = ['All sellers', 'Amazon.eg', 'Noon', 'Jumia', 'B.TECH', '2B Egypt', 'Carrefour'];

export default function PhotoResultScreen({ navigation, route }) {
  const { t } = useApp();
  const { imageUri } = route.params;
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All sellers');

  useEffect(() => {
    searchByImage(imageUri)
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not identify product. Please try a clearer photo.');
        setLoading(false);
      });
  }, [imageUri]);

  const filteredMatches = result
    ? activeFilter === 'All sellers'
      ? result.matches
      : result.matches.filter((m) => m.store === activeFilter)
    : [];

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconBtn, { backgroundColor: t.surface, ...cardShadow(t) }]}
            activeOpacity={0.7}
          >
            <Icon name="back" size={20} color={t.text} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={t.brand} />
          <Text style={[styles.loadingText, { color: t.textMuted }]}>
            Identifying product and finding trusted sellers…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconBtn, { backgroundColor: t.surface, ...cardShadow(t) }]}
            activeOpacity={0.7}
          >
            <Icon name="back" size={20} color={t.text} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingCenter}>
          <Icon name="warn" size={48} color={t.mid} strokeWidth={1.5} />
          <Text style={[styles.errorTitle, { color: t.text }]}>Couldn't identify product</Text>
          <Text style={[styles.loadingText, { color: t.textMuted }]}>{error}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Camera')}
            style={[styles.retryBtn, { backgroundColor: t.brand }]}
            activeOpacity={0.8}
          >
            <Icon name="refresh" size={16} color="#FFFDF6" strokeWidth={2} />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            style={[styles.iconBtn, { backgroundColor: t.surface, ...cardShadow(t) }]}
            activeOpacity={0.7}
          >
            <Icon name="back" size={20} color={t.text} strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Camera')}
            style={[styles.iconBtn, { backgroundColor: t.surface, ...cardShadow(t) }]}
            activeOpacity={0.7}
          >
            <Icon name="camera" size={18} color={t.text} strokeWidth={1.9} />
          </TouchableOpacity>
        </View>

        {/* Scanned thumbnail header */}
        <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
          <Card t={t} padding={14}>
            <View style={styles.thumbRow}>
              <View style={styles.thumbContainer}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.thumb}
                  resizeMode="cover"
                />
                <View style={[styles.thumbBadge, { backgroundColor: t.brand, borderColor: t.surface }]}>
                  <Icon name="camera" size={11} color="#FFFDF6" strokeWidth={2.2} />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.scanLabel, { color: t.brand }]}>Photo scanned</Text>
                <Text style={[styles.detectedName, { color: t.text }]} numberOfLines={2}>
                  {result.detected}
                </Text>
                <Text style={[styles.detectedSub, { color: t.textMuted }]}>
                  Detected from your photo
                </Text>
              </View>
            </View>
            <View style={[styles.noScoreNotice, { backgroundColor: t.brandSoft }]}>
              <View style={{ marginTop: 1, flexShrink: 0 }}>
                <Icon name="info" size={15} color={t.brand} strokeWidth={2} />
              </View>
              <Text style={[styles.noScoreText, { color: t.text }]}>
                We don't score loose photos — instead, here are{' '}
                <Text style={{ fontWeight: '700' }}>trusted sellers</Text> with verified compatible products.
              </Text>
            </View>
          </Card>
        </View>

        {/* Section heading */}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={[styles.sectionSuper, { color: t.brand }]}>All scored above 70</Text>
            <Text style={[styles.sectionTitle, { color: t.text }]}>Trusted sellers in Egypt</Text>
          </View>
          <View style={styles.matchCount}>
            <Icon name="shield" size={12} color={t.brand} strokeWidth={2} />
            <Text style={[styles.matchCountText, { color: t.textMuted }]}>
              {filteredMatches.length} matches
            </Text>
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={{ paddingBottom: 4 }}
        >
          {FILTER_STORES.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.75}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === f ? t.brand : t.surface,
                  borderColor: activeFilter === f ? t.brand : t.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: activeFilter === f ? '#FFFDF6' : t.text },
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Match list */}
        <View style={styles.matchList}>
          {filteredMatches.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="search" size={36} color={t.textDim} strokeWidth={1.5} />
              <Text style={[styles.emptyText, { color: t.textMuted }]}>
                No matches for {activeFilter}
              </Text>
            </View>
          ) : (
            filteredMatches.map((m) => (
              <AlternativeRow
                key={m.id}
                t={t}
                alt={m}
                showWhy
                onPress={() => navigation.navigate('AlternativeDetail', { alt: m, source: 'photo' })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  loadingText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 8,
  },
  retryBtnText: { color: '#FFFDF6', fontSize: 16, fontWeight: '600' },
  thumbRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  thumbContainer: { position: 'relative' },
  thumb: { width: 68, height: 68, borderRadius: 14 },
  thumbBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  scanLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  detectedName: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, marginTop: 1 },
  detectedSub: { fontSize: 12, marginTop: 2 },
  noScoreNotice: {
    marginTop: 12,
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  noScoreText: { flex: 1, fontSize: 12, lineHeight: 17 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionSuper: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginTop: 2 },
  matchCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  matchCountText: { fontSize: 12, fontWeight: '600' },
  filterRow: { paddingHorizontal: 18, gap: 6 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  matchList: { paddingHorizontal: 18, paddingTop: 14, gap: 10 },
  emptyState: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
