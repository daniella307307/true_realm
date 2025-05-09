import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";

import { useDataSync } from "./dataSync";
import { IStatistics } from "~/types";
import { Statistics } from "~/models/statistics/statistics";
import { useGetIzuPerformances } from "./performance";
import { MonitoringResponses } from "~/models/monitoring/monitoringresponses";
import { useGetIzus } from "./izus";

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

// Get statistics for a specific IZU, including performance score
export function useGetIzuStatistics(
  izuId: number | null,
  forceSync: boolean = false
) {
  const {
    statistics,
    isLoading: statsLoading,
    error: statsError,
    refresh,
  } = useGetStatistics(forceSync);
  const {
    score,
    total,
    isLoading: perfLoading,
  } = useGetIzuPerformances(izuId, forceSync);

  const izuStatistics = izuId
    ? statistics.filtered("id == $0", izuId)[0] || null
    : null;

  // Find monitoring responses for this IZU
  const monitoringResponses = useQuery(MonitoringResponses).filtered(
    "user_id == $0",
    izuId
  );

  console.log("monitoringResponses", monitoringResponses);
  // Convert to array for easier consumption and sort by date (most recent first)
  const monitoringResponsesArray = monitoringResponses
    ? Array.from(monitoringResponses)
        .map((response) => ({
          id: response.id,
          family_id: response.family_id,
          date_recorded: response.date_recorded,
          type: response.type,
          score_data: response.score_data as unknown as {
            total: number;
            possible: number;
            percentage: number;
            fields_count: number;
            details: Record<string, any>;
          },
        }))
        .sort((a, b) => {
          // Sort by date, most recent first
          return (
            new Date(b.date_recorded).getTime() -
            new Date(a.date_recorded).getTime()
          );
        })
    : [];

  return {
    statistics: izuStatistics,
    score,
    totalPoints: total,
    isLoading: statsLoading || perfLoading,
    error: statsError,
    refresh: () => refresh(),
    monitoringResponses: monitoringResponsesArray,
  };
}
