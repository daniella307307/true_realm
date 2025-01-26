import React, { ReactNode, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import "../global.css";

interface SafeRootProviderProps {
  children: ReactNode;
}

SplashScreen.preventAutoHideAsync().catch(console.warn);

const SafeAreaRootProvider = ({ children }: SafeRootProviderProps) => {
  const [initializing, setInitializing] = useState<boolean>(true);

  const [fontsLoaded] = useFonts({
    // SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const router = useRouter();

  useEffect(() => {
    const initializeApp = async () => {
      if (!fontsLoaded || initializing) return;

      SplashScreen.hideAsync().catch(console.warn);
    };

    router.push("/(user-management)/login");

    initializeApp();
  }, [fontsLoaded, initializing]);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      {children}
    </SafeAreaProvider>
  );
};

export default SafeAreaRootProvider;
