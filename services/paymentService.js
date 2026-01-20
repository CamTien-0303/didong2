import CryptoJS from 'crypto-js';
import { Timestamp, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import PAYOS_CONFIG from '../config/payos.config';
import { db } from './firebaseConfig';

const ORDERS_COLLECTION = 'orders';
const PAYMENTS_COLLECTION = 'payments';

/**
 * Generate HMAC SHA256 signature for PayOS API
 * Format: amount=$amount&cancelUrl=$cancelUrl&description=$description&orderCode=$orderCode&returnUrl=$returnUrl
 */
const generateSignature = (data) => {
    try {
        const { amount, cancelUrl, description, orderCode, returnUrl } = data;

        // Sort parameters alphabetically as required by PayOS
        const sortedData = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;

        console.log('Signature data:', sortedData);
        console.log('Using checksum key:', PAYOS_CONFIG.CHECKSUM_KEY);

        // Generate HMAC SHA256 signature using crypto-js
        const signature = CryptoJS.HmacSHA256(sortedData, PAYOS_CONFIG.CHECKSUM_KEY).toString(CryptoJS.enc.Hex);

        console.log('Generated signature:', signature);

        return signature;
    } catch (error) {
        console.error('Error generating signature:', error);
        throw error;
    }
};

/**
 * Create payment link using PayOS API
 * @param {Object} order - Order object from Firebase
 * @returns {Object} - Payment link data including QR code and checkout URL
 */
export const createPaymentLink = async (order) => {
    try {
        if (!order || !order.id || !order.totalAmount) {
            throw new Error('Invalid order data');
        }

        // Validate PayOS config
        if (
            !PAYOS_CONFIG.CLIENT_ID ||
            !PAYOS_CONFIG.API_KEY ||
            !PAYOS_CONFIG.CHECKSUM_KEY ||
            PAYOS_CONFIG.CLIENT_ID === 'YOUR_CLIENT_ID_HERE'
        ) {
            throw new Error(
                'PayOS credentials chưa được cấu hình. Vui lòng cập nhật file config/payos.config.js'
            );
        }

        // Generate unique order code (must be integer)
        const orderCode = parseInt(Date.now().toString().slice(-9));

        // Prepare payment data
        const paymentData = {
            orderCode,
            amount: Math.round(order.totalAmount), // Must be integer
            description: `Thanh toan ban ${order.tableNumber}`,
            cancelUrl: PAYOS_CONFIG.CANCEL_URL,
            returnUrl: PAYOS_CONFIG.RETURN_URL,
        };

        // Add items if available
        if (order.items && order.items.length > 0) {
            paymentData.items = order.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: Math.round(item.price),
            }));
        }

        // Generate signature
        const signature = generateSignature(paymentData);
        paymentData.signature = signature;

        console.log('Creating payment link with data:', {
            orderCode,
            amount: paymentData.amount,
            description: paymentData.description,
        });

        // Call PayOS API
        const response = await fetch(
            `${PAYOS_CONFIG.API_BASE_URL}/v2/payment-requests`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-id': PAYOS_CONFIG.CLIENT_ID,
                    'x-api-key': PAYOS_CONFIG.API_KEY,
                },
                body: JSON.stringify(paymentData),
            }
        );

        const result = await response.json();

        if (!response.ok || result.code !== '00') {
            console.error('PayOS API Error:', result);
            throw new Error(result.desc || 'Failed to create payment link');
        }

        console.log('Payment link created successfully:', result.data.paymentLinkId);

        // Save payment info to Firebase
        const paymentRef = doc(db, PAYMENTS_COLLECTION, order.id);
        await updateDoc(paymentRef, {
            orderId: order.id,
            paymentLinkId: result.data.paymentLinkId,
            orderCode: result.data.orderCode,
            amount: result.data.amount,
            status: 'PENDING',
            checkoutUrl: result.data.checkoutUrl,
            qrCode: result.data.qrCode,
            createdAt: Timestamp.now(),
        }).catch(async (error) => {
            // If document doesn't exist, create it
            if (error.code === 'not-found') {
                const { setDoc } = await import('firebase/firestore');
                await setDoc(paymentRef, {
                    orderId: order.id,
                    paymentLinkId: result.data.paymentLinkId,
                    orderCode: result.data.orderCode,
                    amount: result.data.amount,
                    status: 'PENDING',
                    checkoutUrl: result.data.checkoutUrl,
                    qrCode: result.data.qrCode,
                    createdAt: Timestamp.now(),
                });
            } else {
                throw error;
            }
        });

        // Update order with payment info (only if order has an actual order ID, not table ID)
        // Skip this if order.id is a table ID (e.g., "tang1-4")
        if (order.orderId || (order.id && !order.id.includes('-'))) {
            try {
                const actualOrderId = order.orderId || order.id;
                const orderRef = doc(db, ORDERS_COLLECTION, actualOrderId);
                await updateDoc(orderRef, {
                    paymentStatus: 'pending',
                    paymentLinkId: result.data.paymentLinkId,
                    paymentMethod: 'payos',
                    updatedAt: Timestamp.now(),
                });
            } catch (orderUpdateError) {
                console.warn('Could not update order document:', orderUpdateError.message);
                // Continue anyway - payment link was created successfully
            }
        }

        return {
            success: true,
            data: {
                paymentLinkId: result.data.paymentLinkId,
                checkoutUrl: result.data.checkoutUrl,
                qrCode: result.data.qrCode,
                amount: result.data.amount,
                orderCode: result.data.orderCode,
            },
        };
    } catch (error) {
        console.error('Error creating payment link:', error);
        return {
            success: false,
            error: error.message || 'Không thể tạo link thanh toán',
        };
    }
};

