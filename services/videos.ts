import { baseInstance } from "~/utils/axios";

export interface IVideo {
  id: number;
  name: string;
  file_path: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface IVideoResponse {
  data: IVideo[];
}

export async function fetchVideosFromRemote() {
  const res = await baseInstance.get<IVideoResponse>("/videos/helper");
  return res.data.data;
} 