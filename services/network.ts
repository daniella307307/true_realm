import NetInfo from "@react-native-community/netinfo";
import { create } from "zustand";
import { useEffect } from "react";
import { baseInstance } from "~/utils/axios";
import { useQuery as useReactQuery } from "@tanstack/react-query";
interface NetworkState {
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  lastOnlineTimestamp: number | null;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isConnected: false,
  setIsConnected: (connected) =>
    set((state) => ({
      isConnected: connected,
      lastOnlineTimestamp: connected ? Date.now() : state.lastOnlineTimestamp,
    })),
  lastOnlineTimestamp: null,
}));

export const initializeNetworkListener = async () => {
  // Get initial network state immediately
  const initialState = await NetInfo.fetch();
  useNetworkStore.getState().setIsConnected(!!initialState.isConnected);

  // Subscribe to network state updates
  const unsubscribe = NetInfo.addEventListener((state) => {
    const previousState = useNetworkStore.getState().isConnected;
    const currentState = !!state.isConnected;

    if (previousState !== currentState) {
      console.log(
        `Network status changed: ${previousState ? "Online" : "Offline"} → ${
          currentState ? "Online" : "Offline"
        }`
      );
    }

    useNetworkStore.getState().setIsConnected(currentState);
  });

  return unsubscribe;
};

export const isOnline = () => {
  const isConnected = useNetworkStore.getState().isConnected;
  return isConnected;
};

// Custom hook to use in components that need to monitor network status
export const useNetworkStatus = () => {
  const { isConnected, lastOnlineTimestamp } = useNetworkStore();

  // console.log('isConnected: ', isConnected);
  useEffect(() => {
    if (isConnected) {
      console.log("Device is now online - triggering data refresh");
    } else {
      console.log("Device is now offline - switching to local data");
    }
  }, [isConnected]);

  return {
    isConnected,
    lastOnlineTimestamp,
    isOnline,
  };
};

const fetchDeviceInfo = async () => {
  const res = await baseInstance.get<{
    message: string;
    device_id: string;
  }>("/device-info");
  return res.data;
};

export const useGetDeviceInfo = (forceSync: boolean = false) => {
  const { data, isLoading, error } = useReactQuery({
    queryKey: ["device-info"],
    queryFn: fetchDeviceInfo,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // only refetch if forceSync is true
    refetchInterval: forceSync ? false : 5 * 60 * 1000,
  });

  return { data, isLoading, error };
};