/**
 * Get payment status from PayOS API
 * @param {number} orderCode - Order code from PayOS
 */
export const getPaymentStatus = async (orderCode) => {
    try {
        const response = await fetch(
            `${PAYOS_CONFIG.API_BASE_URL}/v2/payment-requests/${orderCode}`,
            {
                method: 'GET',
                headers: {
                    'x-client-id': PAYOS_CONFIG.CLIENT_ID,
                    'x-api-key': PAYOS_CONFIG.API_KEY,
                },
            }
        );

        const result = await response.json();

        if (!response.ok || result.code !== '00') {
            throw new Error(result.desc || 'Failed to get payment status');
        }

        return {
            success: true,
            status: result.data.status,
            data: result.data,
        };
    } catch (error) {
        console.error('Error getting payment status:', error);
        return {
            success: false,
            error: error.message,
        };
    }
};

/**
 * Subscribe to payment status changes from Firebase
 * (Will be updated by webhook or manual check)
 */
export const subscribeToPaymentStatus = (orderId, callback) => {
    try {
        const paymentRef = doc(db, PAYMENTS_COLLECTION, orderId);

        const unsubscribe = onSnapshot(
            paymentRef,
            (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    callback({
                        success: true,
                        status: data.status,
                        payment: { ...data, id: doc.id },
                    });
                } else {
                    callback({
                        success: false,
                        error: 'Payment not found',
                    });
                }
            },
            (error) => {
                console.error('Error in payment subscription:', error);
                callback({
                    success: false,
                    error: error.message,
                });
            }
        );

        return unsubscribe;
    } catch (error) {
        console.error('Error subscribing to payment:', error);
        return () => { };
    }
};

/**
 * Cancel payment link
 * @param {number} orderCode - Order code from PayOS
 */
export const cancelPaymentLink = async (orderCode, cancellationReason = null) => {
    try {
        const response = await fetch(
            `${PAYOS_CONFIG.API_BASE_URL}/v2/payment-requests/${orderCode}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-id': PAYOS_CONFIG.CLIENT_ID,
                    'x-api-key': PAYOS_CONFIG.API_KEY,
                },
                body: JSON.stringify({
                    cancellationReason,
                }),
            }
        );

        const result = await response.json();

        if (!response.ok || result.code !== '00') {
            throw new Error(result.desc || 'Failed to cancel payment link');
        }

        return {
            success: true,
            data: result.data,
        };
    } catch (error) {
        console.error('Error canceling payment link:', error);
        return {
            success: false,
            error: error.message,
        };
    }
};

/**
 * Update payment status in Firebase (called manually or by polling)
 */
export const updatePaymentStatus = async (orderId, orderCode) => {
    try {
        const { success, status, data } = await getPaymentStatus(orderCode);

        if (!success) {
            return { success: false, error: 'Failed to get payment status' };
        }

        // Update Firebase
        const paymentRef = doc(db, PAYMENTS_COLLECTION, orderId);
        await updateDoc(paymentRef, {
            status: status,
            updatedAt: Timestamp.now(),
            ...(status === 'PAID' && { paidAt: Timestamp.now() }),
        });

        // Update order status if paid
        if (status === 'PAID') {
            const orderRef = doc(db, ORDERS_COLLECTION, orderId);
            await updateDoc(orderRef, {
                paymentStatus: 'paid',
                status: 'completed',
                paidAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        }

        return {
            success: true,
            status,
        };
    } catch (error) {
        console.error('Error updating payment status:', error);
        return {
            success: false,
            error: error.message,
        };
    }
};
