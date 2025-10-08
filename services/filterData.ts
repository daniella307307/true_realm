import { useSQLite } from "~/providers/RealContextProvider";
import { useAuth } from "~/lib/hooks/useAuth";

/**
 * Custom hook for filtering data by current user
 * Use this in React components
 */
export function useUserDataFilter() {
  const { user } = useAuth({});
  const { getByQuery, getAll } = useSQLite();

  const filterByCurrentUser = async (
    table: string,
    allowSyncedData: boolean = true
  ): Promise<any[]> => {
    if (!user || !user.id) {
      return [];
    }

    const currentUserId = user.id;

    // Filter objects by user ID
    const filteredObjects = await getByQuery(
      table,
      allowSyncedData
        ? "(form_data.user_id = $0 OR user.id = $0)"
        : "form_data.user_id = $0",
      [currentUserId, currentUserId]
    );

    return filteredObjects || [];
  };

  const filterDataByUserId = async (table: string, id: number): Promise<any[]> => {
    if (!user || !user.id) {
      return [];
    }

    const currentUserId = user.id;

    switch (table) {
      case "SurveySubmission":
        return await getByQuery(table, "form_data_user_id = ?", [currentUserId]);

      case "Families":
        // For Families, basic filtering; position-based filtering handled elsewhere
        return await getAll(table);

      case "Izu":
        return await getAll(table); // position-based filtering happens in izus.ts

      case "FollowUps":
        return await getByQuery(table, "form_data_user_id = ? OR user_id = ?", [
          currentUserId,
          currentUserId,
        ]);

      case "MonitoringResponses":
        return await getByQuery(table, "sync_data_created_by_user_id = ?", [
          currentUserId,
        ]);

      default:
        try {
          // Default: try user_id column
          return await getByQuery(table, "user_id = ?", [currentUserId]);
        } catch {
          try {
            // fallback: form_data_user_id column
            return await getByQuery(table, "form_data_user_id = ?", [
              currentUserId,
            ]);
          } catch (error: any) {
            console.error(
              `Could not filter ${table} by user ID:`,
              error.message
            );
            return await getAll(table); // return all as last resort
          }
        }
    }
  };

  return {
    filterByCurrentUser,
    filterDataByUserId,
    currentUserId: user?.id || null,
  };
}