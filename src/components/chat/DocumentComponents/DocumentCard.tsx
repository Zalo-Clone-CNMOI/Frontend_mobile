import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/src/theme/themeContext';
import { FileText, File, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import type { DocumentMeta } from '@/src/store/useAIDocumentStore';

interface DocumentCardProps {
  document: DocumentMeta;
  isSelected: boolean;
  onPress: () => void;
  onDelete: () => void;
}

export function DocumentCard({ document, isSelected, onPress, onDelete }: DocumentCardProps) {
  const theme = useTheme();

  const getStatusIcon = () => {
    switch (document.status) {
      case 'completed':
        return <CheckCircle size={14} color="#10b981" />;
      case 'processing':
        return <Clock size={14} color="#f59e0b" />;
      case 'failed':
        return <AlertCircle size={14} color="#ef4444" />;
      default:
        return <Clock size={14} color="#9ca3af" />;
    }
  };

  const getStatusText = () => {
    switch (document.status) {
      case 'completed':
        return `${document.chunks_count || 0} chunks indexed`;
      case 'processing':
        return 'Indexing...';
      case 'failed':
        return document.error_message || 'Failed';
      case 'uploading':
        return 'Uploading...';
      default:
        return 'Unknown';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isActive = document.status === 'completed';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: isSelected ? theme.colors.primary : 'transparent',
          borderWidth: isSelected ? 2 : 0,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: isActive ? theme.colors.primary + '12' : theme.colors.background }]}>
        <FileText size={18} color={isActive ? theme.colors.primary : theme.colors.icon} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.fileName, { color: theme.colors.text }]} numberOfLines={1}>
          {document.file_name}
        </Text>
        <View style={styles.meta}>
          {getStatusIcon()}
          <Text style={[styles.statusText, { color: theme.colors.icon }]}>
            {getStatusText()}
          </Text>
        </View>
        <Text style={[styles.sizeText, { color: theme.colors.icon }]}>
          {formatFileSize(document.file_size)}
        </Text>
      </View>
      <Pressable
        onPress={onDelete}
        hitSlop={8}
        style={[styles.deleteBtn, { backgroundColor: '#ef444415' }]}
      >
        <Trash2 size={14} color="#ef4444" />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 10,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
  },
  sizeText: {
    fontSize: 10,
    marginTop: 1,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});