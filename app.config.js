import "dotenv/config";

// --- ערכי ברירת מחדל לפיתוח (Development Fallbacks) ---
// הערכים האלו ייכנסו לפעולה כשאתה מריץ את האפליקציה מקומית (npx expo start)
// ואין לך קובץ .env מוגדר, או כשהמשתנים חסרים.
const DEV_CONFIG = {
  appName: "Torimal Dev",
  slug: "torimal-dev",
  scheme: "torimal",
  bundleId: "com.torimal.test", // גם לאנדרואיד וגם ל-iOS
  businessId: "6950909b49d14568c2d8da78",
  googleServicesFile: "./google-services.json", // קובץ ברירת מחדל
};

export default {
  expo: {
    // 1. הגדרות דינמיות (משתנות לפי הלקוח)
    name: process.env.APP_NAME || DEV_CONFIG.appName,
    slug: process.env.APP_SLUG || DEV_CONFIG.slug,
    scheme: process.env.APP_SCHEME || DEV_CONFIG.scheme,
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png", // ב-White Label מתקדם, אפשר להחליף גם אייקון דינמית
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    // 2. משתנים שיהיו זמינים בקוד (Runtime) דרך Constants.expoConfig.extra
    extra: {
      eas: {
        projectId: "fdc5244d-b3e3-4b32-8457-290e9d9e0a69",
      },
      // ה-ID של העסק הספציפי לאפליקציה הזו
      BUSINESS_ID: process.env.BUSINESS_ID || DEV_CONFIG.businessId,
      API_URL: process.env.API_URL,

      // הגדרות Firebase
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
    },

    ios: {
      supportsTablet: true,
      // Bundle ID דינמי
      bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER || DEV_CONFIG.bundleId,
    },

    android: {
      // Package Name דינמי
      package: process.env.ANDROID_PACKAGE || DEV_CONFIG.bundleId,

      // ב-White Label ייתכן שלכל עסק יש קובץ google-services שונה
      googleServicesFile: process.env.GOOGLE_SERVICES_FILE || DEV_CONFIG.googleServicesFile,

      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,

      manifest: {
        extraAttributes: {
          // ביטול RTL (יישור לימין) אוטומטי של אנדרואיד כדי למנוע שבירת עיצוב
          "android:supportsRtl": "false",
        },
      },
    },

    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",
      "expo-localization",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      "expo-secure-store",
      "expo-font",
      "expo-notifications",
      "expo-web-browser",
    ],

    experiments: {
      typedRoutes: true,
    },
  },
};