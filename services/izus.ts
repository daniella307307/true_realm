import { useCallback, useEffect, useState } from "react";
import { Realm } from "@realm/react";
import { baseInstance } from "~/utils/axios";
import { Izu, IIzu } from "~/models/izus/izu";
import { useNetworkStore } from "~/services/network";
import { RealmContext } from "~/providers/RealContextProvider";
const { useRealm, useQuery } = RealmContext;

interface I2BaseFormat<T> {
  izus: T[];
}

export async function fetchIzusFromRemote() {
  const res = await baseInstance.get<I2BaseFormat<IIzu>>("/izus");
  return res.data.izus;
}

export function useGetIzus() {
  const realm = useRealm();
  const storedIzus = useQuery(Izu);
  const isConnected = useNetworkStore((state) => state.isConnected);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const syncIzus = useCallback(async () => {
    if (!isConnected) {
      console.log("Offline mode: Using local IZUs data");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching IZUs from remote");
      const apiIzus = await fetchIzusFromRemote();
      
      if (!realm || realm.isClosed) {
        console.warn("Skipping Realm write: Realm is closed");
        setError(new Error("Realm is closed"));
        return;
      }


      realm.write(() => {
        apiIzus.forEach((izu) => {
          try {
            realm.create("Izu", izu, Realm.UpdateMode.Modified);
          } catch (error) {
            console.error("Error creating/updating IZU:", error);
          }
        });
      });

      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Error fetching IZUs:", error);
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, realm]);

  useEffect(() => {
    if (isConnected) {
      syncIzus();
    }
  }, [isConnected, syncIzus]);

  return {
    data: storedIzus,
    isLoading,
    error,
    lastSyncTime,
    refresh: syncIzus
  };
}

export function useGetIzuById(id: number) {
  const realm = useRealm();
  const izus = useQuery(Izu);
  
  const izu = izus.find((item) => item.id === id);
  return { data: izu, isLoading: false };
}