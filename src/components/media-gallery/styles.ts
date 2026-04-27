import { StyleSheet } from 'react-native';

const GRID_SPACING = 2;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridContainer: {
    padding: GRID_SPACING,
    gap: GRID_SPACING,
  },
  gridItem: {
    margin: GRID_SPACING / 2,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  headerButton: {
    marginLeft: -8,
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 16,
    gap: 8,
  },
  tabsContainer: {
    flexGrow: 0,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  viewModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 4,
  },
  viewModeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  viewModeActive: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: '#fff',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 4,
  },
  fileOverlay: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  listItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  listThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listFileIcon: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listVideoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  listVideoText: {
    color: '#fff',
    fontSize: 10,
  },
  listInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  listName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  listMeta: {
    fontSize: 13,
    marginBottom: 2,
  },
  listDate: {
    fontSize: 12,
  },
  linkItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  linkUrl: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  linkTitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  linkMeta: {
    fontSize: 12,
  },
});
