// utils/navigation.ts
import { router, Href } from "expo-router";
import { useRouteProtection } from "~/providers/RouteProtectionProvider";

export function useProtectedNavigation() {
  const { requiresVerification } = useRouteProtection();

  // Navigate with PIN protection if needed
  const navigateTo = (route: string) => {
    if (requiresVerification(route)) {
        console.log("the route", route)
      // Route needs PIN verification
      router.push({
        pathname: "/(page-auth)/pin-auth",
        params: { next: route },
      });
    }
    // else {
    //   // Route doesn't need verification or has been verified
    //   router.push(route as Href);
    // }
  };

  // Back navigation that bypasses PIN auth
  const goBack = () => {
    if (router.canGoBack()) {
      console.log(
        "The back route", router.back
      );
      router.back();
    } else {
      // Fallback to home if can't go back
      router.replace("/(home)/home");
    }
  };

  return {
    navigateTo,
    goBack,
  };
}
