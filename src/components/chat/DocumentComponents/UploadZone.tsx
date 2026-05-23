import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/src/theme/themeContext';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { documentService } from '@/src/services/ai/DocumentService';

const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface UploadZoneProps {
  onUploadStart?: () => void;
}

export function UploadZone({ onUploadStart }: UploadZoneProps) {
  const theme = useTheme();

  const handlePress = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_TYPES,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const fileSize = asset.size || 0;

      if (fileSize > MAX_FILE_SIZE) {
        console.warn(`[UploadZone] File too large: ${fileSize} bytes`);
        return;
      }

      const file = {
        name: asset.name,
        uri: asset.uri,
        type: asset.mimeType || 'application/octet-stream',
        size: fileSize,
      };

      onUploadStart?.();
      await documentService.uploadDocument(file);
    } catch (error) {
      console.error('[UploadZone] Pick failed:', error);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.colors.primary + '08',
          borderColor: theme.colors.primary + '30',
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
        <Upload size={20} color={theme.colors.primary} />
      </View>
      <Text style={[styles.title, { color: theme.colors.primary }]}>
        Upload Document
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.icon }]}>
        PDF, DOCX, TXT • Max 10MB
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
  },
});