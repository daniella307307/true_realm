import { useMemo } from "react";

import { Families } from "~/models/family/families";
import { I2BaseFormat, I4BaseFormat, IFamilies } from "~/types";
import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";

import { useDataSync } from "./dataSync";

const { useRealm, useQuery } = RealmContext;

export async function fetchFamiliesFromRemote() {
  const res = await baseInstance.get<{
    families: IFamilies[];
  }>("/families");
  return res.data;
}

export function useGetFamilies(forceSync: boolean = false) {
  const storedFamilies = useQuery(Families);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "families",
      fetchFn: fetchFamiliesFromRemote,
      model: Families,
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
      transformData: (data: { families: IFamilies[] }) => {
        console.log("data", data?.families.length);
        return data.families.map((fam) => ({
          ...fam,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          location: JSON.stringify(fam.location),
        }));
      },
    },
  ]);

  console.log("storedFamilies", storedFamilies.length);
  return {
    families: storedFamilies,
    isLoading: syncStatus.families?.isLoading || false,
    error: syncStatus.families?.error || null,
    lastSyncTime: syncStatus.families?.lastSyncTime || null,
    refresh: () => refresh("families", forceSync),
  };
}
