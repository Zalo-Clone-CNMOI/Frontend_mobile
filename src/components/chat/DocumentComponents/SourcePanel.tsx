import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/src/theme/themeContext';
import { useTranslation } from 'react-i18next';
import { UploadZone } from './UploadZone';
import { ProcessingIndicator } from './ProcessingIndicator';
import { DocumentCard } from './DocumentCard';
import { documentService } from '@/src/services/ai/DocumentService';
import { useAIDocumentStore, DocumentMeta } from '@/src/store/useAIDocumentStore';
import { FileText, Trash2 } from 'lucide-react-native';

interface SourcePanelProps {
  selectedDocId: string | null;
  onSelectDoc: (doc: DocumentMeta) => void;
}

export function SourcePanel({ selectedDocId, onSelectDoc }: SourcePanelProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const documentsMap = useAIDocumentStore((state) => state.documents);
  const documents = Array.from(documentsMap.values());

  const processingDoc = documents.find(d => d.status === 'uploading' || d.status === 'processing');
  const completedDocs = documents.filter(d => d.status === 'completed');
  const otherDocs = documents.filter(d => d.status !== 'completed' && d.status !== 'uploading' && d.status !== 'processing');

  const handleDelete = (docId: string) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            documentService.removeDocument(docId);
            if (selectedDocId === docId) {
              onSelectDoc(completedDocs[0] || otherDocs[0] || {} as DocumentMeta);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Sources</Text>
      </View>

      {/* Upload Zone */}
      <View style={styles.uploadSection}>
        <UploadZone />
      </View>

      {/* Processing Indicator */}
      {processingDoc && (
        <ProcessingIndicator
          status={processingDoc.status}
          fileName={processingDoc.file_name}
        />
      )}

      {/* Document List */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {completedDocs.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.icon }]}>
              Indexed ({completedDocs.length})
            </Text>
            {completedDocs.map(doc => (
              <DocumentCard
                key={doc.document_id}
                document={doc}
                isSelected={selectedDocId === doc.document_id}
                onPress={() => onSelectDoc(doc)}
                onDelete={() => handleDelete(doc.document_id)}
              />
            ))}
          </>
        )}

        {otherDocs.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.icon, marginTop: 16 }]}>
              Other ({otherDocs.length})
            </Text>
            {otherDocs.map(doc => (
              <DocumentCard
                key={doc.document_id}
                document={doc}
                isSelected={selectedDocId === doc.document_id}
                onPress={() => onSelectDoc(doc)}
                onDelete={() => handleDelete(doc.document_id)}
              />
            ))}
          </>
        )}

        {documents.length === 0 && !processingDoc && (
          <View style={styles.emptyState}>
            <FileText size={32} color={theme.colors.icon} />
            <Text style={[styles.emptyText, { color: theme.colors.icon }]}>
              No documents yet
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
  },
  header: {
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  uploadSection: {
    marginBottom: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
});