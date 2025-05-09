import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";

import { useDataSync } from "./dataSync";
import { IPerformance } from "~/types";
import { Performance } from "~/models/performance/performance";

const { useQuery } = RealmContext;

interface IPerformanceResponse {
  performances: IPerformance[];
}

// Grade mapping for score calculation
const GRADE_MAPPING: Record<string, number> = {
  "Did not occur": 0,
  "Nta byabaye ho": 0,
  "Poor": 1,
  "Gacye cyane": 1, 
  "Needs Improvement": 2,
  "Hacyenewe kwikosora": 2,
  "Average": 3,
  "Biraringaniye": 3,
  "Excellent": 4,
  "Byiza Cyane": 4,
  "Byiza cyane": 4
};

// Calculate the score for a given IZU based on their performances
export function calculateIzuScore(performances: Performance[]): { score: number, total: number } {
  let validAnswers = 0;
  let totalPoints = 0;
  
  performances.forEach(performance => {
    if (performance.answer && performance.answer.trim() !== "") {
      validAnswers++;
      const score = GRADE_MAPPING[performance.answer] || 0;
      totalPoints += score;
    }
  });
  
  return {
    score: totalPoints,
    total: validAnswers * 4 // Maximum score is 4 per valid answer
  };
}

export async function fetchPerformancesFromRemote() {
  const res = await baseInstance.get<IPerformanceResponse>(
    "/get-performances"
  );
  return res.data.performances;
}

export function useGetPerformances(forceSync: boolean = false) {
  const storedPerformances = useQuery(Performance);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "performances",
      fetchFn: fetchPerformancesFromRemote,
      model: Performance,
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
    },
  ]);

  return {
    performances: storedPerformances,
    isLoading: syncStatus.performances?.isLoading || false,
    error: syncStatus.performances?.error || null,
    lastSyncTime: syncStatus.performances?.lastSyncTime || null,
    refresh: () => refresh("performances", forceSync),
  };
}

// Get performances for a specific IZU
export function useGetIzuPerformances(izuId: number | null, forceSync: boolean = false) {
  const { performances, isLoading, error, lastSyncTime, refresh } = useGetPerformances(forceSync);
  
  const izuPerformances = izuId ? 
    performances.filtered("user_id == $0", izuId) : 
    null;
  
  // Calculate score if we have performances
  const scoreData = izuPerformances && izuPerformances.length > 0 ? 
    calculateIzuScore(Array.from(izuPerformances)) : 
    { score: 0, total: 0 };
  
  return {
    performances: izuPerformances,
    isLoading,
    error,
    lastSyncTime,
    refresh: () => refresh(),
    score: scoreData.score,
    total: scoreData.total,
  };
} 