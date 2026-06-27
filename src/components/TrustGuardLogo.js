import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { FONT } from '../theme';

export function TrustGuardMark({ size = 56, t }) {
  const gradId = `tg-shield-${size}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.brand} />
          <Stop offset="1" stopColor={t.brandInk} />
        </LinearGradient>
      </Defs>
      <Path
        d="M28 3 L50 11 V28 C50 41 40.5 50 28 53 C15.5 50 6 41 6 28 V11 Z"
        fill={`url(#${gradId})`}
      />
      <Path
        d="M28 8 L45 14.5 V28 C45 38.5 37.5 45.8 28 48.3 C18.5 45.8 11 38.5 11 28 V14.5 Z"
        fill="none"
        stroke={t.accent}
        strokeOpacity="0.55"
        strokeWidth="0.8"
      />
      <Path
        d="M16.5 28 L25 36.5 L40 19"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="40" cy="19" r="2" fill={t.accent} opacity="0.9" />
    </Svg>
  );
}

export function TrustGuardWordmark({ size = 22, t, tagline = false }) {
  return (
    <View style={styles.wordmarkContainer}>
      <Text style={[styles.wordmark, { fontSize: size }]}>
        <Text style={{ color: t.text }}>Trust</Text>
        <Text style={{ color: t.brand }}>Guard</Text>
      </Text>
      {tagline && (
        <Text style={[styles.tagline, { color: t.textMuted }]}>
          Shop with confidence
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wordmarkContainer: {
    flexDirection: 'column',
    gap: 2,
  },
  wordmark: {
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  tagline: {
    fontFamily: FONT,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '500',
    marginTop: 2,
  },
});
