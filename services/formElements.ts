import { IForm } from "~/types";
import { baseInstance } from "~/utils/axios";

export async function useGetFormElements({ id }: { id: number }) {
    const res = await baseInstance
        .get<IForm>(
            `/forms/${id}/elements`);
    return res.data;
}