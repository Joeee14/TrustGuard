import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from './Icon';

export default function Button({ children, t, primary, ghost, danger, fullWidth, icon, onPress, style }) {
  const bg = danger ? t.bad : primary ? t.brand : ghost ? 'transparent' : t.surface;
  const textColor = danger || primary ? '#FFFDF6' : t.text;
  const borderColor = ghost ? t.borderStrong : t.border;
  const borderWidth = ghost ? 1 : primary || danger ? 0 : 1;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth,
          width: fullWidth ? '100%' : undefined,
          shadowColor: primary || danger ? '#11365E' : 'transparent',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: primary || danger ? 0.2 : 0,
          shadowRadius: 14,
          elevation: primary || danger ? 4 : 0,
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={18} color={textColor} strokeWidth={2} />}
      <Text style={[styles.label, { color: textColor }]}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
