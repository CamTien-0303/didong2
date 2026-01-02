import {
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { closeTable, TABLE_STATUS, updateTableAmount, updateTableStatus } from './tableService';

const ORDERS_COLLECTION = 'orders';

/**
 * Create new order for a table
 */
export const createOrder = async (tableId, tableNumber, guests = 0) => {
    try {
        const orderId = `order-${tableId}-${Date.now()}`;
        const orderRef = doc(db, ORDERS_COLLECTION, orderId);

        await setDoc(orderRef, {
            id: orderId,
            tableId,
            tableNumber,
            guests,
            status: 'pending',
            items: [],
            totalAmount: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        return { success: true, orderId };
    } catch (error) {
        console.error('Error creating order:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get order by table ID
 */
export const getOrderByTable = async (tableId) => {
    try {
        const ordersRef = collection(db, ORDERS_COLLECTION);
        // Simplified query to avoid index issues
        const q = query(
            ordersRef,
            where('tableId', '==', tableId)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { success: true, order: null };
        }

        // Get the most recent order with correct status
        const orders = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));

        const latestOrder = orders
            .filter(o => ['pending', 'preparing', 'served'].includes(o.status))
            .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0];

        return { success: true, order: latestOrder || null };
    } catch (error) {
        console.error('Error getting order by table:', error);
        return { success: false, error: error.message, order: null };
    }
};

/**
 * Get order by ID
 */
export const getOrder = async (orderId) => {
    try {
        const orderRef = doc(db, ORDERS_COLLECTION, orderId);
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
            return {
                success: true,
                order: { ...orderSnap.data(), id: orderSnap.id }
            };
        } else {
            return { success: false, error: 'Order not found', order: null };
        }
    } catch (error) {
        console.error('Error getting order:', error);
        return { success: false, error: error.message, order: null };
    }
};

/**
 * Add item to order
 */
export const addOrderItem = async (orderId, menuItem, quantity = 1, note = '') => {
    try {
        const { order } = await getOrder(orderId);

        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        // Check if item already exists in order
        const existingItemIndex = order.items.findIndex(
            item => item.menuId === menuItem.id
        );

        let updatedItems;
        if (existingItemIndex >= 0) {
            // Update quantity of existing item
            updatedItems = [...order.items];
            updatedItems[existingItemIndex].quantity += quantity;
            updatedItems[existingItemIndex].note = note || updatedItems[existingItemIndex].note;
        } else {
            // Add new item
            updatedItems = [
                ...order.items,
                {
                    menuId: menuItem.id,
                    name: menuItem.name,
                    price: menuItem.price,
                    quantity,
                    note,
                    imageUrl: menuItem.imageUrl
                }
            ];
        }

        // Calculate new total
        const newTotal = updatedItems.reduce(
            (sum, item) => sum + (item.price * item.quantity),
            0
        );

        const orderRef = doc(db, ORDERS_COLLECTION, orderId);
        await updateDoc(orderRef, {
            items: updatedItems,
            totalAmount: newTotal,
            updatedAt: Timestamp.now()
        });

        // Update table amount
        await updateTableAmount(order.tableId, newTotal);

        return { success: true };
    } catch (error) {
        console.error('Error adding order item:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update order item quantity
 */
export const updateOrderItem = async (orderId, menuId, quantity) => {
    try {
        const { order } = await getOrder(orderId);

        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        let updatedItems;
        if (quantity <= 0) {
            // Remove item if quantity is 0 or less
            updatedItems = order.items.filter(item => item.menuId !== menuId);
        } else {
            // Update quantity
            updatedItems = order.items.map(item =>
                item.menuId === menuId
                    ? { ...item, quantity }
                    : item
            );
        }

        // Calculate new total
        const newTotal = updatedItems.reduce(
            (sum, item) => sum + (item.price * item.quantity),
            0
        );

        const orderRef = doc(db, ORDERS_COLLECTION, orderId);
        await updateDoc(orderRef, {
            items: updatedItems,
            totalAmount: newTotal,
            updatedAt: Timestamp.now()
        });

        // Update table amount
        await updateTableAmount(order.tableId, newTotal);

        return { success: true };
    } catch (error) {
        console.error('Error updating order item:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Remove item from order
 */
export const removeOrderItem = async (orderId, menuId) => {
    return updateOrderItem(orderId, menuId, 0);
};

/**
 * Update order status
 */
export const updateOrderStatus = async (orderId, status) => {
    try {
        // Get order to access tableId
        const { order } = await getOrder(orderId);

        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        const orderRef = doc(db, ORDERS_COLLECTION, orderId);

        const updateData = {
            status,
            updatedAt: Timestamp.now()
        };

        if (status === 'preparing') {
            updateData.confirmedAt = Timestamp.now();
            // Update table status to CHO_MON (waiting for food)
            await updateTableStatus(order.tableId, TABLE_STATUS.CHO_MON);
        } else if (status === 'served') {
            updateData.servedAt = Timestamp.now();

            // Check if ALL orders of this table are served
            const { success: getAllSuccess, orders } = await getAllOrdersByTable(order.tableId);

            if (getAllSuccess) {
                // Get all active orders (not cancelled or completed)
                const activeOrders = orders.filter(o =>
                    o.status !== 'cancelled' && o.status !== 'completed'
                );

                // Check if all active orders will be served (including this one)
                const allServed = activeOrders.every(o =>
                    o.id === orderId || o.status === 'served'
                );

                if (allServed) {
                    // All orders served -> table status: DA_PHUC_VU
                    await updateTableStatus(order.tableId, TABLE_STATUS.DA_PHUC_VU);
                } else {
                    // Some orders still pending/preparing -> table status: CHO_MON
                    await updateTableStatus(order.tableId, TABLE_STATUS.CHO_MON);
                }
            }
        } else if (status === 'completed') {
            updateData.paidAt = Timestamp.now();
            // Close table when order is completed
            await closeTable(order.tableId);
        }

        await updateDoc(orderRef, updateData);
        return { success: true };
    } catch (error) {
        console.error('Error updating order status:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Complete order (close table)
 */
export const completeOrder = async (orderId) => {
    try {
        const { order } = await getOrder(orderId);

        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        const orderRef = doc(db, ORDERS_COLLECTION, orderId);
        await updateDoc(orderRef, {
            status: 'completed',
            completedAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        return { success: true };
    } catch (error) {
        console.error('Error completing order:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Cancel order
 */
export const cancelOrder = async (orderId) => {
    try {
        const { order } = await getOrder(orderId);

        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        const orderRef = doc(db, ORDERS_COLLECTION, orderId);
        await updateDoc(orderRef, {
            status: 'cancelled',
            cancelledAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        // Close table when order is cancelled
        await closeTable(order.tableId);

        return { success: true };
    } catch (error) {
        console.error('Error cancelling order:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Subscribe to order (realtime)
 */
export const subscribeToOrder = (orderId, callback) => {
    try {
        const orderRef = doc(db, ORDERS_COLLECTION, orderId);

        const unsubscribe = onSnapshot(orderRef, (doc) => {
            if (doc.exists()) {
                callback({
                    success: true,
                    order: { ...doc.data(), id: doc.id }
                });
            } else {
                callback({ success: false, error: 'Order not found', order: null });
            }
        }, (error) => {
            console.error('Error in order subscription:', error);
            callback({ success: false, error: error.message, order: null });
        });

        return unsubscribe;
    } catch (error) {
        console.error('Error subscribing to order:', error);
        return () => { };
    }
};

/**
 * Subscribe to orders by table (realtime)
 */
export const subscribeToTableOrders = (tableId, callback) => {
    try {
        const ordersRef = collection(db, ORDERS_COLLECTION);
        // Simplified query to avoid index issues
        const q = query(
            ordersRef,
            where('tableId', '==', tableId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const orders = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));

            // Client-side filtering/sorting
            const activeOrder = orders
                .filter(o => ['pending', 'preparing', 'served'].includes(o.status))
                .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis())[0];

            callback({ success: true, order: activeOrder || null });
        }, (error) => {
            console.error('Error in table orders subscription:', error);
            callback({ success: false, error: error.message, order: null });
        });

        return unsubscribe;
    } catch (error) {
        console.error('Error subscribing to table orders:', error);
        return () => { };
    }
};

/**
 * Get all orders
 */
export const getAllOrders = async (status = null) => {
    try {
        const ordersRef = collection(db, ORDERS_COLLECTION);
        let q;

        if (status) {
            q = query(ordersRef, where('status', '==', status), orderBy('createdAt', 'desc'));
        } else {
            q = query(ordersRef, orderBy('createdAt', 'desc'));
        }

        const snapshot = await getDocs(q);
        const orders = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));

        return { success: true, orders };
    } catch (error) {
        console.error('Error getting all orders:', error);
        return { success: false, error: error.message, orders: [] };
    }
};

/**
 * Subscribe to ALL orders (for Kitchen/Manager Dashboard)
 */
export const subscribeToAllOrders = (callback) => {
    try {
        const ordersRef = collection(db, ORDERS_COLLECTION);
        const q = query(ordersRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const orders = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));

            // Sort by createdAt desc (newest first)
            orders.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

            callback({ success: true, orders });
        }, (error) => {
            console.error('Error in all orders subscription:', error);
            callback({ success: false, error: error.message, orders: [] });
        });

        return unsubscribe;
    } catch (error) {
        console.error('Error subscribing to all orders:', error);
        return () => { };
    }
};

/**
 * Get all orders by table ID (including completed orders)
 */
export const getAllOrdersByTable = async (tableId) => {
    try {
        const ordersRef = collection(db, ORDERS_COLLECTION);
        const q = query(ordersRef, where('tableId', '==', tableId));
        const snapshot = await getDocs(q);

        const orders = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));

        return { success: true, orders };
    } catch (error) {
        console.error('Error getting all orders by table:', error);
        return { success: false, error: error.message, orders: [] };
    }
};

/**
 * Get total amount for all orders of a table
 */
export const getTotalAmountByTable = async (tableId) => {
    try {
        const { success, orders } = await getAllOrdersByTable(tableId);

        if (!success) {
            return { success: false, error: 'Cannot get orders', totalAmount: 0 };
        }

        // Sum all order amounts (excluding cancelled orders)
        const totalAmount = orders
            .filter(order => order.status !== 'cancelled')
            .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

        return { success: true, totalAmount };
    } catch (error) {
        console.error('Error getting total amount by table:', error);
        return { success: false, error: error.message, totalAmount: 0 };
    }
};

/**
 * Complete all orders of a table and close the table
 */
export const completeAllTableOrders = async (tableId) => {
    try {
        // Get all active orders for the table
        const { success, orders } = await getAllOrdersByTable(tableId);

        if (!success) {
            return { success: false, error: 'Failed to get orders' };
        }

        // Mark all non-completed/cancelled orders as completed
        const updatePromises = orders
            .filter(order => order.status !== 'completed' && order.status !== 'cancelled')
            .map(order => {
                const orderRef = doc(db, ORDERS_COLLECTION, order.id);
                return updateDoc(orderRef, {
                    status: 'completed',
                    paidAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });
            });

        await Promise.all(updatePromises);

        // Close the table
        await closeTable(tableId);

        return { success: true };
    } catch (error) {
        console.error('Error completing table orders:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get revenue statistics by date range
 */
export const getRevenueByDateRange = async (startDate, endDate) => {
    try {
        const ordersRef = collection(db, ORDERS_COLLECTION);
        // Simplified query - filter by status only, then filter dates in code
        const q = query(
            ordersRef,
            where('status', '==', 'completed')
        );

        const querySnapshot = await getDocs(q);
        const orders = [];
        let totalRevenue = 0;

        const startTime = Timestamp.fromDate(startDate);
        const endTime = Timestamp.fromDate(endDate);

        querySnapshot.forEach((doc) => {
            const order = { id: doc.id, ...doc.data() };

            // Filter by date range in code (no index needed)
            if (order.paidAt &&
                order.paidAt.toMillis() >= startTime.toMillis() &&
                order.paidAt.toMillis() <= endTime.toMillis()) {
                orders.push(order);
                totalRevenue += order.totalAmount || 0;
            }
        });

        // Sort by date (descending)
        orders.sort((a, b) => b.paidAt.toMillis() - a.paidAt.toMillis());

        return {
            success: true,
            orders,
            totalRevenue,
            orderCount: orders.length,
            averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0
        };
    } catch (error) {
        console.error('Error getting revenue by date range:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get revenue statistics for predefined periods
 */
export const getRevenueStats = async (period = 'today') => {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        case 'week':
            const dayOfWeek = now.getDay();
            const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
        case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    }

    return await getRevenueByDateRange(startDate, endDate);
};

/**
 * Get all active orders (not completed or cancelled)
 */
export const getActiveOrders = async () => {
    try {
        const ordersRef = collection(db, ORDERS_COLLECTION);
        // Simple query - get all orders, filter in code to avoid index requirement
        const querySnapshot = await getDocs(ordersRef);
        const orders = [];

        querySnapshot.forEach((doc) => {
            const order = { id: doc.id, ...doc.data() };
            // Filter active orders in code
            if (order.status === 'pending' || order.status === 'preparing' || order.status === 'served') {
                orders.push(order);
            }
        });

        // Sort by creation time (descending)
        orders.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });

        return { success: true, orders };
    } catch (error) {
        console.error('Error getting active orders:', error);
        return { success: false, error: error.message, orders: [] };
    }
};

/**
 * Subscribe to active orders (real-time)
 * Listens to all orders and filters for active ones (pending, preparing, served)
 */
export const subscribeToActiveOrders = (callback) => {
    try {
        const ordersRef = collection(db, ORDERS_COLLECTION);
        const q = query(ordersRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allOrders = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));

            // Filter for active orders only
            const activeOrders = allOrders.filter(order =>
                order.status === 'pending' ||
                order.status === 'preparing' ||
                order.status === 'served'
            );

            // Sort by creation time (descending - newest first)
            activeOrders.sort((a, b) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return timeB - timeA;
            });

            callback({ success: true, orders: activeOrders });
        }, (error) => {
            console.error('Error in active orders subscription:', error);
            callback({ success: false, error: error.message, orders: [] });
        });

        return unsubscribe;
    } catch (error) {
        console.error('Error subscribing to active orders:', error);
        return () => { };
    }
};
