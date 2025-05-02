import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";

import { useDataSync } from "./dataSync";
import { IStatistics } from "~/types";
import { Statistics } from "~/models/statistics/statistics";

const { useQuery } = RealmContext;

interface IStatisticsResponse {
  statistics: IStatistics[];
}

export async function fetchStatisticsFromRemote() {
  const res = await baseInstance.get<IStatisticsResponse>(
    "/my-izus-statistics"
  );
  return res.data.statistics;
}

export function useGetStatistics(forceSync: boolean = false) {
  const storedStatistics = useQuery(Statistics);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "statistics",
      fetchFn: fetchStatisticsFromRemote,
      model: Statistics,
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
    },
  ]);

  return {
    statistics: storedStatistics,
    isLoading: syncStatus.statistics?.isLoading || false,
    error: syncStatus.statistics?.error || null,
    lastSyncTime: syncStatus.statistics?.lastSyncTime || null,
    refresh: () => refresh("statistics", forceSync),
  };
}
