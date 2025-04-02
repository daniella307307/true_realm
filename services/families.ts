import { useEffect } from "react";
import { useRealm, useQuery as useRealmQuery } from "@realm/react";
import { IFamilies } from "~/types";
import { baseInstance } from "~/utils/axios";
import { Families } from "~/models/family/families";

export async function fetchFamiliesFromRemote() {
    const res = await baseInstance.get<{ families: IFamilies[] }>("/families");
    return res.data.families;
}
export function useGetFamilies() {
    const realm = useRealm();
    const storedFamilies = useRealmQuery(Families);

    console.log("Realm path:", realm.path);

    useEffect(() => {
        async function fetchAndStoreFamilies() {
            const apiFamilies = await fetchFamiliesFromRemote();

            realm.write(() => {
                const existingFamilies = storedFamilies.map(fam => fam.id);
                const newFamilies = apiFamilies.filter(fam => !existingFamilies.includes(fam.id));

                // Only add new families if they don't exist in Realm
                if (newFamilies.length > 0) {
                    newFamilies.forEach(fam => {
                        realm.create(Families, {
                            ...fam,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        }, Realm.UpdateMode.Modified);
                    });
                } else {
                    // For families already stored, ensure the updated_at field is updated
                    storedFamilies.forEach(fam => {
                        const updatedFamily = apiFamilies.find(apiFam => apiFam.id === fam.id);
                        if (updatedFamily) {
                            fam.updated_at = new Date().toISOString();
                            realm.create(Families, fam, Realm.UpdateMode.Modified);
                        }
                    });
                }
            });
        }

        if (storedFamilies.length === 0) {
            fetchAndStoreFamilies();
        }
    }, [storedFamilies]);

    return storedFamilies;
}
