import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/themeContext';
import { SourcePanel, ChatStudio } from '@/src/components/chat/DocumentComponents';
import { useAIDocumentStore, DocumentMeta } from '@/src/store/useAIDocumentStore';
import { FileText } from 'lucide-react-native';

export default function DocumentScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [selectedDoc, setSelectedDoc] = useState<DocumentMeta | null>(null);
  const documentsMap = useAIDocumentStore((state) => state.documents);
  const completedDocs = Array.from(documentsMap.values()).filter(d => d.status === 'completed');

  const handleSelectDoc = (doc: DocumentMeta) => {
    setSelectedDoc(doc);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Document AI</Text>
      </View>

      {/* Two-Pane Layout */}
      <View style={styles.content}>
        {/* Left Panel - Source Management (30%) */}
        {isMobile ? (
          <View style={styles.mobileLayout}>
            {/* Mobile Tab Switcher */}
            <View style={[styles.tabBar, { backgroundColor: theme.colors.card }]}>
              <Text
                style={[
                  styles.tabText,
                  { color: theme.colors.text },
                ]}
              >
                Sources
              </Text>
            </View>

            {/* Show SourcePanel or ChatStudio based on state */}
            {!selectedDoc ? (
              <SourcePanel selectedDocId={null} onSelectDoc={handleSelectDoc} />
            ) : (
              <View style={styles.mobileBack}>
                <Text
                  style={[styles.backText, { color: theme.colors.primary }]}
                  onPress={() => setSelectedDoc(null)}
                >
                  ← Back to sources
                </Text>
                <ChatStudio selectedDocument={selectedDoc} />
              </View>
            )}
          </View>
        ) : (
          // Desktop: Side by side
          <View style={styles.desktopLayout}>
            <View style={styles.leftPane}>
              <SourcePanel
                selectedDocId={selectedDoc?.document_id || null}
                onSelectDoc={handleSelectDoc}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.rightPane}>
              <ChatStudio selectedDocument={selectedDoc} />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPane: {
    width: 300,
    maxWidth: '30%',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
  },
  rightPane: {
    flex: 1,
  },
  mobileLayout: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 12,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  mobileBack: {
    flex: 1,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
    padding: 12,
  },
});