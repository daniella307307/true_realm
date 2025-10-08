import { useSQLite } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { useDataSync } from "../dataSync";
import { IMonitoringModules } from "~/types";
import { useMemo, useState } from "react";

const TABLE_NAME = "MonitoringModules";

interface IMonitoringModulesResponse {
  data: IMonitoringModules[];
}

// Fetch monitoring modules from API and transform
export async function fetchMonitoringModulesFromRemote() {
  const res = await baseInstance.get<IMonitoringModulesResponse>("/get-all-module-monitoring");

  return res.data.data.map((form) => ({
    _id: form.id,
    monitoring_id: form.monitoring_id,
    form_data: {
      source_module_id: form.modules_id,
      project_id: form.project_id,
    },
    createdAt: new Date(form.createdAt).toISOString(),
    updatedAt: new Date(form.updatedAt).toISOString(),
  }));
}

// Hook to get monitoring modules
export function useGetMonitoringModules(forceSync: boolean = false) {
  const { getAll, create } = useSQLite();
  const [storedModules, setStoredModules] = useState<any[]>([]);

  // Load modules from local SQLite
  useMemo(() => {
    getAll(TABLE_NAME).then(setStoredModules);
  }, []);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "monitoringModules",
      fetchFn: fetchMonitoringModulesFromRemote,
      tableName: TABLE_NAME,
      staleTime: 5 * 60 * 1000,
      forceSync,
      transformData: (modules) => {
        if (!modules?.length) return [];
        // Save or update in SQLite
        const savedModules = [];
        for (const module of modules) {
          // Upsert logic: create or overwrite
          create(TABLE_NAME, module);
          savedModules.push(module);
        }
        return savedModules;
      },
    },
  ]);

  return {
    monitoringModules: storedModules,
    isLoading: syncStatus.monitoringModules?.isLoading || false,
    error: syncStatus.monitoringModules?.error || null,
    lastSyncTime: syncStatus.monitoringModules?.lastSyncTime || null,
    refresh: () => refresh("monitoringModules", forceSync),
  };
}
