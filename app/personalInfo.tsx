import { useProfileStore } from '@/src/store/useProfileStore';
import { useTheme } from '@/src/theme/themeContext';
import { Calendar, ChevronLeft, Edit, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const profile = useProfileStore((state) => state.profile);
  const initializeProfile = useProfileStore((state) => state.initializeProfile);

  useEffect(() => {
    initializeProfile();
  }, [initializeProfile]);

  const InfoRow = ({ 
    icon: Icon, 
    label, 
    value 
  }: { 
    icon: any; 
    label: string; 
    value: string;
  }) => (
    <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
        <Icon size={20} color={theme.colors.primary} />
      </View>
      <Text style={[styles.infoLabel, { color: theme.colors.text }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.header }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={28} color={theme.colors.textHeader} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textHeader }]}>
          {t('personal_info.title')}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Profile Picture */}
        <View style={styles.profilePictureContainer}>
          <Image
            source={{ uri: profile?.avatar || 'https://i.pravatar.cc/200?u=user-me' }}
            style={styles.profilePicture}
          />
        </View>

        {/* Personal Information Details */}
        <View style={[styles.detailsSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <InfoRow
            icon={User}
            label={t('personal_info.zalo_name')}
            value={profile?.name || 'Nguyễn Nguyên'}
          />
          <InfoRow
            icon={Calendar}
            label={t('personal_info.date_of_birth')}
            value="05/10/2004"
          />
          <InfoRow
            icon={User}
            label={t('personal_info.gender')}
            value={t('personal_info.male')}
          />
        </View>

        {/* Edit Button */}
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => {}}
        >
          <Edit size={18} color={theme.colors.text} />
          <Text style={[styles.editButtonText, { color: theme.colors.text }]}>
            {t('personal_info.edit')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  profilePictureContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  detailsSection: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '400',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

