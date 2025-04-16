import { useEffect, useState, useCallback } from "react";
import { Stakeholder } from "~/models/stakeholders/stakeholder";
import { IStakeholder } from "~/models/stakeholders/stakeholder";
import { I2BaseFormat, I4BaseFormat, IResponse } from "~/types";
import { baseInstance } from "~/utils/axios";
import stakeHoldersData from "~/mocks/stakeholders.json";
import { RealmContext } from "~/providers/RealContextProvider";
import { useNetworkStatus } from "./network";
import { useDataSync } from "./dataSync";
const { useRealm, useQuery } = RealmContext;

export async function fetchStakeholdersFromRemote() {
  const res = await baseInstance.get<IStakeholder[]>("/get-stakeholders");

  return res.data;
}

// Hook for getting all stakeholders with offline support
export function useGetStakeholders(forceSync: boolean = false) {
  const storedStakeholders = useQuery(Stakeholder);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "stakeholders",
      fetchFn: fetchStakeholdersFromRemote,
      model: Stakeholder,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  ]);

  return {
    stakeholders: storedStakeholders,
    isLoading: syncStatus.stakeholders?.isLoading || false,
    error: syncStatus.stakeholders?.error || null,
    lastSyncTime: syncStatus.stakeholders?.lastSyncTime || null,
    refresh: () => refresh("stakeholders", forceSync),
  };
}
