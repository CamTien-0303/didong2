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
import { updateTableAmount } from './tableService';

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
        const orderRef = doc(db, ORDERS_COLLECTION, orderId);

        const updateData = {
            status,
            updatedAt: Timestamp.now()
        };

        if (status === 'preparing') {
            updateData.confirmedAt = Timestamp.now();
        } else if (status === 'served') {
            updateData.servedAt = Timestamp.now();
        } else if (status === 'completed') {
            updateData.paidAt = Timestamp.now();
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

        // Reset table amount
        await updateTableAmount(order.tableId, 0);

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



