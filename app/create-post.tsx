import { useCreatePostScreenLogic } from '@/src/hooks/screens/useCreatePostScreen';
import { useTheme } from '@/src/theme/themeContext';
import { Camera, Image as ImageIcon, Send, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreatePostScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const {
    handleAddFromCamera,
    handleAddFromGallery,
    handleCancel,
    handleRemoveImage,
    handleSubmit,
    isSubmitting,
    postContent,
    selectedImages,
    setPostContent,
  } = useCreatePostScreenLogic();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <X size={20} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('create_post.title', 'Tao bai viet')}</Text>

        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.headerButton, { opacity: isSubmitting ? 0.5 : 1 }]}
          disabled={isSubmitting}
        >
          <Send size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.userInfo}>
          <Image source={{ uri: 'https://i.pravatar.cc/150?u=current-user' }} style={[styles.userAvatar, { backgroundColor: theme.colors.background }]} />
          <View>
            <Text style={[styles.userName, { color: theme.colors.text }]}>{t('create_post.you', 'Ban')}</Text>
            <Text style={[styles.postTime, { color: theme.colors.icon }]}>{t('create_post.now', 'Bay gio')}</Text>
          </View>
        </View>

        <TextInput
          style={[
            styles.postInput,
            {
              color: theme.colors.text,
              backgroundColor: theme.colors.card,
            },
          ]}
          placeholder={t('create_post.placeholder', 'Ban dang nghi gi?')}
          placeholderTextColor={theme.colors.icon}
          multiline
          value={postContent}
          onChangeText={setPostContent}
          autoFocus
        />

        {selectedImages.length > 0 ? (
          <View style={styles.imagesContainer}>
            {selectedImages.map((image, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: image }} style={styles.selectedImage} />
                <TouchableOpacity style={styles.removeImageButton} onPress={() => handleRemoveImage(index)}>
                  <X size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[styles.mediaOptions, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity style={styles.mediaOption} onPress={handleAddFromCamera}>
            <Camera size={20} color={theme.colors.primary} />
            <Text style={[styles.mediaOptionText, { color: theme.colors.text }]}>{t('create_post.add_photo', 'Them anh')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mediaOption} onPress={handleAddFromGallery}>
            <ImageIcon size={20} color={theme.colors.primary} />
            <Text style={[styles.mediaOptionText, { color: theme.colors.text }]}>{t('create_post.add_from_gallery', 'Them tu thu vien')}</Text>
          </TouchableOpacity>
        </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  postTime: {
    fontSize: 14,
    marginTop: 2,
  },
  postInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  imageWrapper: {
    position: 'relative',
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    padding: 4,
  },
  mediaOptions: {
    borderRadius: 12,
    padding: 16,
  },
  mediaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  mediaOptionText: {
    fontSize: 16,
    marginLeft: 12,
  },
});
