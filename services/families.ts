import { IFamilies } from "~/types";
import { baseInstance } from "~/utils/axios";

export async function useGetFamilies() {
    const res = await baseInstance
        .get<{ families: IFamilies[] }>(
            '/families');
    return res.data;
}