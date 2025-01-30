import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ILoginResponse } from '~/types';
type State = {
    user: ILoginResponse | null;
};

type Action = {
    login: (loginDetails: { userAccount: ILoginResponse }) => boolean;
    logout: () => boolean;
    setUser: (user: ILoginResponse) => void;
};

const useMainStore = create(
    persist<State & Action>(
        (set, get) => ({
            user: null,
            login: ({ userAccount }) => {
                set((state) => ({ ...state, user: userAccount }));
                return true;
            },
            logout: () => {
                AsyncStorage.removeItem('tknToken');
                set((state) => ({ ...state, user: null }));
                return true;
            },
            setUser: (user) => set((state) => ({ ...state, user })),

        }),
        {
            name: 'user-storage',
            storage: createJSONStorage(() => AsyncStorage),
        },
    ),
);

export { useMainStore };
