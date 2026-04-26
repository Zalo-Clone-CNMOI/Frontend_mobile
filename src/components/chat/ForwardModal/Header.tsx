import { ArrowLeft, Plus, Search, Upload, Users } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './styles';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCount: number;
  onClose: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedCount,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header Row 1: Back button, Title, Selected count */}
      <View style={styles.headerRow1}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t('forward.title')}</Text>
          <Text style={styles.selectedCountHeader}>
            {t('forward.selectedCount', { count: selectedCount })}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Header Row 2: Search Bar */}
      <View style={styles.headerRow2}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#8e8e93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('forward.searchPlaceholder')}
            placeholderTextColor="#8e8e93"
            value={searchQuery}
            onChangeText={onSearchChange}
          />
        </View>
      </View>

      {/* Header Row 3: Quick Actions */}
      <View style={styles.headerRow3}>
        <TouchableOpacity style={styles.quickActionButton}>
          <View style={styles.quickActionIcon}>
            <Users size={24} color="#0068FF" />
            <Plus size={12} color="#0068FF" style={styles.plusIcon} />
          </View>
          <Text style={styles.quickActionText}>{t('forward.newGroup')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionButton}>
          <View style={styles.quickActionIcon}>
            <Upload size={24} color="#0068FF" />
          </View>
          <Text style={styles.quickActionText}>{t('forward.otherApps')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
