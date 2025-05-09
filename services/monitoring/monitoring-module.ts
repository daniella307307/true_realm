import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { useDataSync } from "../dataSync";
import { MonitoringForms } from "~/models/monitoring/monitoringforms";
import { IMonitoringModules } from "~/types";
import { MonitoringModules } from "~/models/monitoring/monitoringmodule";
const { useQuery, useRealm } = RealmContext;

interface IMonitoringModulesResponse {
  data: IMonitoringModules[];
}

export async function fetchMonitoringModulesFromRemote() {
  const res = await baseInstance.get<IMonitoringModulesResponse>("/get-all-module-monitoring");
  
  // Transform the response data to match our Realm model
  return res.data.data.map((form: IMonitoringModules) => ({
    id: form.id,
    monitoring_id: form.monitoring_id,
    form_data: {
      source_module_id: form.modules_id,
      project_id: form.project_id,
    },
    createdAt: new Date(form.createdAt),
    updatedAt: new Date(form.updatedAt),
  }));
}

export function useGetMonitoringModules(forceSync: boolean = false) {
  const storedMonitoringModules = useQuery(MonitoringModules);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "monitoringModules",
      fetchFn: fetchMonitoringModulesFromRemote,
      model: MonitoringModules,
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
    },
  ]);

  return {
    monitoringModules: storedMonitoringModules,
    isLoading: syncStatus.monitoringModules?.isLoading || false,
    error: syncStatus.monitoringModules?.error || null,
    lastSyncTime: syncStatus.monitoringModules?.lastSyncTime || null,
    refresh: () => refresh("monitoringModules", forceSync),
  };
}