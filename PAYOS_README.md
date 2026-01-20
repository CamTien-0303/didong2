# PayOS Payment Integration - Hướng dẫn Setup

## Tổng quan

Ứng dụng đã được tích hợp PayOS để cho phép khách hàng thanh toán hóa đơn bàn ăn bằng cách quét mã QR.

## Yêu cầu

- Tài khoản PayOS (đăng ký tại [https://my.payos.vn](https://my.payos.vn))
- React Native project với Firebase đã setup
- Expo SDK ~54

## Bước 1: Lấy PayOS Credentials

1. Đăng nhập vào [https://my.payos.vn](https://my.payos.vn)
2. Hoàn tất xác thực doanh nghiệp/cá nhân (nếu chưa)
3. Tạo "Kênh thanh toán" mới
4. Sao chép các thông tin sau:
   - **Client ID**
   - **API Key**  
   - **Checksum Key**

## Bước 2: Cấu hình Credentials

Mở file `config/payos.config.js` và thay thế các giá trị placeholder:

```javascript
const PAYOS_CONFIG = {
  CLIENT_ID: 'your_actual_client_id',
  API_KEY: 'your_actual_api_key',
  CHECKSUM_KEY: 'your_actual_checksum_key',
  
  // Các giá trị khác giữ nguyên nếu dùng default
};
```

> **⚠️ LƯU Ý**: KHÔNG commit file này lên Git với credentials thật. Thêm vào `.gitignore` nếu chưa có.

## Bước 3: Test Payment Flow

### Test với Sandbox (khuyến nghị)

PayOS cung cấp môi trường sandbox để test. Xem hướng dẫn tại [PayOS Docs](https://payos.vn/docs/).

### Test với Production

1. **Tạo Order**:
   - Mở app và tạo order mới cho một bàn
   - Mark order status = "served" (đã xong)

2. **Thanh Toán**:
   - Nhấn nút "Thanh toán QR" màu tím
   - QR code sẽ hiển thị trong modal
   - Sử dụng app ngân hàng (VietinBank, Vietcombank, etc.) để quét mã

3. **Xác nhận**:
   - Xác nhận thanh toán trong app ngân hàng
   - App sẽ tự động cập nhật trạng thái thành "Hoàn tất"
   - Order và table status được cập nhật trong Firebase

## Cấu trúc Files

```
/config
  └── payos.config.js          # PayOS credentials

/services
  └── paymentService.js        # Service gọi PayOS API
  └── orderService.js          # Đã cập nhật để hỗ trợ payment status
  
/components
  └── PaymentQRModal.tsx       # Modal hiển thị QR code

/app/(tabs)
  └── orderform.tsx            # Đã thêm payment button
```

## API Flow

1. **Tạo Payment Link**:
   ```
   App → paymentService.createPaymentLink()
       → POST https://api-merchant.payos.vn/v2/payment-requests
       → Response: { checkoutUrl, qrCode, paymentLinkId }
   ```

2. **Payment Status Update**:
   ```
   Khách hàng quét QR → Thanh toán trong app ngân hàng
   → PayOS webhook (cần setup) → Firebase update
   → App realtime listener → UI update
   ```

## Webhook Setup (Tùy chọn)

Để nhận realtime payment updates, bạn cần:

1. Setup webhook endpoint (có thể dùng Firebase Cloud Functions)
2. Cấu hình webhook URL tại [https://my.payos.vn](https://my.payos.vn)
3. Webhook sẽ nhận POST request khi thanh toán thành công

**Hiện tại**: App sử dụng Firebase realtime listeners để cập nhật status. Webhook sẽ cập nhật Firebase, app sẽ auto-sync.

## Troubleshooting

### Lỗi "PayOS credentials chưa được cấu hình"

- Kiểm tra file `config/payos.config.js`
- Đảm bảo đã thay thế `YOUR_CLIENT_ID_HERE` v.v.

### QR Code không hiển thị

- Kiểm tra network connection
- Xem console logs để debug API response
- Verify PayOS credentials đúng

### Thanh toán thành công nhưng app không update

- Kiểm tra Firebase Firestore rules (phải cho phép write vào collection `payments`)
- Xem Firebase console để verify data được ghi
- Check Firebase realtime listener có hoạt động không

### Lỗi signature invalid

- Verify Checksum Key chính xác
- Đảm bảo không có khoảng trắng thừa trong credentials

## Links hữu ích

- [PayOS Documentation](https://payos.vn/docs/)
- [PayOS Dashboard](https://my.payos.vn)
- [PayOS API Reference](https://payos.vn/docs/api/)
- [VietQR Supported Banks](https://vietqr.io)

## Lưu ý bảo mật

- ✅ API được gọi trực tiếp từ mobile app (hợp lý cho đơn giản)
- ✅ Signature được generate để verify data integrity
- ⚠️ Nên implement rate limiting để tránh abuse
- ⚠️ Nên log transactions để audit

## Support

Nếu cần hỗ trợ:
1. Kiểm tra PayOS documentation
2. Contact PayOS support team
3. Check Firebase console logs
