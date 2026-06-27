import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { tierColors } from '../theme';

function useAnimatedProgress(target) {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef(null);
  const startTimeRef = useRef(null);
  const startValRef = useRef(0);
  const DURATION = 700;

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

export default function MiniScore({ score, t, size = 38 }) {
  const { c, soft } = tierColors(t, score);
  const strokeWidth = 3;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useAnimatedProgress(score);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, flexShrink: 0 }}>
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
      <View style={StyleSheet.absoluteFillObject}>
        <View style={styles.center}>
          <Text style={[styles.label, { color: c, fontSize: size * 0.28 }]}>
            {score}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '700', letterSpacing: -0.3, lineHeight: 18 },
});
