import React, { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const PALETTES = {
  sage: ['#CFDFD2', '#A4BFAE'],
  cream: ['#F3E8D2', '#E1CFA9'],
  bottle: ['#3F6E58', '#264A3D'],
  rose: ['#E7CFC2', '#C99E89'],
  sand: ['#E5D4B2', '#C3A77A'],
  slate: ['#C2CCD3', '#8A9AA3'],
  bronze: ['#D8B07A', '#9A6E3C'],
  forest: ['#496B57', '#2E4A3C'],
  coral: ['#E8B4A2', '#C97A60'],
  moss: ['#B9C9A1', '#7E956A'],
  sky: ['#BFD4DD', '#7FA0AD'],
  cocoa: ['#A78566', '#6E523A'],
};

export default function ProductImage({ tone = 'sage', glyph, size = 60, radius = 14, uri }) {
  const [colorA, colorB] = PALETTES[tone] || PALETTES.sage;
  const [failed, setFailed] = useState(false);

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        resizeMode="cover"
        onError={() => setFailed(true)}
        style={[styles.container, { width: size, height: size, borderRadius: radius, backgroundColor: colorA }]}
      />
    );
  }

  return (
    <LinearGradient
      colors={[colorA, colorB]}
      start={{ x: 0.1, y: 0.1 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
      ]}
    >
      {glyph && <View style={styles.glyph}>{glyph}</View>}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glyph: {
    opacity: 0.9,
  },
});
