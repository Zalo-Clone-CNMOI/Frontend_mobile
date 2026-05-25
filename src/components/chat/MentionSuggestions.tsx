import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useTheme } from '@/src/theme/themeContext';
import { AtSign, Crown, Shield } from 'lucide-react-native';
import type { ConversationMember } from '@/src/store/useConversationDetailStore';

interface MentionSuggestionsProps {
  query: string;
  members: ConversationMember[];
  onSelect: (member: ConversationMember) => void;
  onClose: () => void;
}

export function MentionSuggestions({ query, members, onSelect, onClose }: MentionSuggestionsProps) {
  const theme = useTheme();

  const filtered = React.useMemo(() => {
    if (!query) return members.slice(0, 5);
    const lower = query.toLowerCase();
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(lower) ||
        (m.nickname && m.nickname.toLowerCase().includes(lower)),
    ).slice(0, 5);
  }, [query, members]);

  if (filtered.length === 0) return null;

  const getRoleIcon = (role: string) => {
    if (role === 'owner') return <Crown size={12} color={theme.colors.warning} />;
    if (role === 'admin') return <Shield size={12} color={theme.colors.warning} />;
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.item,
              { backgroundColor: pressed ? theme.colors.primary + '10' : 'transparent' },
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                {item.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                  {item.fullName}
                </Text>
                {getRoleIcon(item.role)}
              </View>
              {item.nickname && (
                <Text style={[styles.nickname, { color: theme.colors.muted }]} numberOfLines={1}>
                  @{item.nickname}
                </Text>
              )}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    maxHeight: 240,
    marginHorizontal: 12,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
  },
  nickname: {
    fontSize: 12,
    marginTop: 1,
  },
});
