import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';
import Tag from './Tag';
import Card from './Card';

export default function Section({ title, icon, t, children, status, action }) {
  const statusColor =
    status === 'pass'
      ? t.good
      : status === 'warn'
      ? t.mid
      : status === 'fail'
      ? t.bad
      : t.textMuted;

  const statusBg =
    status === 'pass'
      ? t.goodSoft
      : status === 'warn'
      ? t.midSoft
      : status === 'fail'
      ? t.badSoft
      : t.bg2;

  const statusLabel =
    status === 'pass'
      ? 'Verified'
      : status === 'warn'
      ? 'Caution'
      : status === 'fail'
      ? 'Failed'
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: t.brandSoft }]}>
            <Icon name={icon} size={15} color={t.brand} strokeWidth={2} />
          </View>
        )}
        <Text style={[styles.title, { color: t.text, flex: 1 }]}>{title}</Text>
        {status && statusLabel && (
          <Tag t={t} color={statusColor} bg={statusBg}>
            {statusLabel}
          </Tag>
        )}
        {action}
      </View>
      <Card t={t}>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
