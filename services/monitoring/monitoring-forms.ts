import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { useDataSync } from "../dataSync";
import { MonitoringForms } from "~/models/monitoring/monitoringforms";
import { IMonitoringForms } from "~/types";
import { useGetMonitoringModules } from "./monitoring-module";
import { MonitoringModules } from "~/models/monitoring/monitoringmodule";
const { useQuery, useRealm } = RealmContext;

interface IMonitoringFormsResponse {
  data: IMonitoringForms[];
}

export async function fetchMonitoringModulesFromRemote() {
  const res = await baseInstance.get<IMonitoringFormsResponse>(
    "/get-monitoring-forms"
  );

  // Transform the response data to match our Realm model
  return res.data.data.map((form) => ({
    id: form.id,
    name: form.name,
    name_kin: form.name_kin,
    json2: JSON.stringify(form.json2),
    post_data: form.post_data,
    table_name: form.table_name,
    single_page: form.single_page,
    status: form.status,
  }));
}

export function useGetMonitoringForms(forceSync: boolean = false) {
  const storedForms = useQuery(MonitoringForms);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "monitoringForms",
      fetchFn: fetchMonitoringModulesFromRemote,
      model: MonitoringForms,
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
    },
  ]);

  return {
    monitoringForms: storedForms,
    isLoading: syncStatus.monitoringForms?.isLoading || false,
    error: syncStatus.monitoringForms?.error || null,
    lastSyncTime: syncStatus.monitoringForms?.lastSyncTime || null,
    refresh: () => refresh("monitoringForms", forceSync),
  };
}

// Get Monitoring Forms by Module ID
export function useGetMonitoringFormsByModule(moduleId: number) {
  // Get all monitoring modules with the specified source_module_id
  const monitoringModules = useQuery(MonitoringModules).filtered(
    "form_data.source_module_id == $0", 
    moduleId
  );
  
  // Get all forms
  const { monitoringForms: allMonitoringForms, isLoading, refresh } = useGetMonitoringForms();
  
  // Extract monitoring_ids from the filtered modules
  const monitoringIds = monitoringModules.map(module => module.monitoring_id);
  
  // Get forms that match the monitoring_ids
  const moduleForms = allMonitoringForms.filtered(
    "id IN $0", 
    monitoringIds
  );

  return {
    moduleForms,
    isLoading,
    refreshModuleForms: refresh,
  };
} 

// Get Monitoring Form by id
export function useGetMonitoringFormById(formId: number) {
  const form = useQuery(MonitoringForms).filtered("id == $0", formId);
  return {
    form,
    isLoading: false,
  };
}