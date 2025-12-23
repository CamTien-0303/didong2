import { Redirect } from 'expo-router';

export default function RootIndex() {
  // Luôn chuyển hướng đến trang login khi mở app
  return <Redirect href="/login" />;
}
