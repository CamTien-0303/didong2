import {
  initializeCategories,
  subscribeToCategories
} from '@/services/categoryService';
import {
  initializeMenu,
  subscribeToMenu
} from '@/services/menuService';
import {
  addOrderItem,
  createOrder,
  getOrderByTable,
  updateOrderItem
} from '@/services/orderService';
import { TABLE_STATUS, updateTableStatus } from '@/services/tableService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Minus, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Category = {
  id: string;
  name: string;
  icon: string;
  order: number;
};

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  available: boolean;
  rating: number;
};

type CartItem = {
  menuId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
};

export default function MenuScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tableId = Array.isArray(params.tableId) ? params.tableId[0] : params.tableId;
  const tableNumber = Array.isArray(params.tableNumber) ? params.tableNumber[0] : params.tableNumber;
  const guests = Array.isArray(params.guests) ? params.guests[0] : params.guests;

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isCartVisible, setIsCartVisible] = useState(false);

  useEffect(() => {
    setupListeners();
  }, []);

  useEffect(() => {
    if (tableId) {
      loadOrCreateOrder();
    }
  }, [tableId]);

  useEffect(() => {
    filterItems();
  }, [selectedCategory, searchQuery, menuItems]);

  const setupListeners = () => {
    // Subscribe to categories
    const unsubCategories = subscribeToCategories((result) => {
      if (result.success) {
        setCategories(result.categories);
        if (result.categories.length === 0 && !isInitializing) {
          handleInitializeData();
        }
      }
      setIsLoading(false);
    });

    // Subscribe to menu
    const unsubMenu = subscribeToMenu((result) => {
      if (result.success) {
        setMenuItems(result.items);
      }
    });

    return () => {
      if (unsubCategories) unsubCategories();
      if (unsubMenu) unsubMenu();
    };
  };

  const handleInitializeData = async () => {
    setIsInitializing(true);
    Alert.alert(
      'Khởi tạo Menu',
      'Chưa có dữ liệu menu. Bạn có muốn tạo dữ liệu mặc định không?',
      [
        { text: 'Hủy', style: 'cancel', onPress: () => setIsInitializing(false) },
        {
          text: 'Tạo',
          onPress: async () => {
            await initializeCategories();
            await initializeMenu();
            Alert.alert('Thành công', 'Đã tạo dữ liệu menu');
            setIsInitializing(false);
          }
        }
      ]
    );
  };

  const loadOrCreateOrder = async () => {
    if (!tableId) {
      console.error('Missing tableId');
      return;
    }

    console.log('Loading order for table:', tableId);
    const { success, order, error } = await getOrderByTable(tableId as string);

    if (success && order) {
      console.log('Found existing order:', order.id);
      setOrderId(order.id);
      setCart(order.items || []);
    } else {
      console.log('Creating new order for table:', tableId);
      // Create new order
      const result = await createOrder(
        tableId as string,
        parseInt(tableNumber as string),
        parseInt(guests as string) || 0
      );

      if (result.success) {
        console.log('Created new order:', result.orderId);
        setOrderId(result.orderId);
        // Update table status to CO_KHACH
        await updateTableStatus(
          tableId as string,
          TABLE_STATUS.CO_KHACH,
          {
            guests: parseInt(guests as string) || 0,
            startTime: new Date()
          }
        );
      } else {
        console.error('Failed to create order:', result.error);
        Alert.alert('Lỗi', 'Không thể tạo đơn hàng: ' + result.error);
      }
    }
  };

  const filterItems = () => {
    let filtered = menuItems;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
      );
    }

    setFilteredItems(filtered);
  };

  const handleAddToCart = async (menuItem: MenuItem) => {
    if (!orderId) {
      Alert.alert('Lỗi', 'Chưa có đơn hàng');
      return;
    }

    const result = await addOrderItem(orderId, menuItem, 1);

    if (result.success) {
      // Update local cart
      const existingIndex = cart.findIndex(item => item.menuId === menuItem.id);
      if (existingIndex >= 0) {
        const newCart = [...cart];
        newCart[existingIndex].quantity += 1;
        setCart(newCart);
      } else {
        setCart([...cart, {
          menuId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
          imageUrl: menuItem.imageUrl
        }]);
      }
    } else {
      Alert.alert('Lỗi', result.error || 'Không thể thêm món');
    }
  };

  const handleUpdateQuantity = async (menuId: string, newQuantity: number) => {
    if (!orderId) return;

    const result = await updateOrderItem(orderId, menuId, newQuantity);

    if (result.success) {
      if (newQuantity <= 0) {
        setCart(cart.filter(item => item.menuId !== menuId));
      } else {
        setCart(cart.map(item =>
          item.menuId === menuId
            ? { ...item, quantity: newQuantity }
            : item
        ));
      }
    }
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      Alert.alert('Giỏ hàng trống', 'Vui lòng chọn món trước khi đặt');
      return;
    }

    // Open cart modal instead of alert
    setIsCartVisible(true);
  };

  const confirmOrder = () => {
    Alert.alert('Thành công', 'Đã gửi order đến bếp');
    setIsCartVisible(false);
    router.back();
  };

  const renderCategoryItem = ({ item }: { item: Category }) => {
    const isSelected = selectedCategory === item.id;

    return (
      <TouchableOpacity
        style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
        onPress={() => setSelectedCategory(item.id)}
      >
        <Text style={styles.categoryIcon}>{item.icon}</Text>
        <Text style={[
          styles.categoryText,
          isSelected && styles.categoryTextActive
        ]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => {
    const cartItem = cart.find(c => c.menuId === item.id);
    const quantity = cartItem?.quantity || 0;

    return (
      <View style={styles.menuCard}>
        <Image source={{ uri: item.imageUrl }} style={styles.menuImage} />
        <View style={styles.menuInfo}>
          <Text style={styles.menuName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.menuDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.menuFooter}>
            <Text style={styles.menuPrice}>
              {item.price.toLocaleString('vi-VN')}đ
            </Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingStar}>⭐</Text>
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          </View>
        </View>

        {quantity > 0 ? (
          <View style={styles.quantityControl}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleUpdateQuantity(item.id, quantity - 1)}
            >
              <Minus size={16} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleUpdateQuantity(item.id, quantity + 1)}
            >
              <Plus size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddToCart(item)}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={styles.loadingText}>Đang tải menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color="#1f2937" />
        </TouchableOpacity>
        {tableNumber && (
          <Text style={styles.headerTitle}>
            Bàn {tableNumber} ({guests || 0} khách)
          </Text>
        )}
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Bạn muốn ăn gì?"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === 'all' && styles.categoryChipActive
            ]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === 'all' && styles.categoryTextActive
            ]}>
              Tất cả
            </Text>
          </TouchableOpacity>

          {categories.map(cat => (
            <View key={cat.id}>
              {renderCategoryItem({ item: cat })}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Menu Items */}
      <FlatList
        data={filteredItems}
        renderItem={renderMenuItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.menuList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Không tìm thấy món ăn</Text>
          </View>
        }
      />

      {/* Cart Summary */}
      {cart.length > 0 && (
        <View style={styles.cartSummary}>
          <TouchableOpacity
            style={styles.cartInfo}
            onPress={() => setIsCartVisible(true)}
          >
            <View style={styles.cartBadge}>
              <ShoppingCart size={20} color="#fff" />
              <View style={styles.cartCount}>
                <Text style={styles.cartCountText}>{getTotalItems()}</Text>
              </View>
            </View>
            <Text style={styles.cartTotal}>
              {getTotalAmount().toLocaleString('vi-VN')}đ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.placeOrderButton}
            onPress={handlePlaceOrder}
          >
            <Text style={styles.placeOrderText}>Xem giỏ hàng</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={isCartVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCartVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác nhận đơn hàng</Text>
              <TouchableOpacity onPress={() => setIsCartVisible(false)}>
                <X size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {cart.map((item) => (
                <View key={item.menuId} style={styles.modalCartItem}>
                  <Image source={{ uri: item.imageUrl }} style={styles.cartItemImage} />
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemPrice}>
                      {item.price.toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                  <View style={styles.cartItemActions}>
                    <TouchableOpacity
                      style={styles.quantityButtonSmall}
                      onPress={() => handleUpdateQuantity(item.menuId, item.quantity - 1)}
                    >
                      <Minus size={14} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.quantityTextSmall}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButtonSmall}
                      onPress={() => handleUpdateQuantity(item.menuId, item.quantity + 1)}
                    >
                      <Plus size={14} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.trashButton}
                      onPress={() => handleUpdateQuantity(item.menuId, 0)}
                    >
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.modalTotalRow}>
                <Text style={styles.modalTotalLabel}>Tổng cộng:</Text>
                <Text style={styles.modalTotalAmount}>
                  {getTotalAmount().toLocaleString('vi-VN')}đ
                </Text>
              </View>
              <TouchableOpacity
                style={styles.confirmOrderButton}
                onPress={confirmOrder}
              >
                <Text style={styles.confirmOrderText}>Xác nhận gọi món</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },

  categoriesSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#ef4444',
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryTextActive: {
    color: '#fff',
  },

  menuList: {
    padding: 16,
    paddingBottom: 100,
  },
  menuCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  menuInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  menuName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  menuDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  menuFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  menuPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingStar: {
    fontSize: 14,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },

  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    minWidth: 24,
    textAlign: 'center',
  },

  cartSummary: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartBadge: {
    position: 'relative',
  },
  cartCount: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  cartTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeOrderButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  placeOrderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '50%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
  },
  modalCartItem: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
  },
  cartItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  cartItemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 12,
  },
  quantityButtonSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityTextSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    minWidth: 20,
    textAlign: 'center',
  },
  trashButton: {
    padding: 8,
    marginLeft: 4,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
    paddingBottom: 30, // Safe area
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTotalLabel: {
    fontSize: 18,
    color: '#6b7280',
  },
  modalTotalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  confirmOrderButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmOrderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },

  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});
