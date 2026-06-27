import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { TrustViz } from '../components/TrustViz';
import Section from '../components/Section';
import Tag from '../components/Tag';
import ProductImage from '../components/ProductImage';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { cardShadow } from '../theme';
import { Dimensions } from 'react-native';

const HERO_IMAGE_SIZE = Dimensions.get('window').width - 36;

const TRUST_REASONS = [
  { icon: 'cert', label: 'Authentic certifications verified' },
  { icon: 'seller', label: 'Authorized seller confirmed' },
  { icon: 'star', label: 'Strong ratings across marketplaces' },
  { icon: 'price', label: 'Price in line with market average' },
];

export default function AlternativeDetailScreen({ navigation, route }) {
  const { t } = useApp();
  const { alt } = route.params;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconBtn, { backgroundColor: t.surface, ...cardShadow(t) }]}
            activeOpacity={0.7}
          >
            <Icon name="back" size={20} color={t.text} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* Hero image */}
        <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
          <View style={styles.heroImageWrap}>
            <ProductImage
              tone={alt.tone}
              size={HERO_IMAGE_SIZE}
              radius={0}
              glyph={<Icon name="box" size={88} color="rgba(255,255,255,0.85)" strokeWidth={1.4} />}
            />
            <View style={styles.trustedTag}>
              <Tag t={t} icon="shield" bg={t.brandSoft} color={t.brand}>
                Trusted in Egypt
              </Tag>
            </View>
          </View>
        </View>

        {/* Product info */}
        <View style={{ paddingHorizontal: 18, paddingTop: 20 }}>
          <Text style={[styles.metaLine, { color: t.textMuted }]}>
            {alt.brand} · {alt.store}
          </Text>
          <Text style={[styles.productName, { color: t.text }]}>{alt.name}</Text>

          <View style={styles.priceScoreRow}>
            <Text style={[styles.price, { color: t.text }]}>{alt.price}</Text>
            <View style={{ flex: 1 }} />
            <TrustViz score={alt.score} t={t} variant="shield" size={84} />
          </View>
        </View>

        {/* Why we trust it */}
        <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
          <Section t={t} title="Why we trust this" icon="shield" status="pass">
            <View style={{ gap: 10 }}>
              {TRUST_REASONS.map((row, i) => (
                <View key={i} style={styles.trustRow}>
                  <View style={[styles.trustIcon, { backgroundColor: t.goodSoft }]}>
                    <Icon name={row.icon} size={13} color={t.good} strokeWidth={2.2} />
                  </View>
                  <Text style={[styles.trustLabel, { color: t.text, flex: 1 }]}>{row.label}</Text>
                  <Icon name="check" size={14} color={t.good} strokeWidth={2.4} />
                </View>
              ))}
            </View>
          </Section>
        </View>

        {/* Why note from search (if available) */}
        {alt.why && (
          <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
            <View style={[styles.whyNote, { backgroundColor: t.brandSoft, borderLeftColor: t.brand }]}>
              <Icon name="info" size={15} color={t.brand} strokeWidth={2} style={{ marginTop: 1, flexShrink: 0 }} />
              <Text style={[styles.whyNoteText, { color: t.text }]}>{alt.why}</Text>
            </View>
          </View>
        )}

        {/* Tags */}
        {alt.tags && alt.tags.length > 0 && (
          <View style={{ paddingHorizontal: 18, paddingTop: 16, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {alt.tags.map((tag) => (
              <Tag key={tag} t={t} bg={t.brandSoft} color={t.brand}>{tag}</Tag>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.cta, { backgroundColor: t.bg, borderTopColor: t.border }]}>
        <Button
          t={t}
          icon="link"
          primary
          style={{ flex: 1 }}
          onPress={() => {
            if (!alt.link) return;
            Linking.openURL(alt.link).catch(() =>
              Alert.alert('Could not open link', alt.link)
            );
          }}
        >
          Open in {alt.store}
        </Button>
      </View>
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
  heroImageWrap: {
    height: 260,
    borderRadius: 26,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustedTag: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  metaLine: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginTop: 4,
    lineHeight: 30,
  },
  priceScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trustIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  trustLabel: { fontSize: 13 },
  whyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 12,
    borderRadius: 14,
    borderLeftWidth: 3,
  },
  whyNoteText: { flex: 1, fontSize: 13, lineHeight: 19 },
  cta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  notFoundText: { fontSize: 16 },
  goBackText: { fontSize: 16, fontWeight: '600' },
});
