import Toast from "react-native-toast-message";
import { ILoginDetails, ILoginResponse, IResponse, User } from "~/types";
import { baseInstance } from "~/utils/axios";
import { fetchWithRetry, checkNetworkConnection, showNetworkErrorAlert } from "~/utils/networkHelpers";

export async function userLogout(sqlite: any | null) {
  // Proceed with the logout API call
  const res = await baseInstance.post<IResponse<{}>>(`/auth/logout`);
  return res.data;
}

export async function userLogin(values: ILoginDetails) {
  console.log("Sending login request with data:", { email: values.identifier });
  
  // Check network connection before attempting login
  const isConnected = await checkNetworkConnection();
  if (!isConnected) {
    console.log("No network connection detected. Cannot login.");
    showNetworkErrorAlert("Cannot login. Please check your internet connection and try again.");
    throw new Error("No network connection");
  }
  
  try {
    // Use fetchWithRetry for better reliability
    const response = await fetchWithRetry(() => 
      baseInstance.post<ILoginResponse>(
        "/auth/login",
        { email: values.identifier, password: values.password },
        {
          headers: {
            Authorization: undefined,
          },
        }
      )
    );
    
    console.log("Login API raw response:", JSON.stringify({
      token: response.data.token,
      name: response.data.name,
      role: response.data.role,
      user: {
        id: response.data.user?.id,
        name: response.data.user?.name,
        email: response.data.user?.email,
        position: response.data.user?.position,
      },
    }, null, 2));
    
    return response.data;
  } catch (error) {

    console.error("Login failed after retries:", error);
    throw error;
  }
}

// FIXED: Removed "use" prefix - this is NOT a Hook, it's a regular async function
// export async function getCurrentLoggedInProfile(id:string) {
//   console.log("Fetching current user profile...");
//   try {
//     // Use fetchWithRetry for better reliability
//     const res = await fetchWithRetry(() => baseInstance.get<User>(`/users/${id}`));
    
//     console.log("Profile API headers:", JSON.stringify(res.config?.headers, null, 2));
//     console.log("Profile API response status:", res.status);
//     console.log("Profile user email from API:", res.data.email);
//     return res.data;
//   } catch (error) {
//     console.error("Error fetching profile:", error);
//     throw error;
//   }
// }

export async function requestPasswordReset(id: string) {
  try {
    const res = await fetchWithRetry(() => 
      baseInstance.post<IResponse<{}>>(`/users/${id}/reset-password`)
    );
    console.log(res.data);
    return res.data;
  } catch (error) {
    console.error("Password reset request failed:", error);
    throw error;
  }
}

export async function verifyPasswordReset(email: string, verification_code: string) {
  try {
    const res = await fetchWithRetry(() =>
      baseInstance.post<ILoginResponse>(`/user/verify-reset-code`, {
        email,
        verification_code,
      })
    );
    return res.data;
  } catch (error) {
    console.error("Verification code validation failed:", error);
    throw error;
  }
}

export async function updatePassword(password: string, email: string): Promise<{ message: string }> {
  try {
    const res = await fetchWithRetry(() => 
      baseInstance.post<IResponse<{ message: string }>>(`/user/update-password`, { 
        password,
        email 
      })
    );
    console.log("Password update response:", res.data);
    // The message is directly in the response data
    return { message: res.data.message };
  } catch (error) {
    console.error("Password update failed:", error);
    throw error;
  }
}