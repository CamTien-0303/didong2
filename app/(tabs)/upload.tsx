import { MenuItem } from '@/types/order';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, Tag, TrendingUp } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const MENU_KEY = 'menu-items';

const DEFAULT_MENU: MenuItem[] = [
  { id: '1', name: 'Cà phê đen', price: 25000, category: 'Đồ uống', description: 'Cà phê đen đậm đà' },
  { id: '2', name: 'Cà phê sữa', price: 30000, category: 'Đồ uống', description: 'Cà phê sữa thơm ngon' },
  { id: '3', name: 'Bánh mì thịt', price: 35000, category: 'Đồ ăn', description: 'Bánh mì thịt nướng' },
  { id: '4', name: 'Bánh mì pate', price: 30000, category: 'Đồ ăn', description: 'Bánh mì pate truyền thống' },
  { id: '5', name: 'Phở bò', price: 80000, category: 'Đồ ăn', description: 'Phở bò Hà Nội' },
  { id: '6', name: 'Bún chả', price: 70000, category: 'Đồ ăn', description: 'Bún chả Hà Nội' },
  { id: '7', name: 'Nước cam', price: 40000, category: 'Đồ uống', description: 'Nước cam tươi' },
  { id: '8', name: 'Trà đá', price: 10000, category: 'Đồ uống', description: 'Trà đá mát lạnh' },
];

const CATEGORIES = ['Tất cả', 'Đồ uống', 'Đồ ăn'];

export default function MenuScreen() {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  useFocusEffect(
    useCallback(() => {
      loadMenu();
    }, [])
  );

  const loadMenu = async () => {
    try {
      const savedMenu = await AsyncStorage.getItem(MENU_KEY);
      if (savedMenu) {
        setMenuItems(JSON.parse(savedMenu));
      } else {
        await AsyncStorage.setItem(MENU_KEY, JSON.stringify(DEFAULT_MENU));
        setMenuItems(DEFAULT_MENU);
      }
    } catch (error) {
      console.error('Lỗi load menu:', error);
    }
  };

  const filteredItems =
    selectedCategory === 'Tất cả'
      ? menuItems
      : menuItems.filter((item) => item.category === selectedCategory);

  const bestSellers = menuItems.filter((_, i) => i < 3);
  const onSaleItems = menuItems.filter((_, i) => i >= 3 && i < 5);

  const addToOrder = (item: MenuItem) => {
    // Hiển thị dialog chọn bàn hoặc lấy từ state
    Alert.alert(
      'Chọn bàn',
      'Vui lòng chọn bàn để thêm món',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Chọn bàn',
          onPress: () => {
            // Navigate đến màn hình sơ đồ bàn để chọn
            router.push('/(tabs)');
          },
        },
      ]
    );
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => {
    const discount = item.price > 50000 ? Math.round(((item.price - item.price * 0.9) / item.price) * 100) : 0;

    return (
      <View style={styles.card}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageText}>🍽️</Text>
        </View>

        <View style={styles.badgeContainer}>
          {bestSellers.includes(item) && (
            <View style={[styles.badge, styles.badgeHot]}>
              <TrendingUp size={12} color="white" />
              <Text style={styles.badgeText}>Hot</Text>
            </View>
          )}
          {onSaleItems.includes(item) && discount > 0 && (
            <View style={[styles.badge, styles.badgeSale]}>
              <Tag size={12} color="white" />
              <Text style={styles.badgeText}>-{discount}%</Text>
            </View>
          )}
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cardDesc} numberOfLines={1}>
            {item.description || item.category}
          </Text>

          <View style={styles.priceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={styles.price}>{item.price.toLocaleString('vi-VN')}₫</Text>
            </View>

            <TouchableOpacity style={styles.addButton} onPress={() => addToOrder(item)}>
              <Plus color="white" size={20} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catButton, selectedCategory === cat && styles.catButtonActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Menu List */}
      <FlatList
        data={filteredItems}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={() =>
          selectedCategory === 'Tất cả' ? (
            <View>
              {/* Trending Section */}
              <View style={styles.sectionHeader}>
                <TrendingUp color="#f97316" size={20} />
                <Text style={styles.sectionTitle}>Trending Now</Text>
              </View>
              <FlatList
                horizontal
                data={bestSellers}
                renderItem={renderMenuItem}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
              />

              {/* Sale Section */}
              <View style={styles.sectionHeader}>
                <Tag color="#db2777" size={20} />
                <Text style={styles.sectionTitle}>Flash Sale</Text>
              </View>
              <FlatList
                horizontal
                data={onSaleItems}
                renderItem={renderMenuItem}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
              />

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🍕 All Items</Text>
              </View>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    paddingTop: 50,
  },
  categoryContainer: {
    height: 60,
  },
  categoryList: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  catButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  catButtonActive: {
    backgroundColor: '#db2777',
    borderColor: '#db2777',
  },
  catText: {
    color: '#9ca3af',
    fontWeight: '600',
  },
  catTextActive: {
    color: 'white',
  },
  listContent: {
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    marginBottom: 16,
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#374151',
    width: 280,
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageText: {
    fontSize: 48,
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeHot: {
    backgroundColor: '#f97316',
  },
  badgeSale: {
    backgroundColor: '#db2777',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardInfo: {
    padding: 12,
  },
  cardName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDesc: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    color: '#ec4899',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#db2777',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
