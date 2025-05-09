import { Cohort } from "~/models/cohorts/cohort";
import { RealmContext } from "~/providers/RealContextProvider";

import { baseInstance } from "~/utils/axios";
import { useDataSync } from "./dataSync";
import { ICohort } from "~/types";

const { useRealm, useQuery } = RealmContext;

export async function fetchCohortsFromRemote() {
  const res = await baseInstance.get<[{}]>("/get-cohorts");
  console.log("Cohorts from remote:", JSON.stringify(res.data, null, 2));
  return res.data;
}

export function useGetCohorts(forceSync: boolean = false) {
  const storedCohorts = useQuery(Cohort);
  const realm = useRealm();

  const { syncStatus, refresh } = useDataSync([
    {
      key: "cohorts",
      fetchFn: fetchCohortsFromRemote,
      model: Cohort,
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
      transformData: (data) => {
        
        // Clear existing cohorts before syncing new ones
        realm.write(() => {
          realm.delete(storedCohorts);
        });
        
        // Transform and return new data with proper _id, filtering out empty cohorts
        return data
          .filter((cohort: ICohort) => cohort.cohort !== "" && cohort.cohort !== null)
          .map((cohort: ICohort) => ({
            cohort: cohort.cohort,
            _id: new Realm.BSON.ObjectId(),
          }));
      },
    },
  ]);
  
  return {
    cohorts: storedCohorts,
    isLoading: syncStatus.cohorts?.isLoading || false,
    error: syncStatus.cohorts?.error || null,
    lastSyncTime: syncStatus.cohorts?.lastSyncTime || null,
    refresh: () => refresh("cohorts", true), // Force refresh to ensure data is synced
  };
}

