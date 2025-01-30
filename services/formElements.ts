import { IForm } from "~/types";
import { baseInstance } from "~/utils/axios";

export async function useGetFormElements({ id }: { id: number }) {
    console.log("The form id is:", id);
    const res = await baseInstance
        .get<IForm>(
            `/forms/${id}/elements`);
    return res.data;
}