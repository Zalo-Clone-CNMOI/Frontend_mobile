import { ChevronLeft, MoreHorizontal, XCircle, Edit2, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View, Modal, StyleSheet } from 'react-native';
import { styles } from './styles';

interface PollHeaderProps {
  groupName: string;
  creatorName?: string;
  onClose: () => void;
  // Action permissions
  canClose?: boolean;
  canEdit?: boolean;
  canRemove?: boolean;
  isClosed?: boolean;
  // Action handlers
  onClosePoll?: () => void;
  onEditPoll?: () => void;
  onRemovePoll?: () => void;
  isClosing?: boolean;
}

export const PollHeader: React.FC<PollHeaderProps> = ({
  groupName,
  creatorName,
  onClose,
  canClose = false,
  canEdit = false,
  canRemove = false,
  isClosed = false,
  onClosePoll,
  onEditPoll,
  onRemovePoll,
  isClosing = false,
}) => {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);

  const hasActions = canClose || canEdit || canRemove;

  const handleClosePoll = () => {
    setShowMenu(false);
    onClosePoll?.();
  };

  const handleEditPoll = () => {
    setShowMenu(false);
    onEditPoll?.();
  };

  const handleRemovePoll = () => {
    setShowMenu(false);
    onRemovePoll?.();
  };

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerLeft}>
          <ChevronLeft size={24} color="#000" />
          <View style={styles.headerSeparator} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('pollDetail.title', 'Bình chọn')}</Text>
          <Text style={styles.headerSubtitle}>
            {creatorName || groupName}
          </Text>
        </View>

        {/* Show more menu button only if user has actions available */}
        {hasActions && !isClosed ? (
          <TouchableOpacity style={styles.headerRight} onPress={() => setShowMenu(true)}>
            <MoreHorizontal size={24} color="#000" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      {/* Action Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={actionMenuStyles.overlay}
          onPress={() => setShowMenu(false)}
          activeOpacity={1}
        >
          <View style={actionMenuStyles.menu}>
            {/* Close Poll Option */}
            {canClose && !isClosed && (
              <TouchableOpacity
                style={actionMenuStyles.menuItem}
                onPress={handleClosePoll}
                disabled={isClosing}
              >
                <XCircle size={20} color="#FF4444" />
                <Text style={[actionMenuStyles.menuText, actionMenuStyles.menuTextDanger]}>
                  {isClosing
                    ? t('pollDetail.closing', 'Đang kết thúc...')
                    : t('pollDetail.closePoll', 'Kết thúc bình chọn')}
                </Text>
              </TouchableOpacity>
            )}

            {/* Edit Poll Option */}
            {canEdit && !isClosed && (
              <TouchableOpacity
                style={actionMenuStyles.menuItem}
                onPress={handleEditPoll}
              >
                <Edit2 size={20} color="#0068FF" />
                <Text style={actionMenuStyles.menuText}>
                  {t('pollDetail.editPoll', 'Chỉnh sửa')}
                </Text>
              </TouchableOpacity>
            )}

            {/* Remove Poll Option */}
            {canRemove && (
              <TouchableOpacity
                style={actionMenuStyles.menuItem}
                onPress={handleRemovePoll}
              >
                <Trash2 size={20} color="#FF4444" />
                <Text style={[actionMenuStyles.menuText, actionMenuStyles.menuTextDanger]}>
                  {t('pollDetail.removePoll', 'Xóa bình chọn')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const actionMenuStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  menuTextDanger: {
    color: '#FF4444',
  },
});
