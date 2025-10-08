// // SQLiteDebugService.ts
// import { Alert, Share } from "react-native";
// import { useMemo, useCallback } from "react";
// import { useSQLite } from "~/providers/RealContextProvider";

// interface DebugOptions {
//   includeAnswers?: boolean;
//   includeFormData?: boolean;
//   includeSyncData?: boolean;
//   filterByProject?: number;
//   filterByModule?: number;
//   maxItems?: number;
// }

// export class SQLiteDebugService {
//   private dbCtx: ReturnType<typeof useSQLite>;

//   constructor(dbCtx: ReturnType<typeof useSQLite>) {
//     this.dbCtx = dbCtx;
//   }

//   /** Get all submissions with details */
//   async getSubmissionDetails(options: DebugOptions = {}): Promise<any[]> {
//     try {
//       const submissions = await this.dbCtx.getAll<any>(
//         "surveys",
//         undefined,
//         []
//       );

//       const results: any[] = [];
//       for (let i = 0; i < Math.min(submissions.length, options.maxItems || 50); i++) {
//         const submission = submissions[i];
//         const result: any = {
//           id: submission._id,
//           table_name: submission.table_name,
//           created_at: submission.created_at,
//           updated_at: submission.updated_at,
//         };

//         if (options.includeFormData && submission.form_data) {
//           result.form_data = JSON.parse(submission.form_data);
//         }

//         if (options.includeSyncData && submission.sync_data) {
//           result.sync_data = JSON.parse(submission.sync_data);
//         }

//         if (options.includeAnswers && submission.answers) {
//           result.answers = JSON.parse(submission.answers);
//         }

//         if (
//           options.filterByProject &&
//           result.form_data?.project_id !== options.filterByProject
//         ) {
//           continue;
//         }

//         if (
//           options.filterByModule &&
//           result.form_data?.project_module_id !== options.filterByModule
//         ) {
//           continue;
//         }

//         results.push(result);
//       }

//       return results;
//     } catch (error: any) {
//       console.error("Error getting submission details:", error);
//       throw error;
//     }
//   }

//   /** Get all families */
//   async getFamilyDetails(options: DebugOptions = {}): Promise<any[]> {
//     try {
//       const families = await this.dbCtx.getAll<any>("families");

//       const results: any[] = [];
//       for (let i = 0; i < Math.min(families.length, options.maxItems || 50); i++) {
//         const family = families[i];
//         const result: any = {
//           id: family._id,
//           hh_id: family.hh_id,
//           hh_head_fullname: family.hh_head_fullname,
//           village_name: family.village_name,
//           created_at: family.created_at,
//           updated_at: family.updated_at,
//         };

//         if (options.includeFormData && family.form_data) {
//           result.form_data = JSON.parse(family.form_data);
//         }

//         if (options.includeSyncData && family.sync_data) {
//           result.sync_data = JSON.parse(family.sync_data);
//         }

//         if (family.meta) {
//           result.meta = JSON.parse(family.meta);
//         }

//         results.push(result);
//       }

//       return results;
//     } catch (error: any) {
//       console.error("Error getting family details:", error);
//       throw error;
//     }
//   }

//   /** Database stats */
//   async getDatabaseStats(): Promise<any> {
//     const stats: any = {
//       database_info: {
//         path: "app.db",
//         engine: "SQLite (expo-sqlite)",
//       },
//       collections: {},
//     };

//     const tables = [
//       "surveys",
//       "families",
//       "notifications",
//       "projects",
//       "cohorts",
//       "izus",
//       "villages",
//       "cells",
//       "sectors",
//       "districts",
//       "provinces",
//       "monitoring_forms",
//       "monitoring_responses",
//       "monitoring_modules",
//       "stakeholders",
//       "posts",
//     ];

//     for (const table of tables) {
//       try {
//         const count = await this.dbCtx.count(table);
//         stats.collections[table] = { count };

//         if (count > 0) {
//           const sample = await this.dbCtx.getFirst<any>(table);
//           stats.collections[table].sample = sample;
//         }
//       } catch (error: any) {
//         stats.collections[table] = { error: error.message, count: 0 };
//       }
//     }

//     return stats;
//   }

//   /** Export data */
//   async exportDataForDebugging(options: DebugOptions = {}) {
//     try {
//       const [submissions, families, stats] = await Promise.all([
//         this.getSubmissionDetails({ ...options, maxItems: 10 }),
//         this.getFamilyDetails({ ...options, maxItems: 10 }),
//         this.getDatabaseStats(),
//       ]);

//       const debugData = {
//         timestamp: new Date().toISOString(),
//         database_stats: stats,
//         sample_submissions: submissions,
//         sample_families: families,
//         options_used: options,
//       };

//       const debugJson = JSON.stringify(debugData, null, 2);

//       await Share.share({
//         message: debugJson,
//         title: "SQLite Database Debug Data",
//       });

