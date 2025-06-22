export const API_URL = "http://10.0.0.78:8000";

interface ExpoConfig {
  name: string;
  slug: string;
  version: string;
  orientation: string;
  icon: string;
  userInterfaceStyle: string;
  splash: {
    image: string;
    resizeMode: string;
    backgroundColor: string;
  };
  assetBundlePatterns: string[];
  ios: {
    supportsTablet: boolean;
  };
  android: {
    adaptiveIcon: {
      foregroundImage: string;
      backgroundColor: string;
    };
  
  };
  web: {
    favicon: string;
  };
  extra: {
    apiUrl: string;
    eas: {

      
      projectId: string;
    };
  };
}

const config: { expo: ExpoConfig } = {
  expo: {
    name: "Freebies",
    slug: "freebies",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: {
      apiUrl: API_URL,
      eas: {
        projectId: "your-project-id",
      },
    },
  },
};

export default config;
