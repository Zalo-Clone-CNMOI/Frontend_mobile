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
    paddingVertical: 12,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  headerRight: {
    padding: 4,
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
    gap: 8,
  },
  option: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionSelected: {
    backgroundColor: '#EBF4FF',
    borderWidth: 1,
    borderColor: '#0068FF',
  },
  optionText: {
    fontSize: 18,
    color: '#000',
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#0068FF',
  },
  optionDisabled: {
    opacity: 0.6,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  addOptionIcon: {
    fontSize: 20,
    color: '#888',
    marginRight: 8,
  },
  addOptionText: {
    fontSize: 14,
    color: '#888',
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000',
  },
  addOptionConfirmButton: {
    backgroundColor: '#0068FF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  voteButton: {
    backgroundColor: '#0068FF',
    borderRadius: 25,
    paddingVertical: 14,
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
