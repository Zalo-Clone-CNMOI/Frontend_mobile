import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";

export default function CardFeatures({ FEATURES }: { FEATURES: any }) {
    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            {/* Khối Icon bên trái */}
            <View style={styles.iconWrap}>
                <FEATURES.icon size={24} color={FEATURES.iconColor || "#0091ff"} />
            </View>

            {/* Khối nội dung ở giữa */}
            <View style={styles.contentWrap}>
                <View style={styles.subtitleContainer}>
                    <Text style={styles.cardTitle}>{FEATURES.title}</Text>
                    {FEATURES.description && (
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                            {FEATURES.description}
                        </Text>
                    )}
                </View>
                <ChevronRight size={18} color="#555" />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#000',
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    subtitleContainer: {
        flexDirection: 'column',
        marginTop: 2,
    },
    iconWrap: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    contentWrap: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 0.5,
        borderBottomColor: '#222',
        paddingBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '400',
        color: '#fff',
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#8e8e93',
        marginTop: 2,
    },
});