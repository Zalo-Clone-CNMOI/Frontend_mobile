import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { catchUp, CatchUpResult } from '../../services/ai/aiConversationApi';

interface CatchUpBannerProps {
  conversationId: string;
}

export function CatchUpBanner({ conversationId }: CatchUpBannerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CatchUpResult | null>(null);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePress = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await catchUp(conversationId);
      setResult(data);
      setVisible(true);
    } catch (e: any) {
      setError(e?.message || 'Không thể lấy tóm tắt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.banner} onPress={handlePress} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Text style={styles.bannerText}>
              📋 Xem tóm tắt tin nhắn
            </Text>
            <Text style={styles.bannerLink}>Xem tóm tắt →</Text>
          </>
        )}
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tóm tắt tin nhắn chưa đọc</Text>
            {result && (
              <>
                {result.hadUnread ? (
                  <>
                    <ScrollView style={styles.summaryScroll}>
                      <Text style={styles.summaryText}>
                        {result.summary || 'Không có tóm tắt'}
                      </Text>
                    </ScrollView>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>
                        {result.messageCount} tin nhắn
                        {result.cached ? ' · Từ cache' : ''}
                        {result.truncated ? ' · Đã cắt ngắn (tóm tắt tin gần nhất)' : ''}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.noUnreadContainer}>
                    <Text style={styles.noUnreadText}>Bạn đã đọc hết rồi</Text>
                  </View>
                )}
              </>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setVisible(false);
                setResult(null);
                setError(null);
              }}
            >
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#b3d9f7',
  },
  bannerText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  bannerLink: {
    fontSize: 14,
    color: '#007aff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  summaryScroll: {
    maxHeight: 200,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  metaRow: {
    marginBottom: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#888',
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    marginBottom: 12,
  },
  closeButton: {
    backgroundColor: '#007aff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noUnreadContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noUnreadText: {
    fontSize: 15,
    color: '#666',
  },
});