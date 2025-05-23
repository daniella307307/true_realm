import { useQuery } from "@tanstack/react-query";
import { baseInstance } from "~/utils/axios";

interface IVideoDetailResponse {
  data: IVideo;
}

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
export function useVideos() {
  return useQuery({
    queryKey: ["videos"],
    queryFn: fetchVideosFromRemote,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function useVideo(id: number) {
  // Just return the video from the list
  const { data: videos } = useVideos();
  console.log("The videos are", videos);
  console.log("The id is", id);
  const video = videos?.find((video) => video.id === id);
  console.log("The video is", video);
  return {
    data: video,
    isLoading: !video,
    isError: false,
    error: null,
    refetch: () => {
      return {
        data: video,
        isLoading: !video,
      };
    },
  };
}
