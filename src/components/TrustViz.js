import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Rect, Path, Defs, ClipPath, G } from 'react-native-svg';
import { tierColors, tierLabel, FONT } from '../theme';

// Use a state-driven approach for SVG stroke animation —
// avoids createAnimatedComponent quirks with new architecture.
function useAnimatedProgress(target) {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef(null);
  const startTimeRef = useRef(null);
  const startValRef = useRef(0);
  const DURATION = 900;

  useEffect(() => {
    const from = startValRef.current;
    const to = target / 100;
    startTimeRef.current = null;

    function tick(now) {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / DURATION, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const current = from + (to - from) * eased;
      setProgress(current);
      startValRef.current = current;
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target]);

  return progress;
}

export function TrustRing({ score, t, size = 168, strokeWidth = 14, showLabel = true }) {
  const { c, soft } = tierColors(t, score);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useAnimatedProgress(score);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        style={{ transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={soft}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={c}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, styles.ringCenter]}>
        <Text style={[styles.ringScore, { color: t.text, fontSize: size * 0.28 }]}>
          {score}
          <Text style={{ fontSize: size * 0.14, color: t.textMuted, fontWeight: '600' }}>%</Text>
        </Text>
        {showLabel && (
          <Text style={[styles.ringLabel, { color: c, marginTop: 4 }]}>
            {tierLabel(score)}
          </Text>
        )}
      </View>
    </View>
  );
}

export function TrustBar({ score, t, showLabel = true }) {
  const { c } = tierColors(t, score);
  const progress = useAnimatedProgress(score);
  const widthPct = `${progress * 100}%`;
  const thumbLeft = `${Math.min(progress * 100, 97)}%`;

  return (
    <View style={styles.barContainer}>
      <View style={styles.barScoreRow}>
        <Text style={[styles.barScoreNum, { color: t.text }]}>{score}</Text>
        <Text style={[styles.barScorePct, { color: t.textMuted }]}>%</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: t.bg2, borderColor: t.border }]}>
        <View style={[styles.barMarker, { left: '40%', backgroundColor: t.border }]} />
        <View style={[styles.barMarker, { left: '70%', backgroundColor: t.border }]} />
        <View style={[styles.barFill, { width: widthPct, backgroundColor: c }]} />
        <View
          style={[
            styles.barThumb,
            { left: thumbLeft, borderColor: c, transform: [{ translateX: -11 }] },
          ]}
        />
      </View>
      <View style={styles.barLabels}>
        <Text style={[styles.barLabelText, { color: t.textDim }]}>Risky</Text>
        <Text style={[styles.barLabelText, { color: t.textDim }]}>Caution</Text>
        <Text style={[styles.barLabelText, { color: t.textDim }]}>Trusted</Text>
      </View>
      {showLabel && (
        <Text style={[styles.barTierLabel, { color: c }]}>{tierLabel(score)}</Text>
      )}
    </View>
  );
}

export function TrustShieldBadge({ score, t, size = 168 }) {
  const { c, soft } = tierColors(t, score);
  const clipId = `shield-clip-${size}`;
  const fillY = 100 - score;
  const textColor = score > 50 ? '#FFFFFF' : t.text;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id={clipId}>
            <Path d="M50 6 L88 18 V48 C88 71 72 87 50 94 C28 87 12 71 12 48 V18 Z" />
          </ClipPath>
        </Defs>
        <Path
          d="M50 6 L88 18 V48 C88 71 72 87 50 94 C28 87 12 71 12 48 V18 Z"
          fill={soft}
        />
        <G clipPath={`url(#${clipId})`}>
          <Rect x="0" y={fillY} width="100" height={score} fill={c} />
        </G>
        <Path
          d="M50 6 L88 18 V48 C88 71 72 87 50 94 C28 87 12 71 12 48 V18 Z"
          fill="none"
          stroke={c}
          strokeWidth="2.5"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, styles.ringCenter]}>
        <Text style={[styles.shieldScore, { color: textColor, fontSize: size * 0.28 }]}>
          {score}
          <Text style={{ fontSize: size * 0.13, opacity: 0.8 }}>%</Text>
        </Text>
        <Text style={[styles.shieldLabel, { color: textColor }]}>
          {tierLabel(score)}
        </Text>
      </View>
    </View>
  );
}

export function TrustGrade({ score, t, size = 168 }) {
  const { c, soft } = tierColors(t, score);
  let grade = 'F';
  if (score >= 90) grade = 'A+';
  else if (score >= 80) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 55) grade = 'C';
  else if (score >= 40) grade = 'D';

  return (
    <View
      style={[
        styles.gradeContainer,
        { width: size, height: size, backgroundColor: soft, borderColor: c, borderRadius: 32 },
      ]}
    >
      <Text style={[styles.gradeLetter, { color: c, fontSize: size * 0.42 }]}>{grade}</Text>
      <View style={styles.gradeScoreRow}>
        <Text style={[styles.gradeScoreNum, { color: t.text }]}>{score}</Text>
        <Text style={[styles.gradeScorePct, { color: t.textMuted }]}>%</Text>
      </View>
      <Text style={[styles.gradeTierLabel, { color: c }]}>{tierLabel(score)}</Text>
    </View>
  );
}

export function TrustViz({ score, t, variant = 'ring', size }) {
  if (variant === 'bar') return <TrustBar score={score} t={t} />;
  if (variant === 'shield') return <TrustShieldBadge score={score} t={t} size={size} />;
  if (variant === 'grade') return <TrustGrade score={score} t={t} size={size} />;
  return <TrustRing score={score} t={t} size={size} />;
}

const styles = StyleSheet.create({
  ringCenter: { alignItems: 'center', justifyContent: 'center' },
  ringScore: { fontWeight: '700', letterSpacing: -1, lineHeight: 48 },
  ringLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  barContainer: { width: '100%', alignItems: 'center', gap: 10 },
  barScoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barScoreNum: { fontWeight: '700', fontSize: 52, lineHeight: 56, letterSpacing: -1.6 },
  barScorePct: { fontWeight: '600', fontSize: 22, marginBottom: 6 },
  barTrack: {
    width: '100%', height: 16, borderRadius: 999, borderWidth: 1,
    overflow: 'hidden', position: 'relative',
  },
  barMarker: { position: 'absolute', top: 0, bottom: 0, width: 1 },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999 },
  barThumb: {
    position: 'absolute', top: '50%', width: 22, height: 22,
    borderRadius: 11, backgroundColor: '#FFFFFF', borderWidth: 3, marginTop: -11,
  },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  barLabelText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  barTierLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  shieldScore: { fontWeight: '700', letterSpacing: -1, lineHeight: 48 },
  shieldLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
  gradeContainer: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', padding: 12 },
  gradeLetter: { fontWeight: '700', letterSpacing: -3, lineHeight: 72 },
  gradeScoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 4 },
  gradeScoreNum: { fontWeight: '700', fontSize: 22 },
  gradeScorePct: { fontWeight: '600', fontSize: 13, marginBottom: 2 },
  gradeTierLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 },
});
