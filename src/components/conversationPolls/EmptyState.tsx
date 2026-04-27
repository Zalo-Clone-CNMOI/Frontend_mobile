import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart3 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { styles } from './styles';

interface EmptyStateProps {
  activeTab: 'active' | 'closed';
  onCreatePoll: () => void;
  theme: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ activeTab, onCreatePoll, theme }) => {
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.emptyScroll} contentContainerStyle={styles.emptyContainer}>
      <View style={styles.emptyIllustration}>
        <BarChart3 size={80} color={theme.colors.primary + '40'} />
      </View>
      <Text style={[styles.emptyMainText, { color: theme.colors.text }]}>
        {activeTab === 'active' 
          ? t('polls_screen.create_cta') 
          : (activeTab === 'closed' ? t('polls_screen.no_closed') : t('polls_screen.no_active'))}
      </Text>
      {activeTab === 'active' && (
        <TouchableOpacity
          style={[styles.emptyCreateButton, { backgroundColor: theme.colors.primary }]}
          onPress={onCreatePoll}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyCreateButtonText}>{t('polls_screen.create_button')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};
