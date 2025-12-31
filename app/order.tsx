import { getAllCategories } from '@/services/categoryService';
import { subscribeToMenu } from '@/services/menuService';
import {
  addOrderItem,
  completeOrder,
  createOrder,
  getOrderByTable,
  removeOrderItem,
  subscribeToTableOrders,
  updateOrderItem
} from '@/services/orderService';
import { updateTableStatus } from '@/services/tableService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Minus, Plus, Printer, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// Types mapping for this screen
type OrderItem = {
  id: string; // This is actually menuId in our new structure, or we map it
  menuId: string;
  menuItemName: string; // mapped from name
  quantity: number;
  price: number;
  status?: string;
  note?: string;
};

type Order = {
  id: string;
  tableId: string;
  tableName?: string;
  items: OrderItem[];
  total: number;
  status: string;
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tableId = Array.isArray(params.tableId) ? params.tableId[0] : params.tableId;
  const tableNumber = params.tableNumber;
  const guests = params.guests;

  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubMenu: (() => void) | undefined;
    let unsubOrder: (() => void) | undefined;

    const setupData = async () => {
      if (!tableId) return;

      // 1. Subscribe to Menu
      unsubMenu = subscribeToMenu((result) => {
        if (result.success) {
          setMenuItems(result.items);
        }
      });

      // 2. Load Categories
      const catResult = await getAllCategories();
      if (catResult.success) {
        setCategories(catResult.categories);
      }

      // 3. Initialize/Subscribe Order
      await ensureOrderExists();

      unsubOrder = subscribeToTableOrders(tableId, (result) => {
        setIsLoading(false);
        if (result.success) {
          if (result.order) {
            mapOrderToState(result.order);
          } else {
            setCurrentOrder(null);
          }
        } else {
          console.error('Order subscription error:', result.error);
          Alert.alert('Lỗi kết nối', 'Không thể tải đơn hàng: ' + result.error);
        }
      });
    };

    setupData();

    return () => {
      if (unsubMenu) unsubMenu();
      if (unsubOrder) unsubOrder();
    };
  }, [tableId]);

  const ensureOrderExists = async () => {
    // Check if valid order exists
    const { success, order } = await getOrderByTable(tableId!);

    if (!success || !order) {
      // Create new if not exists
      await createOrder(
        tableId!,
        parseInt(String(tableNumber || '0')),
        parseInt(String(guests || '0'))
      );
    }
  };

  const mapOrderToState = (firestoreOrder: any) => {
    // Map Firestore order structure to local state structure if needed
    // Our local structure expects: items with menuItemName
    const mappedItems = firestoreOrder.items.map((item: any) => ({
      id: item.menuId, // use menuId as id for list key
      menuId: item.menuId,
      menuItemName: item.name,
      quantity: item.quantity,
      price: item.price,
      status: item.status || 'DANG_LAM',
      note: item.note
    }));

    setCurrentOrder({
      id: firestoreOrder.id,
      tableId: firestoreOrder.tableId,
      tableName: `Bàn ${firestoreOrder.tableNumber}`,
      items: mappedItems,
      total: firestoreOrder.totalAmount,
      status: firestoreOrder.status
    });
  };

  const handleAddMenuItem = async (menuItem: any) => {
    if (!currentOrder) return;

    const result = await addOrderItem(currentOrder.id, menuItem, 1);

    if (!result.success) {
      Alert.alert('Lỗi', 'Không thể thêm món: ' + result.error);
    }
  };

  const handleUpdateQuantity = async (menuId: string, itemQuantity: number, delta: number) => {
    if (!currentOrder) return;

    const newQuantity = itemQuantity + delta;
    await updateOrderItem(currentOrder.id, menuId, newQuantity);
  };

  const handleCancelItem = async (menuId: string) => {
    if (!currentOrder) return;

    Alert.alert('Xác nhận hủy', 'Bạn có chắc muốn hủy món này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        style: 'destructive',
        onPress: async () => {
          await removeOrderItem(currentOrder.id, menuId);
        },
      },
    ]);
  };

  const handleCloseTable = async () => {
    if (!currentOrder) return;

    Alert.alert('Đóng bàn', `Xác nhận đóng bàn và thanh toán?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: async () => {
          try {
            const result = await completeOrder(currentOrder.id);
            if (result.success) {
              // Update table status to TRONG
              await updateTableStatus(tableId!, 'TRONG');
              Alert.alert('Thành công', 'Đã đóng bàn');
              router.back();
            } else {
              Alert.alert('Lỗi', 'Không thể đóng bàn: ' + result.error);
            }
          } catch (error) {
            Alert.alert('Lỗi', 'Đã có lỗi xảy ra');
          }
        },
      },
    ]);
  };

  const printBill = () => {
    if (!currentOrder) return;
    Alert.alert('In tạm tính', `Tổng tiền: ${currentOrder.total.toLocaleString('vi-VN')}₫`);
  };

  if (!tableId) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Vui lòng chọn bàn</Text>
      </View>
    );
  }

  if (isLoading || !currentOrder) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.emptyText}>Đang tải đơn hàng...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn hàng - {currentOrder.tableName}</Text>
        <TouchableOpacity
          onPress={() => setMenuModalVisible(true)}
          style={styles.addItemButton}
        >
          <Plus size={20} color="#10b981" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={currentOrder.items}
        keyExtractor={(item) => item.menuId}
        renderItem={({ item }) => (
          <View style={styles.orderItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.menuItemName}</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleUpdateQuantity(item.menuId, item.quantity, -1)}
                >
                  <Minus size={16} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>x{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleUpdateQuantity(item.menuId, item.quantity, 1)}
                >
                  <Plus size={16} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.itemPrice}>
                {(item.price * item.quantity).toLocaleString('vi-VN')}₫
              </Text>
            </View>

            <View style={styles.itemActions}>
              <View style={[styles.statusBadge, { backgroundColor: '#d1fae5' }]}>
                <Text style={[styles.statusText, { color: '#10b981' }]}>Đang phục vụ</Text>
              </View>
              <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelItem(item.menuId)}>
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có món nào trong đơn</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Tổng tiền:</Text>
          <Text style={styles.totalAmount}>
            {currentOrder.total.toLocaleString('vi-VN')}₫
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.printButton} onPress={printBill}>
            <Printer size={20} color="#fff" />
            <Text style={styles.printButtonText}>In tạm tính</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={handleCloseTable}>
            <Text style={styles.closeButtonText}>Thanh toán & Đóng bàn</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Modal */}
      <Modal
        visible={menuModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMenuModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm món</Text>
              <TouchableOpacity onPress={() => setMenuModalVisible(false)}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Category Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  selectedCategory === 'Tất cả' && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory('Tất cả')}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === 'Tất cả' && styles.categoryTextActive
                ]}>
                  Tất cả
                </Text>
              </TouchableOpacity>

              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.id && styles.categoryButtonActive
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === category.id && styles.categoryTextActive
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Menu Items List */}
            <FlatList
              data={
                selectedCategory === 'Tất cả'
                  ? menuItems
                  : menuItems.filter(item => item.category === selectedCategory)
              }
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    handleAddMenuItem(item);
                    setMenuModalVisible(false);
                  }}
                >
                  <View style={styles.menuItemInfo}>
                    <Text style={styles.menuItemName}>{item.name}</Text>
                    {item.description && (
                      <Text style={styles.menuItemDesc}>{item.description}</Text>
                    )}
                    <Text style={styles.menuItemPrice}>
                      {item.price.toLocaleString('vi-VN')}₫
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addMenuButton}
                    onPress={() => {
                      handleAddMenuItem(item);
                      setMenuModalVisible(false);
                    }}
                  >
                    <Plus size={20} color="#fff" />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              style={styles.menuList}
              contentContainerStyle={styles.menuListContent}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#111827',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addItemButton: {
    padding: 8,
    backgroundColor: '#1f2937',
    borderRadius: 8,
  },
  listContent: {
    padding: 20,
    paddingBottom: 200,
  },
  orderItem: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  quantityButton: {
    backgroundColor: '#374151',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    color: '#fff',
    minWidth: 30,
    textAlign: 'center',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  cancelButton: {
    padding: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1f2937',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 18,
    color: '#9ca3af',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  actionButtons: {
    gap: 10,
  },
  printButton: {
    backgroundColor: '#6b7280',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  printButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  categoryButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  categoryText: {
    color: '#9ca3af',
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#fff',
  },
  menuList: {
    maxHeight: 500,
  },
  menuListContent: {
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  menuItemDesc: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  addMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
});
