import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { cardShadow } from '../theme';

export default function ScreenHeader({ t, title, onBack, right }) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={onBack}
          style={[
            styles.iconBtn,
            {
              backgroundColor: t.surface,
              ...cardShadow(t),
            },
          ]}
          activeOpacity={0.7}
        >
          <Icon name="back" size={20} color={t.text} strokeWidth={2.2} />
        </TouchableOpacity>
        {right}
      </View>
      <Text style={[styles.title, { color: t.text, marginTop: 14 }]}>
        {title}
      </Text>
    </View>
  );
}

export function iconBtnStyle(t) {
  return {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: t.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow(t),
  };
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
});
