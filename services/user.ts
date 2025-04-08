import { ILoginDetails, ILoginResponse, IResponse, IZUs, User } from "~/types";
import { baseInstance } from "~/utils/axios";

export async function userLogout() {
  const res = await baseInstance.post<IResponse<{}>>(`/logout`);
  return res.data;
}

export async function userLogin(values: ILoginDetails) {
  const res = await baseInstance.post<ILoginResponse>(
    "/login",
    { identifier: values.identifier, password: values.password },
    {
      headers: {
        Authorization: undefined,
      },
    }
  );
  return res.data;
}

export async function useGetCurrentLoggedInProfile() {
  const res = await baseInstance.post<User>(`/profile`);
  return res.data;
}

export async function useGetIZUser() {
  const res = await baseInstance.get<{ izus: IZUs[] }>(`/izus`);
  return res.data;
}

export async function requestPasswordReset(identifier: string) {
  const res = await baseInstance.post<IResponse<{}>>(`/user/reset-password`, {
    identifier,
  });
  console.log(res.data);
  return res.data;
}

export async function verifyPasswordReset(identifier: string, verificationcode: string) {
  const res = await baseInstance.post<IResponse<{}>>(`/user/verify-code`, {
    identifier,
    verificationcode,
  });
  return res.data;
}
