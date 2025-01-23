import "~/global.css";

import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { GestureResponderEvent, Platform, TouchableOpacity, View } from "react-native";
import { NAV_THEME } from "~/lib/constants";
import { useColorScheme } from "~/lib/useColorScheme";
import { PortalHost } from "@rn-primitives/portal";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import "~/utils/i18n";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import Animated, { 
  FadeInUp, 
  FadeOutDown, 
  LayoutAnimationConfig 
} from 'react-native-reanimated';
import { Progress } from "~/components/ui/progress";


const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const TextSizeContext = React.createContext({
  textScale: 1,
  setTextScale: (scale: number) => {},
});

export default function RootLayout() {
  const hasMounted = React.useRef(false);
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);
  const [textScale, setTextScale] = React.useState(1);

  const CustomProgressSlider = () => {
    const MIN = 0.5;
    const MAX = 2;
    const STEP = 0.1;

    const scaleToPercentage = (scale: number) => {
      return ((scale - MIN) / (MAX - MIN)) * 100;
    };

    const percentageToScale = (percentage: number) => {
      return MIN + (percentage / 100) * (MAX - MIN);
    };

    const handleProgressTouch = (event: any) => {
      const { locationX } = event.nativeEvent;
      console.log('The locationX: ', locationX);
      event.currentTarget.measure((_x: any, _y: any, width: number) => {
        const touchPercentage = (locationX / width) * 100;
        const newScale = percentageToScale(touchPercentage);
        setTextScale(Math.min(Math.max(newScale, MIN), MAX));
      });
    };

    return (
      <View className="space-y-2">
        <View className="flex-row items-center space-x-2">
          <Text className="text-sm text-muted-foreground">Text Size:</Text>
          <LayoutAnimationConfig skipEntering>
            <Animated.View
              key={textScale}
              entering={FadeInUp}
              exiting={FadeOutDown}
              className="w-11 items-center"
            >
              <Text className="text-sm font-bold text-sky-600">
                {textScale.toFixed(2)}x
              </Text>
            </Animated.View>
          </LayoutAnimationConfig>
        </View>
        <TouchableOpacity onPress={handleProgressTouch} className="w-full">
          <Progress
            value={scaleToPercentage(textScale)}
            className="h-2"
            indicatorClassName="bg-sky-600"
          />
        </TouchableOpacity>
      </View>
    );
  };

  useIsomorphicLayoutEffect(() => {
    if (hasMounted.current) {
      return;
    }

    if (Platform.OS === "web") {
      document.documentElement.classList.add("bg-background");
    }
    setAndroidNavigationBar(colorScheme);
    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
  }, []);

  if (!isColorSchemeLoaded) {
    return null;
  }

  return (
    <TextSizeContext.Provider value={{ textScale, setTextScale }}>
      <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
        <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
        <Stack>
          <Stack.Screen
            name="index"
            options={{
              title: "Starter Base",
              headerRight: () => (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Text>Aa</Text>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Adjust Text Size</AlertDialogTitle>
                    </AlertDialogHeader>
                    <CustomProgressSlider />
                  </AlertDialogContent>
                </AlertDialog>
              ),
            }}
          />
        </Stack>
        <PortalHost />
      </ThemeProvider>
    </TextSizeContext.Provider>
  );
}

const useIsomorphicLayoutEffect =
  Platform.OS === "web" && typeof window === "undefined"
    ? React.useEffect
    : React.useLayoutEffect;

export const useTextSize = () => {
  const context = React.useContext(TextSizeContext);
  if (!context) {
    throw new Error(
      "useTextSize must be used within a TextSizeContext.Provider"
    );
  }
  return context;
};
