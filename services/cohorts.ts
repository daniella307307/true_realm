// import { useSQLite } from "~/providers/RealContextProvider";
// import { baseInstance } from "~/utils/axios";
// import { ICohort } from "~/types";
// import { useEffect, useState, useCallback } from "react";
// import 'react-native-get-random-values'
// import { v4 as uuidv4 } from "uuid";

// // ============================================
// // HELPER FUNCTIONS
// // ============================================

// const newId = () => uuidv4();

// function cohortToSQLiteRow(cohort: ICohort): any {
//   return {
//     _id: cohort._id || newId(),
//     cohort: String(cohort.cohort),
//     created_at: cohort.created_at || new Date().toISOString(),
//     updated_at: cohort.updated_at || new Date().toISOString(),
//   };
// }

// function sqliteRowToCohort(row: any): ICohort {
//   return {
//     _id: row._id,
//     cohort: row.cohort,
//     created_at: row.created_at,
//     updated_at: row.updated_at,
//   };
// }

// // ============================================
// // FETCH FROM API
// // ============================================

// export async function fetchCohortsFromRemote() {
//   const res = await baseInstance.get<ICohort[]>("/get-cohorts");
//   return res.data;
// }

// // ============================================
// // HOOK: useGetCohorts
// // ============================================

// export function useGetCohorts(forceSync: boolean = false) {
//   const { getAll, batchCreate, deleteAll } = useSQLite();
//   const [cohorts, setCohorts] = useState<ICohort[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<Error | null>(null);
//   const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

//   const loadCohorts = useCallback(async () => {
//     try {
//       setIsLoading(true);
//       const rows = await getAll<any>("Cohorts");
//       setCohorts(rows.map(sqliteRowToCohort));
//       setIsLoading(false);
//     } catch (err) {
//       console.error("Error loading cohorts:", err);
//       setError(err as Error);
//       setIsLoading(false);
//     }
//   }, [getAll]);

//   const syncCohorts = useCallback(async () => {
//     try {
//       setIsLoading(true);
//       const remoteData = await fetchCohortsFromRemote();

//       const validCohorts = remoteData
//         .filter((c) => c.cohort !== "" && c.cohort !== null)
//         .map((c) => cohortToSQLiteRow(c));

//       // Replace all existing cohorts with remote data
//       await deleteAll("Cohorts");
//       if (validCohorts.length > 0) {
//         await batchCreate("Cohorts", validCohorts);
//       }

//       setCohorts(validCohorts.map(sqliteRowToCohort));
//       setLastSyncTime(new Date());
//       setIsLoading(false);
//     } catch (err) {
//       console.error("Error syncing cohorts:", err);
//       setError(err as Error);
//       setIsLoading(false);
//     }
//   }, [deleteAll, batchCreate]);

//   // Check stale data (5 minutes)
//   const isStale = useCallback(() => {
//     return !lastSyncTime || Date.now() - lastSyncTime.getTime() > 5 * 60 * 1000;
//   }, [lastSyncTime]);

//   useEffect(() => {
//     const initialize = async () => {
//       await loadCohorts();
//       if (forceSync || isStale() || cohorts.length === 0) {
//         await syncCohorts();
//       }
//     };
//     initialize();
//   }, [forceSync, loadCohorts, syncCohorts, isStale, cohorts.length]);

//   const refresh = useCallback(async (forceFetch: boolean = true) => {
//     if (forceFetch) {
//       await syncCohorts();
//     } else {
//       await loadCohorts();
//     }
//   }, [syncCohorts, loadCohorts]);

//   return { cohorts, isLoading, error, lastSyncTime, refresh };
// }

// // ============================================
// // CUSTOM HOOK FOR UTILITY OPERATIONS
// // ============================================

// export function useCohortOperations() {
//   const { getById, getAll, create, update, delete: deleteRecord } = useSQLite();

//   const getCohortById = useCallback(async (id: string): Promise<ICohort | null> => {
//     try {
//       const row = await getById<any>("Cohorts", id);
//       return row ? sqliteRowToCohort(row) : null;
//     } catch (error) {
//       console.error("Error getting cohort by ID:", error);
//       return null;
//     }
//   }, [getById]);

//   const searchCohorts = useCallback(async (searchTerm: string): Promise<ICohort[]> => {
//     try {
//       const rows = await getAll<any>("Cohorts");
//       return rows
//         .map(sqliteRowToCohort)
//         .filter((c) => c.cohort.toLowerCase().includes(searchTerm.toLowerCase()));
//     } catch (error) {
//       console.error("Error searching cohorts:", error);
//       return [];
//     }
//   }, [getAll]);

//   const createCohort = useCallback(async (cohortValue: string): Promise<ICohort | null> => {
//     if (!cohortValue.trim()) return null;

//     const newCohort: ICohort = {
//       _id: newId(),
//       cohort: cohortValue,
//       created_at: new Date().toISOString(),
//       updated_at: new Date().toISOString(),
//     };

//     try {
//       await create("Cohorts", cohortToSQLiteRow(newCohort));
//       return newCohort;
//     } catch (error) {
//       console.error("Error creating cohort:", error);
//       return null;
//     }
//   }, [create]);

//   const updateCohort = useCallback(async (id: string, cohortValue: string): Promise<boolean> => {
//     if (!cohortValue.trim()) return false;

//     try {
//       await update("Cohorts", id, { cohort: cohortValue, updated_at: new Date().toISOString() });
//       return true;
//     } catch (error) {
//       console.error("Error updating cohort:", error);
//       return false;
//     }
//   }, [update]);

//   const deleteCohort = useCallback(async (id: string): Promise<boolean> => {
//     try {
//       await deleteRecord("Cohorts", id);
//       return true;
//     } catch (error) {
//       console.error("Error deleting cohort:", error);
//       return false;
//     }
//   }, [deleteRecord]);

//   const cohortExists = useCallback(async (cohortValue: string): Promise<boolean> => {
//     try {
//       const rows = await getAll<any>("Cohorts");
//       return rows.some((c) => c.cohort.toLowerCase() === cohortValue.toLowerCase());
//     } catch (error) {
//       console.error("Error checking cohort existence:", error);
//       return false;
//     }
//   }, [getAll]);

//   return {
//     getCohortById,
//     searchCohorts,
//     createCohort,
//     updateCohort,
//     deleteCohort,
//     cohortExists,
//   };
// }