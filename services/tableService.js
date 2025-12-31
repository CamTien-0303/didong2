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

const TABLES_COLLECTION = 'tables';

// Table type
export const TABLE_STATUS = {
    TRONG: 'TRONG',
    CO_KHACH: 'CO_KHACH',
    CHO_MON: 'CHO_MON'
};

/**
 * Initialize default tables in Firestore
 * Chỉ gọi 1 lần khi setup restaurant
 */
export const initializeTables = async () => {
    try {
        const areas = [
            { id: 'tang1', name: 'Tầng 1', totalTables: 12 },
            { id: 'tang2', name: 'Tầng 2', totalTables: 8 },
            { id: 'sanvuon', name: 'Sân vườn', totalTables: 6 },
            { id: 'vip', name: 'VIP', totalTables: 4 },
        ];

        let tableNumber = 1;

        for (const area of areas) {
            for (let i = 1; i <= area.totalTables; i++) {
                const tableId = `${area.id}-${i}`;
                const tableRef = doc(db, TABLES_COLLECTION, tableId);

                const tableSnap = await getDoc(tableRef);

                if (!tableSnap.exists()) {
                    await setDoc(tableRef, {
                        id: tableId,
                        number: tableNumber,
                        area: area.id,
                        areaName: area.name,
                        status: TABLE_STATUS.TRONG,
                        capacity: [4, 6, 2, 8, 10][i % 5] || 4,
                        guests: 0,
                        duration: 0,
                        totalAmount: 0,
                        startTime: null,
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now()
                    });
                }

                tableNumber++;
            }
        }

        console.log('✅ Tables initialized successfully');
        return { success: true };
    } catch (error) {
        console.error('Error initializing tables:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get all tables
 */
export const getAllTables = async () => {
    try {
        const tablesRef = collection(db, TABLES_COLLECTION);
        const snapshot = await getDocs(tablesRef);

        const tables = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));

        return { success: true, tables };
    } catch (error) {
        console.error('Error getting tables:', error);
        return { success: false, error: error.message, tables: [] };
    }
};

/**
 * Get tables by area
 */
export const getTablesByArea = async (areaId) => {
    try {
        const tablesRef = collection(db, TABLES_COLLECTION);
        const q = query(tablesRef, where('area', '==', areaId), orderBy('number'));
        const snapshot = await getDocs(q);

        const tables = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));

        return { success: true, tables };
    } catch (error) {
        console.error('Error getting tables by area:', error);
        return { success: false, error: error.message, tables: [] };
    }
};

/**
 * Get single table
 */
export const getTable = async (tableId) => {
    try {
        const tableRef = doc(db, TABLES_COLLECTION, tableId);
        const tableSnap = await getDoc(tableRef);

        if (tableSnap.exists()) {
            return {
                success: true,
                table: { ...tableSnap.data(), id: tableSnap.id }
            };
        } else {
            return { success: false, error: 'Table not found' };
        }
    } catch (error) {
        console.error('Error getting table:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update table status
 */
export const updateTableStatus = async (tableId, status, additionalData = {}) => {
    try {
        const tableRef = doc(db, TABLES_COLLECTION, tableId);

        await updateDoc(tableRef, {
            status,
            ...additionalData,
            updatedAt: Timestamp.now()
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating table status:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Open table (set status to CO_KHACH)
 */
export const openTable = async (tableId, guests) => {
    try {
        const tableRef = doc(db, TABLES_COLLECTION, tableId);

        await updateDoc(tableRef, {
            status: TABLE_STATUS.CO_KHACH,
            guests: guests || 0,
            startTime: Timestamp.now(),
            duration: 0,
            totalAmount: 0,
            updatedAt: Timestamp.now()
        });

        return { success: true };
    } catch (error) {
        console.error('Error opening table:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Close table (set status to TRONG)
 */
export const closeTable = async (tableId) => {
    try {
        const tableRef = doc(db, TABLES_COLLECTION, tableId);

        await updateDoc(tableRef, {
            status: TABLE_STATUS.TRONG,
            guests: 0,
            startTime: null,
            duration: 0,
            totalAmount: 0,
            updatedAt: Timestamp.now()
        });

        return { success: true };
    } catch (error) {
        console.error('Error closing table:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update table amount
 */
export const updateTableAmount = async (tableId, amount) => {
    try {
        const tableRef = doc(db, TABLES_COLLECTION, tableId);

        await updateDoc(tableRef, {
            totalAmount: amount,
            updatedAt: Timestamp.now()
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating table amount:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Subscribe to all tables (realtime)
 */
export const subscribeToTables = (callback) => {
    try {
        const tablesRef = collection(db, TABLES_COLLECTION);
        const q = query(tablesRef, orderBy('number'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tables = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));

            callback({ success: true, tables });
        }, (error) => {
            console.error('Error in tables subscription:', error);
            callback({ success: false, error: error.message, tables: [] });
        });

        return unsubscribe;
    } catch (error) {
        console.error('Error subscribing to tables:', error);
        return () => { }; // Return empty unsubscribe function
    }
};

/**
 * Subscribe to tables by area (realtime)
 */
export const subscribeToTablesByArea = (areaId, callback) => {
    try {
        const tablesRef = collection(db, TABLES_COLLECTION);
        const q = query(
            tablesRef,
            where('area', '==', areaId),
            orderBy('number')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tables = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));

            callback({ success: true, tables });
        }, (error) => {
            console.error('Error in area tables subscription:', error);
            callback({ success: false, error: error.message, tables: [] });
        });

        return unsubscribe;
    } catch (error) {
        console.error('Error subscribing to area tables:', error);
        return () => { };
    }
};

/**
 * Get table statistics
 */
export const getTableStats = async () => {
    try {
        const { success, tables } = await getAllTables();

        if (!success) {
            return { success: false, error: 'Failed to get tables' };
        }

        const stats = {
            total: tables.length,
            trong: tables.filter(t => t.status === TABLE_STATUS.TRONG).length,
            coKhach: tables.filter(t => t.status === TABLE_STATUS.CO_KHACH).length,
            choMon: tables.filter(t => t.status === TABLE_STATUS.CHO_MON).length,
            totalRevenue: tables.reduce((sum, t) => sum + (t.totalAmount || 0), 0)
        };

        return { success: true, stats };
    } catch (error) {
        console.error('Error getting table stats:', error);
        return { success: false, error: error.message };
    }
};
