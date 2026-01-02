// Google OAuth Configuration
// IMPORTANT: You need to get these from Google Cloud Console
// https://console.cloud.google.com/

export const GOOGLE_OAUTH_CONFIG = {
    // Web Client ID from Firebase Console
    // Go to: Firebase Console -> Authentication -> Sign-in method -> Google -> Web SDK configuration
    webClientId: "130691733256-cj1cskb0ttrf54icrht2qi0tqt3a8njt.apps.googleusercontent.com",

    // iOS Client ID (optional, only if you deploy to iOS)
    iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",

    // Android Client ID - using web client ID for now
    androidClientId: "130691733256-cj1cskb0ttrf54icrht2qi0tqt3a8njt.apps.googleusercontent.com",

    // Force redirect URL for Expo
    redirectUrl: "https://auth.expo.io/@phthicamtien030325/smart-order",
};

// Facebook OAuth Configuration  
// IMPORTANT: You need to get these from Facebook Developers
// https://developers.facebook.com/

export const FACEBOOK_OAUTH_CONFIG = {
    // Facebook App ID
    appId: "1498562521460374",
};
