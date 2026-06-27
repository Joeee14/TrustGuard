import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { TrustViz } from '../components/TrustViz';
import MiniScore from '../components/MiniScore';
import Card from '../components/Card';
import Tag from '../components/Tag';
import Section from '../components/Section';
import ProductImage from '../components/ProductImage';
import Stars from '../components/Stars';
import Icon from '../components/Icon';
import { tierColors } from '../theme';
import { cardShadow } from '../theme';

export default function ResultScreen({ navigation, route }) {
  const { t } = useApp();
  const { result } = route.params;

  const { c: tierColor, soft: tierSoft } = tierColors(t, result.trustScore);
  const tierText = result.trustScore < 40 ? "Don't buy" : result.trustScore < 70 ? 'Be cautious' : 'Trusted';
  const tierIcon = result.trustScore < 40 ? 'x' : result.trustScore < 70 ? 'warn' : 'check';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            style={[styles.iconBtn, { backgroundColor: t.surface, ...cardShadow(t) }]}
            activeOpacity={0.7}
          >
            <Icon name="back" size={20} color={t.text} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* Product + Score card */}
        <View style={styles.sectionPad}>
          <Card t={t} padding={20}>
            <View style={styles.productRow}>
              <ProductImage
                tone={result.tone}
                uri={result.imageUrl}
                size={56}
                radius={14}
                glyph={<Icon name="box" size={22} color="rgba(255,255,255,0.85)" strokeWidth={1.8} />}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.brand, { color: t.textMuted }]}>{result.brand}</Text>
                <Text style={[styles.productName, { color: t.text }]} numberOfLines={2}>
                  {result.product}
                </Text>
                <View style={styles.urlRow}>
                  <Icon name="link" size={11} color={t.textMuted} />
                  <Text style={[styles.urlText, { color: t.textMuted }]} numberOfLines={1}>
                    {result.scannedUrl}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.scoreRow}>
              <TrustViz score={result.trustScore} t={t} variant="shield" size={130} />
              <View style={{ flex: 1 }}>
                <Tag t={t} color={tierColor} bg={tierSoft} icon={tierIcon}>
                  {tierText}
                </Tag>
                <Text style={[styles.summary, { color: t.text, marginTop: 8 }]}>
                  {result.summary}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Sections */}
        <View style={styles.sections}>
          <CertificatesSection t={t} data={result.sections.certificates} />
          <SpecificationsSection t={t} data={result.specifications} />
          <SellerSection t={t} data={result.sections.seller} />
          <RatingsSection t={t} data={result.sections.ratings} />
          <FeedbackSection t={t} data={result.sections.feedback} />
          <PriceSection t={t} data={result.sections.price} />
        </View>

        {/* Alternatives */}
        <View style={styles.alternativesSection}>
          <View style={styles.altHeader}>
            <View>
              <Text style={[styles.altSuperTitle, { color: t.brand }]}>Safer in Egypt</Text>
              <Text style={[styles.altTitle, { color: t.text }]}>Try one of these instead</Text>
            </View>
            <TouchableOpacity style={styles.seeAllBtn} activeOpacity={0.7}>
              <Text style={[styles.seeAllText, { color: t.brand }]}>See all</Text>
              <Icon name="chevron" size={13} color={t.brand} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          <View style={{ gap: 10 }}>
            {result.alternatives.map((alt) => (
              <AlternativeRow
                key={alt.id}
                t={t}
                alt={alt}
                onPress={() => navigation.navigate('AlternativeDetail', { alt, source: 'url' })}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
          style={[styles.newSearchBtn, { backgroundColor: t.brand }]}
        >
          <Icon name="search" size={16} color="#FFFDF6" strokeWidth={2.2} />
          <Text style={styles.newSearchBtnText}>Check another product</Text>
        </TouchableOpacity>

        <Text style={[styles.footer, { color: t.textDim }]}>
          Scores are estimates based on public data and may change.{'\n'}
          Always verify with the seller before purchasing.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function CertificatesSection({ t, data }) {
  const cls = data.classification;
  const ecoColor = cls?.ecoImpact === 'harmful' ? t.bad : cls?.ecoImpact === 'moderate' ? t.mid : t.good;
  const ecoBg = cls?.ecoImpact === 'harmful' ? t.badSoft : cls?.ecoImpact === 'moderate' ? t.midSoft : t.goodSoft;

  return (
    <Section t={t} title="Certifications" icon="cert" status={data.status}>
      <Text style={[styles.sectionDesc, { color: t.text }]}>{data.title}</Text>
      {cls?.ecoNote && (
        <View style={[styles.ecoBanner, { backgroundColor: ecoBg }]}>
          <Icon name={cls.ecoImpact === 'harmful' ? 'warn' : 'info'} size={14} color={ecoColor} strokeWidth={2.2} />
          <Text style={[styles.ecoBannerText, { color: ecoColor }]}>{cls.ecoNote}</Text>
        </View>
      )}
      <View style={{ gap: 10, marginTop: 12 }}>
        {data.claims.length === 0 ? (
          <Text style={[styles.sectionDesc, { color: t.textMuted }]}>
            No certifications found for this product.
          </Text>
        ) : (
          data.claims.map((cl, i) => {
            const passed = cl.verified === true;
            const failed = cl.verified === false;
            const color = passed ? t.good : failed ? t.bad : t.mid;
            const bg = passed ? t.goodSoft : failed ? t.badSoft : t.midSoft;
            const iconName = passed ? 'check' : failed ? 'x' : 'warn';
            const label = passed ? 'Verified' : failed ? 'Unverified' : 'Unclear';
            return (
              <View key={i} style={[styles.claimRow, { backgroundColor: t.bg, borderColor: t.border }]}>
                <View style={[styles.claimIcon, { backgroundColor: bg }]}>
                  <Icon name={iconName} size={15} color={color} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.claimNameRow}>
                    <Text style={[styles.claimName, { color: t.text }]}>{cl.name}</Text>
                    <Tag t={t} bg={bg} color={color} style={{ paddingHorizontal: 6, paddingVertical: 2 }} textStyle={{ fontSize: 9 }}>{label}</Tag>
                  </View>
                  <Text style={[styles.claimNote, { color: t.textMuted }]}>{cl.note}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </Section>
  );
}

function SpecificationsSection({ t, data }) {
  const items = data?.items ?? [];
  if (items.length === 0) return null;
  return (
    <Section t={t} title="Specifications" icon="info" status="pass">
      <View style={[styles.specsTable, { borderColor: t.border }]}>
        {items.map((sp, i) => (
          <View
            key={i}
            style={[
              styles.specRow,
              { borderBottomColor: t.border, borderBottomWidth: i < items.length - 1 ? 1 : 0 },
            ]}
          >
            <Text style={[styles.specLabel, { color: t.textMuted }]}>{sp.label}</Text>
            <Text style={[styles.specValue, { color: t.text }]}>{sp.value}</Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

function SellerSection({ t, data }) {
  const flags = data.flags ?? [];
  return (
    <Section t={t} title="Seller information" icon="seller" status={data.status}>
      <Text style={[styles.sectionDesc, { color: t.text }]}>{data.title}</Text>
      {!data.sellerName ? (
        <Text style={[styles.sectionDesc, { color: t.textMuted, marginTop: 8 }]}>
          No information provided about the seller.
        </Text>
      ) : (
        <View style={[styles.sellerInfoRow, { backgroundColor: t.bg2 }]}>
          <Icon name="seller" size={14} color={t.textMuted} strokeWidth={2} />
          <Text style={[styles.sellerInfoText, { color: t.text }]} numberOfLines={1}>
            {data.sellerName}
          </Text>
          {data.reputation?.ratingText ? (
            <Tag t={t} bg={t.brandSoft} color={t.brand}>{data.reputation.ratingText}</Tag>
          ) : (
            <Text style={[styles.sellerNoRating, { color: t.textMuted }]}>Rating not disclosed</Text>
          )}
        </View>
      )}
      {flags.length > 0 && (
        <View style={{ marginTop: 12 }}>
          {flags.map((f, i) => {
            const color = f.sev === 'high' ? t.bad : f.sev === 'mid' ? t.mid : t.info;
            const bg = f.sev === 'high' ? t.badSoft : f.sev === 'mid' ? t.midSoft : t.bg2;
            return (
              <View
                key={i}
                style={[
                  styles.flagRow,
                  { borderBottomColor: t.border, borderBottomWidth: i < flags.length - 1 ? 1 : 0 },
                ]}
              >
                <View style={[styles.flagIcon, { backgroundColor: bg }]}>
                  <Icon name={f.icon} size={12} color={color} strokeWidth={2.4} />
                </View>
                <Text style={[styles.flagLabel, { color: t.text }]}>{f.label}</Text>
              </View>
            );
          })}
        </View>
      )}
    </Section>
  );
}

function RatingsSection({ t, data }) {
  const hasRatings = data.value > 0 && data.total > 0;
  return (
    <Section t={t} title="Product ratings" icon="star" status={data.status}>
      {!hasRatings ? (
        <Text style={[styles.sectionDesc, { color: t.textMuted }]}>
          No ratings data found for this product.
        </Text>
      ) : (
        <View style={styles.ratingsRow}>
          <View>
            <View style={styles.ratingNumRow}>
              <Text style={[styles.ratingNum, { color: t.text }]}>{data.value.toFixed(1)}</Text>
              <Text style={[styles.ratingDenom, { color: t.textMuted }]}>/5</Text>
            </View>
            <Stars value={data.value} t={t} size={14} showCount={false} />
            <Text style={[styles.ratingCount, { color: t.textMuted }]}>{data.total} ratings</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            {(data.breakdown ?? []).map((b) => (
              <View key={b.stars} style={styles.breakdownRow}>
                <Text style={[styles.breakdownStar, { color: t.textMuted }]}>{b.stars}</Text>
                <Icon name="star" size={11} color={t.accent} strokeWidth={1.8} />
                <View style={[styles.breakdownTrack, { backgroundColor: t.bg2 }]}>
                  <View
                    style={[
                      styles.breakdownFill,
                      {
                        width: `${b.pct}%`,
                        backgroundColor: b.stars <= 2 ? t.bad : b.stars === 3 ? t.mid : t.good,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.breakdownPct, { color: t.textDim }]}>{b.pct}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Section>
  );
}

function FeedbackSection({ t, data }) {
  function sevColor(sev) {
    return sev === 'bad' ? t.bad : sev === 'warn' ? t.mid : t.good;
  }
  function sevBg(sev) {
    return sev === 'bad' ? t.badSoft : sev === 'warn' ? t.midSoft : t.goodSoft;
  }

  return (
    <Section t={t} title="Customer feedback" icon="chat" status={data.status}>
      <Text style={[styles.sectionDesc, { color: t.text }]}>{data.summary}</Text>
      <View style={styles.sourceRow}>
        {data.sources.map((s) => (
          <Tag key={s} t={t} bg={t.bg2} color={t.textMuted}>{s}</Tag>
        ))}
      </View>
      <View style={styles.themesRow}>
        {data.themes.map((th, i) => (
          <View
            key={i}
            style={[styles.themeChip, { backgroundColor: sevBg(th.sev) }]}
          >
            <Text style={[styles.themeLabel, { color: sevColor(th.sev) }]}>{th.label}</Text>
            <Text style={[styles.themeCount, { color: sevColor(th.sev) }]}>{th.count}</Text>
          </View>
        ))}
      </View>
      <View style={{ gap: 8, marginTop: 14 }}>
        {(data.quotes ?? []).map((q, i) => (
          <View
            key={i}
            style={[
              styles.quoteCard,
              {
                backgroundColor: t.bg,
                borderColor: t.border,
                borderLeftColor: sevColor(q.sev),
              },
            ]}
          >
            <View style={styles.quoteMeta}>
              <Text style={[styles.quoteSrc, { color: sevColor(q.sev) }]}>{q.src}</Text>
              <Text style={[styles.quoteDot, { color: t.textMuted }]}>·</Text>
              <Text style={[styles.quoteWho, { color: t.textMuted }]}>{q.who}</Text>
            </View>
            <Text style={[styles.quoteText, { color: t.text }]}>{q.text}</Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

function PriceSection({ t, data }) {
  const range = Math.max(data.marketHigh * 1.1, data.our) - data.marketLow;
  const lo = 0;
  const hi = ((data.marketHigh - data.marketLow) / range) * 100;
  const avg = ((data.marketAvg - data.marketLow) / range) * 100;
  const our = ((data.our - data.marketLow) / range) * 100;

  return (
    <Section t={t} title="Price check" icon="price" status={data.status}>
      <Text style={[styles.sectionDesc, { color: t.text }]}>{data.verdict}</Text>
      <View style={styles.priceBar}>
        <View style={[styles.priceTrack, { backgroundColor: t.bg2 }]}>
          <View
            style={[
              styles.priceRange,
              { left: `${lo}%`, width: `${hi - lo}%`, backgroundColor: t.good },
            ]}
          />
        </View>
        <View style={[styles.priceAvgMarker, { left: `${avg}%` }]}>
          <Text style={[styles.priceAvgLabel, { color: t.textMuted }]}>AVG</Text>
          <View style={[styles.priceAvgLine, { backgroundColor: t.text }]} />
        </View>
        <View style={[styles.priceOurMarker, { left: `${Math.min(our, 95)}%` }]}>
          <View style={[styles.priceOurBubble, { backgroundColor: t.bad }]}>
            <Text style={styles.priceOurText}>
              This: {data.currency} {data.our.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.priceOurLine, { backgroundColor: t.bad }]} />
          <View style={[styles.priceOurDot, { backgroundColor: t.bad, borderColor: t.surface }]} />
        </View>
      </View>
      <View style={styles.priceLabels}>
        <View>
          <Text style={[styles.priceLabelTop, { color: t.textMuted }]}>Market low</Text>
          <Text style={[styles.priceLabelVal, { color: t.text }]}>
            {data.currency} {data.marketLow}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.priceLabelTop, { color: t.textMuted }]}>Average</Text>
          <Text style={[styles.priceLabelVal, { color: t.text }]}>
            {data.currency} {data.marketAvg}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.priceLabelTop, { color: t.textMuted }]}>Market high</Text>
          <Text style={[styles.priceLabelVal, { color: t.text }]}>
            {data.currency} {data.marketHigh}
          </Text>
        </View>
      </View>
    </Section>
  );
}

export function AlternativeRow({ t, alt, onPress, showWhy = false }) {
  return (
    <Card t={t} padding={12} onPress={onPress} interactive>
      <View style={styles.altRow}>
        <ProductImage
          tone={alt.tone}
          size={64}
          radius={14}
          glyph={<Icon name="box" size={26} color="rgba(255,255,255,0.85)" strokeWidth={1.6} />}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.altMeta}>
            <Text style={[styles.altBrand, { color: t.textMuted }]}>{alt.brand}</Text>
            <Text style={[styles.altDot, { color: t.textDim }]}>·</Text>
            <Text style={[styles.altStore, { color: t.textMuted }]}>{alt.store}</Text>
          </View>
          <Text style={[styles.altName, { color: t.text }]} numberOfLines={2}>
            {alt.name}
          </Text>
          <View style={styles.altPriceRow}>
            <Text style={[styles.altPrice, { color: t.text }]}>{alt.price}</Text>
            {alt.tags && alt.tags[0] && (
              <Tag t={t} bg={t.brandSoft} color={t.brand} style={{ paddingHorizontal: 6, paddingVertical: 2 }} textStyle={{ fontSize: 9 }}>
                {alt.tags[0]}
              </Tag>
            )}
          </View>
          {showWhy && alt.why && (
            <View style={[styles.whyBlock, { backgroundColor: t.brandSoft, borderLeftColor: t.brand }]}>
              <Text style={[styles.whyText, { color: t.text }]}>{alt.why}</Text>
            </View>
          )}
        </View>
        <View style={styles.altScoreCol}>
          <MiniScore score={alt.score} t={t} size={42} />
          <Icon name="chevron" size={14} color={t.textDim} strokeWidth={2} />
        </View>
      </View>
    </Card>
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
  sectionPad: { padding: 18, paddingTop: 18, paddingBottom: 6 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brand: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginTop: 1,
    lineHeight: 20,
  },
  urlRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  urlText: { fontSize: 11, flex: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 18 },
  summary: { fontSize: 13, lineHeight: 19 },
  sections: { paddingHorizontal: 18, gap: 16 },
  sectionDesc: { fontSize: 13, lineHeight: 19 },
  claimRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  claimIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  claimNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  claimName: { fontSize: 13, fontWeight: '600', flex: 1 },
  claimNote: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  specsTable: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  specLabel: { fontSize: 12, fontWeight: '600', width: 90, flexShrink: 0 },
  specValue: { fontSize: 13, flex: 1, textAlign: 'right' },
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  flagIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  flagLabel: { flex: 1, fontSize: 13, lineHeight: 18 },
  sellerInfoRow: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sellerInfoText: { flex: 1, fontSize: 13, fontWeight: '600' },
  sellerNoRating: { fontSize: 11, flexShrink: 0 },
  ratingsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ratingNumRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  ratingNum: { fontSize: 38, fontWeight: '700', letterSpacing: -1, lineHeight: 42 },
  ratingDenom: { fontSize: 13, marginBottom: 4 },
  ratingCount: { fontSize: 11, marginTop: 2 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breakdownStar: { fontSize: 11, width: 12, textAlign: 'right' },
  breakdownTrack: { flex: 1, height: 6, borderRadius: 999 },
  breakdownFill: { height: '100%', borderRadius: 999 },
  breakdownPct: { fontSize: 10, width: 28, textAlign: 'right' },
  sourceRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 },
  themesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  themeLabel: { fontSize: 12, fontWeight: '600' },
  themeCount: { fontSize: 12, fontWeight: '700', opacity: 0.7 },
  quoteCard: {
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  quoteMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  quoteSrc: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  quoteDot: { fontSize: 11 },
  quoteWho: { fontSize: 11 },
  quoteText: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  priceBar: { marginTop: 16, height: 60 },
  priceTrack: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 999,
  },
  priceRange: {
    position: 'absolute',
    top: 0,
    height: '100%',
    borderRadius: 999,
    opacity: 0.85,
  },
  priceAvgMarker: {
    position: 'absolute',
    top: 16,
    alignItems: 'center',
    transform: [{ translateX: -8 }],
  },
  priceAvgLabel: { fontSize: 9, fontWeight: '700', marginBottom: 2 },
  priceAvgLine: { width: 2, height: 18, borderRadius: 1 },
  priceOurMarker: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    transform: [{ translateX: -30 }],
  },
  priceOurBubble: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  priceOurText: { color: '#FFFDF6', fontSize: 10, fontWeight: '700' },
  priceOurLine: { width: 2, height: 12, marginTop: 2 },
  priceOurDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: -5,
    borderWidth: 2,
  },
  priceLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  priceLabelTop: { fontSize: 11 },
  priceLabelVal: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  alternativesSection: { padding: 18, paddingTop: 24 },
  altHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  altSuperTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  altTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginTop: 2 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, fontWeight: '600' },
  altRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  altMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 1 },
  altBrand: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  altDot: { fontSize: 11 },
  altStore: { fontSize: 11 },
  altName: { fontSize: 14, fontWeight: '600', letterSpacing: -0.1, lineHeight: 19 },
  altPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  altPrice: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  whyBlock: { marginTop: 8, padding: 8, paddingHorizontal: 10, borderRadius: 10, borderLeftWidth: 2 },
  whyText: { fontSize: 12 },
  altScoreCol: { alignItems: 'center', gap: 4 },
  footer: { fontSize: 11, textAlign: 'center', lineHeight: 16, paddingHorizontal: 18 },
  ecoBanner: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  ecoBannerText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  newSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  newSearchBtnText: { color: '#FFFDF6', fontSize: 15, fontWeight: '600' },
});
