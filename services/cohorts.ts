import { useEffect } from "react";

import { Cohort } from "~/models/cohorts/cohort";
import { Realm } from "@realm/react";
import { RealmContext } from "~/providers/RealContextProvider";

import { useGetFamilies } from "./families";

const { useRealm, useQuery } = RealmContext;

export function useGetCohorts() {
  const realm = useRealm();
  const storedCohorts = useQuery(Cohort);
  const { families } = useGetFamilies();

  useEffect(() => {
    if (!families) return;

    const uniqueCohorts = Array.from(
      new Set(families.map((family) => family.cohort))
    )
      .filter((cohort) => cohort)
      .map((cohort, index) => ({
        id: index + 1,
        cohort: cohort as string,
      }));

    realm.write(() => {
      const existingCohorts = realm.objects("Cohort");
      realm.delete(existingCohorts);

      // Add new cohorts
      uniqueCohorts.forEach((cohort) => {
        try {
          realm.create("Cohort", cohort, Realm.UpdateMode.Modified);
        } catch (error) {
          console.error("Error creating cohort:", error);
        }
      });
    });
  }, [families]);

  return {
    data: storedCohorts,
    isLoading: storedCohorts.length === 0,
  };
}
