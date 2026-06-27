import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { cardShadow } from '../theme';

export default function Card({ children, t, style, padding = 16, onPress, interactive = false }) {
  const shadow = cardShadow(t);
  const containerStyle = [
    styles.card,
    {
      backgroundColor: t.surface,
      borderColor: t.border,
      padding,
      ...shadow,
    },
    style,
  ];

  if (onPress || interactive) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        style={containerStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
  },
});
