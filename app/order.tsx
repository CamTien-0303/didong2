import { MenuItem, Order, OrderItem, OrderItemStatus, Table } from '@/types/order';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Minus, Plus, Printer, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const ORDERS_KEY = 'orders';
const TABLES_KEY = 'tables';
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

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tableId = params.tableId as string;
  const addItemId = params.addItem as string;

  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  useEffect(() => {
    if (tableId) {
      loadData();
    }
  }, [tableId]);

  useEffect(() => {
    if (addItemId && currentOrder) {
      addMenuItemToOrder(addItemId);
    }
  }, [addItemId]);

  const loadData = async () => {
    try {
      // Load table trước để có table name
      const savedTables = await AsyncStorage.getItem(TABLES_KEY);
      let foundTable: Table | null = null;
      if (savedTables) {
        const tables: Table[] = JSON.parse(savedTables);
        foundTable = tables.find((t) => t.id === tableId) || null;
        setTable(foundTable);
      }

      // Load menu
      const savedMenu = await AsyncStorage.getItem(MENU_KEY);
      if (savedMenu) {
        setMenuItems(JSON.parse(savedMenu));
      } else {
        // Khởi tạo menu mặc định nếu chưa có
        await AsyncStorage.setItem(MENU_KEY, JSON.stringify(DEFAULT_MENU));
        setMenuItems(DEFAULT_MENU);
      }

      // Load or create order
      const savedOrders = await AsyncStorage.getItem(ORDERS_KEY);
      const orders: Order[] = savedOrders ? JSON.parse(savedOrders) : [];
      const foundOrder = orders.find((o) => o.tableId === tableId && !o.paidAt);
      if (foundOrder) {
        setCurrentOrder(foundOrder);
      } else {
        // Tạo order mới
        const orderId = `order-${Date.now()}`;
        const timestamp = Date.now();
        const newOrder: Order = {
          id: orderId,
          orderCode: `#ORD-${timestamp.toString().slice(-4)}`,
          tableId: tableId,
          tableName: foundTable?.name || `Bàn ${tableId}`,
          items: [],
          total: 0,
          createdAt: timestamp,
          status: 'CHO_XAC_NHAN',
          customerType: 'KHACH_LE',
        };
        // Lưu order mới vào AsyncStorage ngay
        orders.push(newOrder);
        await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
        setCurrentOrder(newOrder);
      }
    } catch (error) {
      console.error('Lỗi load data:', error);
    }
  };

  const addMenuItemToOrder = async (menuItemId: string) => {
    if (!currentOrder) {
      Alert.alert('Lỗi', 'Không tìm thấy đơn hàng');
      return;
    }

    // Đảm bảo menu items đã được load
    let items = menuItems;
    if (items.length === 0) {
      const savedMenu = await AsyncStorage.getItem(MENU_KEY);
      if (savedMenu) {
        items = JSON.parse(savedMenu);
        setMenuItems(items);
      } else {
        items = DEFAULT_MENU;
        await AsyncStorage.setItem(MENU_KEY, JSON.stringify(DEFAULT_MENU));
        setMenuItems(DEFAULT_MENU);
      }
    }

    const menuItem = items.find((m) => m.id === menuItemId);
    if (!menuItem) {
      Alert.alert('Lỗi', 'Không tìm thấy món');
      return;
    }

    const existingItem = currentOrder.items.find(
      (item) => item.menuItemId === menuItemId && item.status === 'DANG_LAM'
    );

    let updatedItems: OrderItem[];
    if (existingItem) {
      updatedItems = currentOrder.items.map((item) =>
        item.id === existingItem.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      const newOrderItem: OrderItem = {
        id: `item-${Date.now()}`,
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        quantity: 1,
        price: menuItem.price,
        status: 'DANG_LAM',
      };
      updatedItems = [...currentOrder.items, newOrderItem];
    }

    const updatedOrder: Order = {
      ...currentOrder,
      items: updatedItems,
      total: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    };

    await saveOrder(updatedOrder);
    setCurrentOrder(updatedOrder);
  };

  const updateQuantity = async (itemId: string, delta: number) => {
    if (!currentOrder) return;

    const updatedItems = currentOrder.items
      .map((item) =>
        item.id === itemId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
      .filter((item) => item.quantity > 0);

    const updatedOrder: Order = {
      ...currentOrder,
      items: updatedItems,
      total: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    };

    await saveOrder(updatedOrder);
    setCurrentOrder(updatedOrder);
  };

  const saveOrder = async (order: Order) => {
    try {
      const savedOrders = await AsyncStorage.getItem(ORDERS_KEY);
      const orders: Order[] = savedOrders ? JSON.parse(savedOrders) : [];
      const existingIndex = orders.findIndex((o) => o.id === order.id);
      if (existingIndex >= 0) {
        orders[existingIndex] = order;
      } else {
        orders.push(order);
      }
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (error) {
      console.error('Lỗi save order:', error);
    }
  };

  const updateItemStatus = async (itemId: string, status: OrderItemStatus) => {
    if (!currentOrder) return;

    const updatedItems = currentOrder.items.map((item) =>
      item.id === itemId ? { ...item, status } : item
    );

    const updatedOrder: Order = {
      ...currentOrder,
      items: updatedItems,
    };

    await saveOrder(updatedOrder);
    setCurrentOrder(updatedOrder);
  };

  const cancelItem = async (itemId: string) => {
    if (!currentOrder) return;

    Alert.alert('Xác nhận hủy', 'Bạn có chắc muốn hủy món này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        style: 'destructive',
        onPress: async () => {
          const updatedItems = currentOrder.items.filter((item) => item.id !== itemId);
          const updatedOrder: Order = {
            ...currentOrder,
            items: updatedItems,
            total: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
          };
          await saveOrder(updatedOrder);
          setCurrentOrder(updatedOrder);
        },
      },
    ]);
  };

  const saveOrderToStorage = async () => {
    if (!currentOrder) {
      Alert.alert('Lỗi', 'Không tìm thấy đơn hàng');
      return;
    }

    try {
      // Đảm bảo đơn hàng được lưu với status đúng
      // Nếu chưa có món, giữ status là CHO_XAC_NHAN
      // Nếu đã có món, giữ nguyên status hiện tại
      const updatedOrder: Order = {
        ...currentOrder,
        status: currentOrder.status || 'CHO_XAC_NHAN',
      };
      
      await saveOrder(updatedOrder);
      setCurrentOrder(updatedOrder);
      Alert.alert('Thành công', 'Đã lưu đơn hàng. Đơn hàng đã được hiển thị trong danh sách đơn hàng.');
    } catch (error) {
      console.error('Lỗi save order:', error);
      Alert.alert('Lỗi', 'Không thể lưu đơn hàng');
    }
  };

  const printBill = () => {
    if (!currentOrder) return;
    Alert.alert('In tạm tính', `Tổng tiền: ${currentOrder.total.toLocaleString('vi-VN')}₫`);
  };

  const closeTable = async () => {
    if (!currentOrder || !table) return;

    Alert.alert('Đóng bàn', `Xác nhận đóng bàn ${table.name}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: async () => {
          try {
            const updatedOrder: Order = {
              ...currentOrder,
              paidAt: Date.now(),
            };
            await saveOrder(updatedOrder);

            const savedTables = await AsyncStorage.getItem(TABLES_KEY);
            if (savedTables) {
              const tables: Table[] = JSON.parse(savedTables);
              const updatedTables = tables.map((t) =>
                t.id === tableId ? { ...t, status: 'TRONG' as const, currentOrderId: undefined } : t
              );
              await AsyncStorage.setItem(TABLES_KEY, JSON.stringify(updatedTables));
            }

            Alert.alert('Thành công', 'Đã đóng bàn');
            router.back();
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể đóng bàn');
          }
        },
      },
    ]);
  };

  if (!tableId || !table) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Vui lòng chọn bàn</Text>
      </View>
    );
  }

  if (!currentOrder) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn hàng - {table.name}</Text>
        <TouchableOpacity
          onPress={() => setMenuModalVisible(true)}
          style={styles.addItemButton}
        >
          <Plus size={20} color="#10b981" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={currentOrder.items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.orderItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.menuItemName}</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item.id, -1)}
                >
                  <Minus size={16} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>x{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item.id, 1)}
                >
                  <Plus size={16} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.itemPrice}>
                {(item.price * item.quantity).toLocaleString('vi-VN')}₫
              </Text>
            </View>

            <View style={styles.itemActions}>
              {item.status === 'DANG_LAM' && (
                <TouchableOpacity
                  style={styles.statusButton}
                  onPress={() => updateItemStatus(item.id, 'DA_PHUC_VU')}
                >
                  <Check size={16} color="#10b981" />
                  <Text style={styles.statusText}>Đã phục vụ</Text>
                </TouchableOpacity>
              )}
              {item.status === 'DA_PHUC_VU' && (
                <View style={[styles.statusBadge, { backgroundColor: '#d1fae5' }]}>
                  <Text style={[styles.statusText, { color: '#10b981' }]}>Đã phục vụ</Text>
                </View>
              )}
              <TouchableOpacity style={styles.cancelButton} onPress={() => cancelItem(item.id)}>
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
          <TouchableOpacity style={styles.sendButton} onPress={saveOrderToStorage}>
            <Text style={styles.sendButtonText}>Lưu đơn</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.printButton} onPress={printBill}>
            <Printer size={20} color="#fff" />
            <Text style={styles.printButtonText}>In tạm tính</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={closeTable}>
            <Text style={styles.closeButtonText}>Đóng bàn</Text>
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
              <Text style={styles.modalTitle}>Chọn món</Text>
              <TouchableOpacity onPress={() => setMenuModalVisible(false)}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Category Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
              {['Tất cả', 'Đồ uống', 'Đồ ăn'].map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.categoryButtonActive
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === category && styles.categoryTextActive
                  ]}>
                    {category}
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
                    addMenuItemToOrder(item.id);
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
                      addMenuItemToOrder(item.id);
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
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
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
  sendButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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

