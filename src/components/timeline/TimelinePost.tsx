import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/theme/themeContext';
import { USERS_V2 } from '@/src/data/contactsMockData';
import { useTranslation } from 'react-i18next';
import { formatTimeAgo } from '../../utils/formatTimeAgo';

type Props = {
  item: any;
};

export function TimelinePost({ item }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  const user = USERS_V2.find((u) => u.id === item.userId);
  const name = user ? user.fullName : t('timeline.default_user');
  const avatar = user?.avatar ?? '';
  const photo = item.images?.[0];
  const time = formatTimeAgo(item.createdAt);

  return (
    <View style={[styles.post, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.header}>
        <Image source={{ uri: avatar }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.colors.text }]}>{name}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
      </View>

      <Text style={[styles.content, { color: theme.colors.text }]}>{item.content}</Text>

      {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  post: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 10 },
  name: { fontSize: 15.5, fontWeight: '600' },
  time: { fontSize: 12, marginTop: 1, color: '#8e8e93' },
  content: { fontSize: 14.5, marginBottom: 10 },
  photo: { width: '100%', height: 220, borderRadius: 14 },
});