//       return debugData;
//     } catch (error: any) {
//       console.error("Error exporting debug data:", error);
//       Alert.alert("Error", `Failed to export debug data: ${error.message}`);
//     }
//   }

//   /** Quick debug alert */
//   async showSubmissionDebug(submissionId?: string) {
//     try {
//       const submissions = await this.getSubmissionDetails({
//         includeAnswers: true,
//         includeFormData: true,
//         includeSyncData: true,
//         maxItems: submissionId ? 1000 : 5,
//       });

//       let target = submissions[0];
//       if (submissionId) {
//         target = submissions.find((s) => s.id === submissionId) || submissions[0];
//       }

//       if (!target) {
//         Alert.alert("Debug Info", "No submissions found in database");
//         return;
//       }

//       const debugInfo = `
// ID: ${target.id}
// Form Data Keys: ${target.form_data ? Object.keys(target.form_data).join(", ") : "None"}
// Answers Keys: ${target.answers ? Object.keys(target.answers).join(", ") : "None"}
// Sync Status: ${target.sync_data?.status || "Unknown"}
// Project ID: ${target.form_data?.project_id || "N/A"}
// Module ID: ${target.form_data?.project_module_id || "N/A"}
// Family: ${target.form_data?.family || "N/A"}
// Table: ${target.form_data?.table_name || "N/A"}
// Total Submissions: ${submissions.length}
//       `.trim();

//       Alert.alert("Submission Debug", debugInfo);
//     } catch (error: any) {
//       Alert.alert("Debug Error", `Failed to get debug info: ${error.message}`);
//     }
//   }

//   /** Validate consistency */
//   async validateDataConsistency() {
//     const submissions = await this.getSubmissionDetails({
//       includeFormData: true,
//       includeSyncData: true,
//       maxItems: 1000,
//     });

//     const families = await this.getFamilyDetails({
//       includeFormData: true,
//       includeSyncData: true,
//       maxItems: 1000,
//     });

//     const validation = {
//       submissions: {
//         total: submissions.length,
//         with_form_data: submissions.filter((s) => s.form_data).length,
//         with_sync_data: submissions.filter((s) => s.sync_data).length,
//         with_answers: submissions.filter((s) => s.answers).length,
//         pending_sync: submissions.filter((s) => s.sync_data?.status === "pending").length,
//       },
//       families: {
//         total: families.length,
//         with_form_data: families.filter((f) => f.form_data).length,
//         with_sync_data: families.filter((f) => f.sync_data).length,
//         with_meta: families.filter((f) => f.meta).length,
//       },
//       issues: [] as string[],
//     };

//     if (validation.submissions.total === 0) {
//       validation.issues.push("No submissions found in database");
//     }

//     if (validation.submissions.with_form_data < validation.submissions.total) {
//       validation.issues.push(
//         `${validation.submissions.total - validation.submissions.with_form_data} submissions missing form_data`
//       );
//     }

//     if (validation.submissions.with_answers < validation.submissions.total) {
//       validation.issues.push(
//         `${validation.submissions.total - validation.submissions.with_answers} submissions missing answers`
//       );
//     }

//     return validation;
//   }

//   /** Connection test */
//   async testDatabaseConnection(): Promise<boolean> {
//     try {
//       const count = await this.dbCtx.count("surveys");
//       console.log(`Database test successful. Found ${count} surveys`);
//       return true;
//     } catch (error) {
//       console.error("Database connection test failed:", error);
//       return false;
//     }
//   }
// }

// /** Hook for components */
// export const useSQLiteDebug = () => {
//   const dbCtx = useSQLite();
  
//   // Memoize the debug service instance to avoid recreating it on every render
//   const debugService = useMemo(() => new SQLiteDebugService(dbCtx), [dbCtx]);

//   // Memoize all callback functions
//   const showQuickDebug = useCallback(() => {
//     return debugService.showSubmissionDebug();
//   }, [debugService]);

//   const exportDebugData = useCallback(() => {
//     return debugService.exportDataForDebugging({
//       includeAnswers: true,
//       includeFormData: true,
//       includeSyncData: true,
//       maxItems: 20,
//     });
//   }, [debugService]);

//   const validateData = useCallback(async () => {
//     try {
//       const validation = await debugService.validateDataConsistency();
//       Alert.alert("Data Validation", JSON.stringify(validation, null, 2));
//     } catch (error: any) {
//       Alert.alert("Validation Error", error.message);
//     }
//   }, [debugService]);

//   const testConnection = useCallback(async () => {
//     try {
//       const ok = await debugService.testDatabaseConnection();
//       Alert.alert("Connection Test", ok ? "Database connection successful!" : "Database connection failed!");
//     } catch (error: any) {
//       Alert.alert("Connection Error", error.message);
//     }
//   }, [debugService]);

//   return {
//     showQuickDebug,
//     exportDebugData,
//     validateData,
//     testConnection,
//   };
// };