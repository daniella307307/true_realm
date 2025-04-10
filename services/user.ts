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

export async function requestPasswordReset(identifier: string) {
  const res = await baseInstance.post<IResponse<{}>>(`/user/reset-password`, {
    identifier,
  });
  console.log(res.data);
  return res.data;
}

export async function verifyPasswordReset(identifier: string, verification_code: string) {
  const res = await baseInstance.post<ILoginResponse>(`/user/verify-reset-code`, {
    identifier,
    verification_code,
  });
  return res.data;
}
