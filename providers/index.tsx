import { PropsWithChildren } from "react";
import SafeAreaRootProvider from "./SafeAreaProvider";
import QueryProvider from "./QueryProvider";
import Toast from "react-native-toast-message";
import toastConfig from "./toastConfig";
import { RecoilRoot } from "recoil";
import "~/utils/i18n";

const RootProvider = ({ children }: PropsWithChildren) => {
  return (
    <RecoilRoot>
      <SafeAreaRootProvider>
        <QueryProvider>{children}</QueryProvider>
        <Toast config={toastConfig} />
      </SafeAreaRootProvider>
    </RecoilRoot>
  );
};

export default RootProvider;