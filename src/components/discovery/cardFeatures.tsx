import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/src/theme/themeContext';

export default function CardFeatures({ FEATURES }: { FEATURES: any }) {
  const theme = useTheme();

  return (
    <TouchableOpacity activeOpacity={0.7} style={[styles.card, { backgroundColor: theme.colors.background }]}>
      <View style={styles.iconWrap}>
        <FEATURES.icon size={24} color={FEATURES.iconColor || theme.colors.primary} />
      </View>
      <View style={[styles.contentWrap, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.textWrap}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {FEATURES.title}
          </Text>
          {FEATURES.description ? (
            <Text style={[styles.cardSubtitle, { color: '#8e8e93' }]} numberOfLines={1}>
              {FEATURES.description}
            </Text>
          ) : null}
        </View>
        <ChevronRight size={18} color="#8e8e93" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  textWrap: {
    flex: 1,
    paddingRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
