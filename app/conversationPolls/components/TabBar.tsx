import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';

interface TabBarProps {
  activeTab: 'active' | 'closed';
  onTabChange: (tab: 'active' | 'closed') => void;
  theme: any;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange, theme }) => {
  const { t } = useTranslation();

  return (
    <View style={[styles.tabContainer, { backgroundColor: theme.colors.card }]}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'active' && styles.activeTab]}
        onPress={() => onTabChange('active')}
      >
        <Text style={[
          styles.tabText, 
          { color: activeTab === 'active' ? theme.colors.primary : theme.colors.icon }
        ]}>
          {t('polls_screen.tab_active')}
        </Text>
        {activeTab === 'active' && (
          <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'closed' && styles.activeTab]}
        onPress={() => onTabChange('closed')}
      >
        <Text style={[
          styles.tabText, 
          { color: activeTab === 'closed' ? theme.colors.primary : theme.colors.icon }
        ]}>
          {t('polls_screen.tab_closed')}
        </Text>
        {activeTab === 'closed' && (
          <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
        )}
      </TouchableOpacity>
    </View>
  );
};
