import "~/global.css";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { useColorScheme } from "~/lib/useColorScheme";
import { PortalHost } from "@rn-primitives/portal";
import RootProvider from "~/providers";

export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  const hasMounted = React.useRef(false);
  console.log("The hasMounted: ", hasMounted);
  const { colorScheme, isDarkColorScheme } = useColorScheme();

  return (
    <RootProvider>
      <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
      <Slot />
      <PortalHost />
    </RootProvider>
  );
}
