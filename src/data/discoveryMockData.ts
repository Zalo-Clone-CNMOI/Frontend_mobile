import { LucideIcon , Video, CircleDollarSign, ShoppingBag, Newspaper, Gamepad2, MapPin, Sparkles } from 'lucide-react-native';




export interface DiscoveryFeature {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
}

export const DISCOVERY_FEATURES_MOCK_DATA: DiscoveryFeature[] = [
  { id: '1', title: 'Zalo Video', icon: Video, description: 'Xem video tuyệt vời' },
  { id: '2', title: 'ZaloPay', icon: CircleDollarSign, description: 'Thanh toán nhanh chóng' },
  { id: '3', title: 'Zalo Shopping', icon: ShoppingBag, description: 'Mua sắm trực tuyến' },
  { id: '4', title: 'News', icon: Newspaper, description: 'Cập nhật tin tức mới nhất' },
  { id: '5', title: 'Game', icon: Gamepad2, description: 'Chơi game hấp dẫn' },
  { id: '6', title: 'Nearby', icon: MapPin, description: 'Vị trí gần đây' },
  { id: '7', title: 'Suggestions', icon: Sparkles, description: 'Đề xuất cho bạn' },
  { id: '8', title: 'Zalo Mini App', icon: Sparkles, description: 'Trải nghiệm mini app mới' },
  { id: '9', title: 'Zalo Live', icon: Video, description: 'Xem live stream hấp dẫn' },
  { id: '10', title: 'Zalo Community', icon: Sparkles, description: 'Tham gia cộng đồng' },
  { id: '11', title: 'Zalo Groups', icon: Sparkles, description: 'Tham gia nhóm' },
  { id: '12', title: 'Zalo Events', icon: Sparkles, description: 'Tham gia sự kiện' },
];
