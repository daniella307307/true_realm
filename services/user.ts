import { ILoginDetails, ILoginResponse, IResponse, IZUs, User } from "~/types";
import { baseInstance } from "~/utils/axios";

export async function userLogout() {
    const res = await baseInstance.post<IResponse<{}>>(`/logout`);
    return res.data;
}

export async function userLogin(values: ILoginDetails) {
    const res = await baseInstance
        .post<ILoginResponse>(
            '/login',
            { email: values.email, password: values.password },
            {
                headers: {
                    Authorization: undefined,
                },
            });
    return res.data;
}

export async function useGetCurrentLoggedInProfile() {
    const res = await baseInstance.post<User>(`/profile`);
    return res.data;
}

export async function useGetIZUser() {
    const res = await baseInstance.get<{izus: IZUs[]}>(`/izus`);
    return res.data;
}