import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function Stars({ value, t, size = 12, showCount = true }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;

  return (
    <View style={styles.row}>
      <View style={styles.stars}>
        {[0, 1, 2, 3, 4].map((i) => {
          const filled = i < full || (i === full && half);
          return (
            <Svg key={i} width={size} height={size} viewBox="0 0 24 24">
              <Path
                d="M12 3.5l2.7 5.5 6 .9-4.4 4.3 1 6.1L12 17.5l-5.4 2.8 1-6.1L3.3 9.9l6-.9z"
                fill={filled ? t.accent : 'none'}
                stroke={filled ? t.accent : t.textDim}
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </Svg>
          );
        })}
      </View>
      {showCount && (
        <Text style={[styles.count, { color: t.textMuted }]}>{value.toFixed(1)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stars: {
    flexDirection: 'row',
    gap: 1,
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
  },
});
