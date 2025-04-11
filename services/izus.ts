import { useMemo } from "react";

import { IIzu } from "~/models/izus/izu";
import { Izu } from "~/models/izus/izu";
import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";

import { useDataSync } from "./dataSync";

const { useRealm, useQuery } = RealmContext;

interface IIzuResponse {
  izus: IIzu[];
}

export async function fetchIzusFromRemote() {
  const res = await baseInstance.get<IIzuResponse>("/izus");
  return res.data.izus;
}

export function useGetIzus(forceSync: boolean = false) {
  const storedIzus = useQuery(Izu);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "izus",
      fetchFn: fetchIzusFromRemote,
      model: Izu,
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
    },
  ]);

  console.log("storedIzus length", storedIzus.length);

  return {
    izus: storedIzus,
    isLoading: syncStatus.izus?.isLoading || false,
    error: syncStatus.izus?.error || null,
    lastSyncTime: syncStatus.izus?.lastSyncTime || null,
    refresh: () => refresh("izus", forceSync),
  };
}

/**
 * Hook for getting a specific Izu by ID
 * @param id The ID of the Izu to retrieve
 */
export function useGetIzuById(id: number, forceSync: boolean = false) {
  const { izus, isLoading, error, lastSyncTime, refresh } = useGetIzus(forceSync);

  const izu = useMemo(() => {
    return izus.find((izu) => izu.id === id);
  }, [izus, id]);

  return {
    izu,
    isLoading,
    error,
    lastSyncTime,
    refresh,
  };
}
