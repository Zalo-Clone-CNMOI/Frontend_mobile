import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 8,
  },
  
  // ReplyBar styles
  replyingWrap: {
    margin: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  replyingBar: { width: 3, height: '100%' },
  replyingContent: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
  replyingTitle: { fontSize: 13, fontWeight: '600' },
  replyingText: { fontSize: 12.5, marginTop: 2 },
  replyingClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ImagePreview styles
  imagePreviewContainer: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    margin: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageGridItem: {
    position: 'relative',
    width: '31%',
    aspectRatio: 1,
  },
  imageGridThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreImageButton: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },

  // Composer styles
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: 8,
    justifyContent: 'center',
  },
  input: {
    fontSize: 17,
    color: '#000',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 40,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topSection: {
    paddingHorizontal: 15,
    marginBottom: 5,
  },
  recordingBanner: {
    marginHorizontal: 15,
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: '#CFE2FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordingText: {
    color: '#0A5CC2',
    fontSize: 13,
    fontWeight: '600',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  recordingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  micActiveBtn: {
    backgroundColor: '#EAF3FF',
    borderRadius: 20,
  },

  // MoreOptions styles
  moreBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
    height: 300,
  },
  option: {
    width: '48%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
});
