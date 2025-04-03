import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';
import { useEffect } from 'react';

interface NetworkState {
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  lastOnlineTimestamp: number | null;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isConnected: false,
  setIsConnected: (connected) => set((state) => ({
    isConnected: connected,
    lastOnlineTimestamp: connected ? Date.now() : state.lastOnlineTimestamp
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
      console.log(`Network status changed: ${previousState ? 'Online' : 'Offline'} → ${currentState ? 'Online' : 'Offline'}`);
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
  
  useEffect(() => {
    // This effect runs whenever the connection status changes
    if (isConnected) {
      console.log('Device is now online - triggering data refresh');
      // You could trigger global refresh actions here
    } else {
      console.log('Device is now offline - switching to local data');
    }
  }, [isConnected]);
  
  return { 
    isConnected,
    lastOnlineTimestamp,
    isOnline // For backward compatibility
  };
};