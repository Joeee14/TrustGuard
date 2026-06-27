import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';

export default function Tag({ children, t, color, bg, icon, style, textStyle }) {
  const bgColor = bg || t.brandSoft;
  const textColor = color || t.brand;

  return (
    <View style={[styles.tag, { backgroundColor: bgColor }, style]}>
      {icon && <Icon name={icon} size={11} color={textColor} strokeWidth={2.2} />}
      <Text style={[styles.text, { color: textColor }, textStyle]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
