import { useEffect } from "react";
import { Stakeholder } from "~/models/stakeholders/stakeholder";
import { IStakeholder } from "~/models/stakeholders/stakeholder";
import { I2BaseFormat } from "~/types";
import { baseInstance } from "~/utils/axios";
import stakeHoldersData from "~/mocks/stakeholders.json";
import { RealmContext } from "~/providers/RealContextProvider";
const { useRealm, useQuery } = RealmContext;

export async function fetchStakeholdersFromRemote() {
    const res = await baseInstance
        .get<I2BaseFormat<IStakeholder>>('/stake-holders');

    return res.data;
}

export function useGetStakeholders() {
    const realm = useRealm();
    const storedStakeholders = useQuery(Stakeholder);

    useEffect(() => {
      if (storedStakeholders.length === 0) {
        realm.write(() => {
          stakeHoldersData.forEach((stakeHolder: IStakeholder) => {
            realm.create("Stakeholder", stakeHolder, Realm.UpdateMode.Modified);
          });
        });
      }
    }, [storedStakeholders]);
  
    return {
        data: storedStakeholders,
        isLoading: storedStakeholders.length === 0,
    }
} 