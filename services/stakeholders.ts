import { useEffect, useState, useCallback } from "react";
import { Stakeholder } from "~/models/stakeholders/stakeholder";
import { IStakeholder } from "~/models/stakeholders/stakeholder";
import { I2BaseFormat, I4BaseFormat, IResponse } from "~/types";
import { baseInstance } from "~/utils/axios";
import stakeHoldersData from "~/mocks/stakeholders.json";
import { RealmContext } from "~/providers/RealContextProvider";
import { useNetworkStatus } from "./network";
const { useRealm, useQuery } = RealmContext;

export async function fetchStakeholdersFromRemote() {
    const res = await baseInstance
        .get<IStakeholder[]>('/get-stakeholders');

    return res.data;
}

export function useGetStakeholders() {
    const realm = useRealm();
    const storedStakeholders = useQuery(Stakeholder);
    const { isConnected } = useNetworkStatus();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    const syncStakeholders = useCallback(async () => {
        if (!isConnected) {
            console.log("Offline mode: Using local stakeholders data");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log("Fetching stakeholders from remote");
            const apiStakeholders = await fetchStakeholdersFromRemote();

            if (!realm || realm.isClosed) {
                console.warn("Skipping Realm write: Realm is closed");
                setError(new Error("Realm is closed"));
                return;
            }

            realm.write(() => {
                apiStakeholders.forEach((stakeholder: IStakeholder) => {
                    try {
                        realm.create("Stakeholder", stakeholder, Realm.UpdateMode.Modified);
                    } catch (error) {
                        console.error("Error creating/updating stakeholder:", error);
                    }
                });
            });

            setLastSyncTime(new Date());
        } catch (error) {
            console.error("Error fetching stakeholders:", error);
            setError(error instanceof Error ? error : new Error(String(error)));
        } finally {
            setIsLoading(false);
        }
    }, [isConnected, realm]);

    useEffect(() => {
        if (storedStakeholders.length === 0) {
            realm.write(() => {
                stakeHoldersData.forEach((stakeHolder: IStakeholder) => {
                    realm.create("Stakeholder", stakeHolder, Realm.UpdateMode.Modified);
                });
            });
        }
    }, [storedStakeholders, realm]);

    // Initial load and when network state changes
    useEffect(() => {
        if (isConnected) {
            syncStakeholders();
        }
    }, [isConnected, syncStakeholders]);
  
    return {
        stakeholders: storedStakeholders,
        isLoading,
        error,
        lastSyncTime,
        refresh: syncStakeholders
    };
} 