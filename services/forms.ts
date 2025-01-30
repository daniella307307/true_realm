import { IForms } from "~/types";
import { baseInstance } from "~/utils/axios";

interface IFormsResponse {
    current_page: string;
    data: {
        current_page: string;
        data: IForms[];
    };
}

export async function useGetForms() {
    const res = await baseInstance
        .get<IFormsResponse>(
            '/forms');
            
    return res.data;
}