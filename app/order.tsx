import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Alert,
  ScrollView,
} from 'react-native';
import { Check, X, Printer, Trash2, Plus, Minus } from 'lucide-react-native';
import { Order, OrderItem, OrderItemStatus, Table, MenuItem } from '@/types/order';

const ORDERS_KEY = 'orders';
const TABLES_KEY = 'tables';
const MENU_KEY = 'menu-items';

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tableId = params.tableId as string;
  const addItemId = params.addItem as string;

  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

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
      // Load table
      const savedTables = await AsyncStorage.getItem(TABLES_KEY);
      if (savedTables) {
        const tables: Table[] = JSON.parse(savedTables);
        const foundTable = tables.find((t) => t.id === tableId);
        setTable(foundTable || null);
      }

      // Load menu
      const savedMenu = await AsyncStorage.getItem(MENU_KEY);
      if (savedMenu) {
        setMenuItems(JSON.parse(savedMenu));
      }

      // Load or create order
      const savedOrders = await AsyncStorage.getItem(ORDERS_KEY);
      if (savedOrders) {
        const orders: Order[] = JSON.parse(savedOrders);
        const foundOrder = orders.find((o) => o.tableId === tableId && !o.paidAt);
        if (foundOrder) {
          setCurrentOrder(foundOrder);
        } else {
          // Tạo order mới
          const newOrder: Order = {
            id: `order-${Date.now()}`,
            tableId: tableId,
            tableName: table?.name || `Bàn ${tableId}`,
            items: [],
            total: 0,
            createdAt: Date.now(),
          };
          setCurrentOrder(newOrder);
        }
      } else {
        // Tạo order mới
        const newOrder: Order = {
          id: `order-${Date.now()}`,
          tableId: tableId,
          tableName: table?.name || `Bàn ${tableId}`,
          items: [],
          total: 0,
          createdAt: Date.now(),
        };
        setCurrentOrder(newOrder);
      }
    } catch (error) {
      console.error('Lỗi load data:', error);
    }
  };

  const addMenuItemToOrder = async (menuItemId: string) => {
    if (!currentOrder) return;

    const menuItem = menuItems.find((m) => m.id === menuItemId);
    if (!menuItem) return;

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

  const sendToKitchen = async () => {
    if (!currentOrder) return;
    Alert.alert('Thành công', 'Đã gửi món xuống bếp');
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
        <View style={{ width: 24 }} />
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
          <TouchableOpacity style={styles.sendButton} onPress={sendToKitchen}>
            <Text style={styles.sendButtonText}>Gửi xuống bếp</Text>
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
});

