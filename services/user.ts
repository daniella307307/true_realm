import { ILoginDetails, ILoginResponse, IResponse, User } from "~/types";
import { baseInstance } from "~/utils/axios";

export async function userLogout() {
  const res = await baseInstance.post<IResponse<{}>>(`/logout`);
  return res.data;
}

export async function userLogin(values: ILoginDetails) {
  console.log("Sending login request with data:", { identifier: values.identifier });
  const res = await baseInstance.post<ILoginResponse>(
    "/login",
    { identifier: values.identifier, password: values.password },
    {
      headers: {
        Authorization: undefined,
      },
    }
  );
  console.log("Login API raw response:", JSON.stringify({
    token: res.data.token,
    name: res.data.name,
    role: res.data.role,
    user: {
      id: res.data.user?.id,
      name: res.data.user?.name,
      email: res.data.user?.email,
      position: res.data.user?.position,
    },
  }, null, 2));
  return res.data;
}

export async function useGetCurrentLoggedInProfile() {
  console.log("Fetching current user profile...");
  try {
    const res = await baseInstance.post<User>(`/profile`);
    console.log("Profile API headers:", JSON.stringify(res.config?.headers, null, 2));
    console.log("Profile API response status:", res.status);
    console.log("Profile user email from API:", res.data.email);
    return res.data;
  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error;
  }
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
