import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import * as NavigationBar from 'expo-navigation-bar';
import { Platform, StatusBar } from "react-native";
import CustomSplashScreen from "../components/CustomSplashScreen";

// Keep the splash screen visible while the app initializes
SplashScreen.preventAutoHideAsync();

type SplashScreenContextValue = {
    onAppReady: () => void;
}

const SplashScreenContext = createContext<SplashScreenContextValue | undefined>(undefined);

export const SplashScreenProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
    const [appIsReady, setAppIsReady] = useState(false);
    const [nativeSplashHidden, setNativeSplashHidden] = useState(false);

    // Handle app ready state transitions
    const onAppReady = async () => {
        try {
            if (Platform.OS === 'android') {
                // Ensure status bar and navigation bar are properly configured
                StatusBar.setBackgroundColor('transparent');
                StatusBar.setTranslucent(true);
                NavigationBar.setBackgroundColorAsync('#ffffff');
            }
            
            console.log("Hiding splash screen");
            // Hide the native splash screen
            await SplashScreen.hideAsync();
            setNativeSplashHidden(true);
        } catch (e) {
            console.warn("Error hiding splash screen:", e);
            setNativeSplashHidden(true); // Still proceed even if there's an error
        }
    };

    // Handle custom splash screen finish
    const onCustomSplashFinish = () => {
        setAppIsReady(true);
    };

    // If the native splash is hidden but we're not fully ready,
    // show our custom splash screen as a bridge
    if (nativeSplashHidden && !appIsReady) {
        return <CustomSplashScreen onFinish={onCustomSplashFinish} />;
    }

    return (
        <SplashScreenContext.Provider value={{ onAppReady }}>
            {appIsReady ? children : null}
        </SplashScreenContext.Provider>
    );
};

/**
 * Hook to signal when your component is ready to hide the splash screen
 */
export function useAppReady() {
    const context = useContext(SplashScreenContext);
    if (!context) {
        throw new Error("useAppReady must be used within a SplashScreenProvider");
    }
    return context.onAppReady;
}