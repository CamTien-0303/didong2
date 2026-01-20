/**
 * PayOS Configuration
 * 
 * Lấy credentials từ https://my.payos.vn:
 * 1. Đăng nhập vào tài khoản PayOS
 * 2. Vào "Kênh thanh toán"
 * 3. Copy Client ID, API Key, và Checksum Key
 */

const PAYOS_CONFIG = {
    // TODO: Thay thế bằng credentials thực từ PayOS
    CLIENT_ID: '20a58392-085e-49b9-8340-a03954d488b4',
    API_KEY: '21173559-13f0-44cc-9611-32cf338e517c',
    CHECKSUM_KEY: 'd29082ee2bbe3d485168c5cf3eebf4ff07bcb9ffe46fe5d00e40ec53bd39a558',

    // API Endpoints
    API_BASE_URL: 'https://api-merchant.payos.vn',

    // Return URLs untuk Expo Go (Development)
    // Format: exp://<tunnel-host>/--/<route>?<params>
    RETURN_URL: 'exp://ighbapo-phthicamtien030325-8081.exp.direct/--/payment-result?status=success',
    CANCEL_URL: 'exp://ighbapo-phthicamtien030325-8081.exp.direct/--/payment-result?status=cancel',

    // Khi build standalone app, đổi thành:
    // RETURN_URL: 'smartorder://payment-result?status=success',
    // CANCEL_URL: 'smartorder://payment-result?status=cancel',
};

export default PAYOS_CONFIG;
