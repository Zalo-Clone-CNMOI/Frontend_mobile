import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSeparator: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E5E5',
    marginLeft: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  headerRight: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  question: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  metadata: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxIcon: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: '#888',
    borderRadius: 2,
  },
  settingText: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  // Modern option container with large border-radius
  optionContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  optionSelected: {
    backgroundColor: '#EBF4FF',
    borderWidth: 2,
    borderColor: '#0068FF',
  },
  optionWithResult: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  // Radio/Checkbox icon
  selectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#BDBDBD',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionIconSelected: {
    borderColor: '#0068FF',
    backgroundColor: '#0068FF',
  },
  selectionIconSquare: {
    borderRadius: 4,
  },
  selectionIconInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0068FF',
  },
  selectionIconInnerEmpty: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Option label container
  optionLabelContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  optionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Option label
  optionLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  optionLabelWithResult: {
    color: '#333',
  },
  optionLabelVoted: {
    color: '#0068FF',
    fontWeight: '600',
  },
  // Vote count badge
  voteCountBadge: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
    marginLeft: 8,
  },
  // Progress section
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  // Percentage badge
  percentageBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    minWidth: 45,
    textAlign: 'right',
  },
  percentageBadgeVoted: {
    color: '#0068FF',
  },
  // Voter avatars stack
  voterAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginLeft: -8,
  },
  avatarFirst: {
    marginLeft: 0,
  },
  avatarMore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5E5',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginLeft: -8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  // Result info
  resultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  percentageTextVoted: {
    color: '#0068FF',
  },
  voteCountText: {
    fontSize: 13,
    color: '#999',
    marginLeft: 4,
  },
  voteCountTextVoted: {
    color: '#0068FF',
  },
  // Progress bar
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#E8F2FF',
    borderRadius: 4,
  },
  progressBarVoted: {
    backgroundColor: '#0068FF',
  },
  // Remove Option Button
  removeOptionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeOptionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
    lineHeight: 20,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  addOptionIcon: {
    fontSize: 24,
    color: '#0068FF',
    marginRight: 8,
  },
  addOptionText: {
    fontSize: 15,
    color: '#0068FF',
    fontWeight: '600',
  },
  addOptionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  addOptionInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#000',
  },
  addOptionConfirmButton: {
    backgroundColor: '#0068FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addOptionConfirmButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  addOptionConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  voteButton: {
    backgroundColor: '#0068FF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  voteButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  voteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
