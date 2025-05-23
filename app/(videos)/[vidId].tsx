import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import * as FileSystem from "expo-file-system";
import { useVideo } from "~/services/useVideo";

const VideoIndexScreen = () => {
  const { vidId } = useLocalSearchParams();
  const videoId = typeof vidId === 'string' ? vidId : Array.isArray(vidId) ? vidId[0] : undefined;
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [videoSource, setVideoSource] = useState<string>("");
  const [isLocal, setIsLocal] = useState(false);
  
  const { 
    data: video, 
    isLoading, 
    isError, 
    refetch
  } = useVideo(Number(videoId));

  const player = useVideoPlayer(videoSource, (playerInstance) => {
    if (playerInstance) {
      playerInstance.loop = true;
    }
  });

  useEffect(() => {
    if (videoSource) {
      setPlayerLoading(false);
    }
  }, [videoSource, player]);

  useEffect(() => {
    const checkLocalVideo = async () => {
      if (!video) return;
      
      const localPath = `${FileSystem.documentDirectory}${video.name}.mp4`;
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      
      if (fileInfo.exists) {
        setVideoSource(localPath);
        setIsLocal(true);
      } else {
        setVideoSource(`https://sugiramuryango.project.co.rw/videos/${video.file_path}`);
        setIsLocal(false);
      }
    };

    checkLocalVideo();
  }, [video]);

  const togglePlayPause = () => {
    if (isPlaying) {
      player?.pause();
    } else {
      player?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <HeaderNavigation
          showLeft={true}
          showRight={true}
          title={t("Videos.single_video")}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#A23A91" />
          <Text className="mt-4 text-gray-600">{t("Videos.loading_video")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <HeaderNavigation
          showLeft={true}
          showRight={true}
          title={t("Videos.single_video")}
        />
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-xl text-red-500 mb-4">{t("Videos.error")}</Text>
          <Text className="text-gray-600 text-center mb-8">{t("Videos.fetchError")}</Text>
          <TouchableOpacity 
            onPress={() => refetch()} 
            className="bg-primary px-6 py-3 rounded-full"
          >
            <Text className="text-white font-semibold">{t("Common.try_again")}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="mt-4 px-6 py-3"
          >
            <Text className="text-primary font-semibold">{t("Common.go_back")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!video) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <HeaderNavigation
          showLeft={true}
          showRight={true}
          title={t("Videos.single_video")}
        />
        <View className="flex-1 items-center justify-center">
          <Text className="text-xl text-red-500">{t("Videos.not_found")}</Text>
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="mt-4 px-6 py-3"
          >
            <Text className="text-primary font-semibold">{t("Common.go_back")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("Videos.single_video")}
      />
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        className="p-4 px-6"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
      >
        <View className="w-full h-56 rounded-lg overflow-hidden bg-gray-100">
          {playerLoading && (
            <View className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <ActivityIndicator size="large" color="#A23A91" />
              <Text className="mt-2 text-gray-600">{t("Videos.loading")}</Text>
            </View>
          )}
          {player && (
            <VideoView
              player={player}
              className="w-full h-full"
              allowsFullscreen
              allowsPictureInPicture
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#000",
              }}
            />
          )}
          <TouchableOpacity
            onPress={togglePlayPause}
            className="absolute top-4 right-4 bg-white/80 px-4 py-2 rounded-full z-20"
          >
            <Text className="font-semibold">
              {isPlaying ? t("Videos.pauseVideo") : t("Videos.playVideo")}
            </Text>
          </TouchableOpacity>
          {isLocal && (
            <View className="absolute top-4 left-4 bg-green-500/80 px-4 py-2 rounded-full z-20">
              <Text className="font-semibold text-white">{t("Videos.downloaded")}</Text>
            </View>
          )}
        </View>
        <Text className="text-xl font-bold text-gray-800 mt-4">
          {video.name}
        </Text>
        <Text className="text-gray-600 mt-2 text-base">
          {video.description}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VideoIndexScreen;
