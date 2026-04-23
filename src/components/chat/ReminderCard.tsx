import { useTheme } from '@/src/theme/themeContext';
import { Calendar } from 'lucide-react-native';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface Reminder {
  id: string;
  title: string;
  date: number;
  description?: string;
}

interface ReminderCardProps {
  reminders: Reminder[];
}

export const ReminderCard: React.FC<ReminderCardProps> = ({
  reminders,
}) => {
  const theme = useTheme();

  if (reminders.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
        <View style={styles.emptyContainer}>
          <Calendar size={32} color={theme.colors.icon} strokeWidth={1.5} />
          <Text style={[styles.emptyText, { color: theme.colors.icon }]}>
            Chưa có nhắc hẹn nào
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.header}>
        <Calendar size={20} color={theme.colors.primary} strokeWidth={2} />
        <Text style={[styles.headerText, { color: theme.colors.text }]}>
          Nhắc hẹn sắp tới
        </Text>
      </View>
      
      {reminders.map((reminder) => (
        <View key={reminder.id} style={[styles.reminderItem, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.reminderTitle, { color: theme.colors.text }]}>
            {reminder.title}
          </Text>
          {reminder.description && (
            <Text style={[styles.reminderDescription, { color: theme.colors.icon }]}>
              {reminder.description}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  reminderItem: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  reminderDescription: {
    fontSize: 12,
    fontWeight: '400',
  },
});
