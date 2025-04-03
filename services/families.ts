import { useCallback, useEffect, useState } from "react";
import { Realm } from "@realm/react";
import { IFamilies } from "~/types";
import { baseInstance } from "~/utils/axios";
import { Families } from "~/models/family/families";
import { useNetworkStore } from "~/services/network";
import { RealmContext } from "~/providers/RealContextProvider";
const { useRealm, useQuery } = RealmContext;

export async function fetchFamiliesFromRemote() {
    const res = await baseInstance.get<{ families: IFamilies[] }>("/families");
    return res.data.families;
}

export function useGetFamilies() {
    const realm = useRealm();
    const storedFamilies = useQuery(Families);
    const isConnected = useNetworkStore((state) => state.isConnected);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    const syncFamilies = useCallback(async () => {
        if (!isConnected) {
            console.log("Offline mode: Using local families data");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log("Fetching families from remote");
            const apiFamilies = await fetchFamiliesFromRemote();
            
            if (!realm || realm.isClosed) {
                console.warn("Skipping Realm write: Realm is closed");
                setError(new Error("Realm is closed"));
                return;
            }

            realm.write(() => {
                apiFamilies.forEach(fam => {
                    try {
                        realm.create(Families, {
                            ...fam,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        }, Realm.UpdateMode.Modified);
                    } catch (error) {
                        console.error("Error creating/updating family:", error);
                    }
                });
            });

            setLastSyncTime(new Date());
        } catch (error) {
            console.error("Error fetching families:", error);
            setError(error instanceof Error ? error : new Error(String(error)));
        } finally {
            setIsLoading(false);
        }
    }, [isConnected, realm]);

    useEffect(() => {
        if (isConnected) {
            syncFamilies();
        }
    }, [isConnected, syncFamilies]);

    return {
        data: storedFamilies,
        isLoading,
        error,
        lastSyncTime,
        refresh: syncFamilies
    };
}
