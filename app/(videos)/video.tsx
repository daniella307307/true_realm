import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  Pressable,
  Alert,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { router } from "expo-router";
import { Text } from "~/components/ui/text";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { PermissionStatus } from "expo-media-library";
import Svg, { Circle } from "react-native-svg";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";
import { IVideo } from "~/services/videos";
import { useVideos } from "~/services/useVideo";

const VideoScreen = () => {
  const { t } = useTranslation();
  const baseUrl = process.env.EXPO_PUBLIC_API_URL + "/videos/";
  const { data: videos = [], isLoading, isError, error, refetch } = useVideos();
  // console.log("videos", JSON.stringify(videos, null, 2));
  const [downloadProgress, setDownloadProgress] = useState<{
    [key: number]: number;
  }>({});
  const [downloading, setDownloading] = useState<{ [key: number]: boolean }>({});
  const [downloaded, setDownloaded] = useState<{ [key: number]: boolean }>({});
  const [downloadResumables, setDownloadResumables] = useState<{
    [key: number]: FileSystem.DownloadResumable | null;
  }>({});
  const [currentTab, setCurrentTab] = useState<"All" | "Downloaded">("All");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const checkDownloads = async () => {
      let downloadStatus: { [key: number]: boolean } = {};
      for (const video of videos) {
        const filePath = `${FileSystem.documentDirectory}${video.name}.mp4`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        downloadStatus[video.id] = fileInfo.exists;
      }
      setDownloaded(downloadStatus);
    };
    
    if (videos.length > 0) {
      checkDownloads();
    }
  }, [videos]);

  const handleDownload = async (video: IVideo) => {
    const videoSource = `${baseUrl}${video.file_path}`;
    if (!videoSource) {
      console.log("Video source not found", video);
      Alert.alert(t("Videos.error"), t("Videos.downloadError"));
      return;
    }
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== PermissionStatus.GRANTED) {
        Alert.alert(t("Videos.permissionRequired"), t("Videos.permissionRequired"));
        return;
      }

      const downloadPath = `${FileSystem.documentDirectory}${video.name}.mp4`;

      const fileInfo = await FileSystem.getInfoAsync(downloadPath);
      if (fileInfo.exists) {
        Alert.alert(t("Videos.alreadyDownloaded"), t("Videos.alreadyDownloaded"));
        return;
      }

      setDownloading((prev) => ({ ...prev, [video.id]: true }));

      const downloadResumable = FileSystem.createDownloadResumable(
        videoSource,
        downloadPath,
        {},
        (progress) => {
          const progressPercent =
            (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) *
            100;
          setDownloadProgress((prev) => ({
            ...prev,
            [video.id]: progressPercent,
          }));
        }
      );

      setDownloadResumables((prev) => ({
        ...prev,
        [video.id]: downloadResumable,
      }));

      const result = await downloadResumable.downloadAsync();
      if (!result) return;

      const asset = await MediaLibrary.createAssetAsync(result.uri);
      await MediaLibrary.createAlbumAsync("Downloads", asset, false);

      setDownloading((prev) => ({ ...prev, [video.id]: false }));
      setDownloadProgress((prev) => ({ ...prev, [video.id]: 0 }));
      setDownloaded((prev) => ({ ...prev, [video.id]: true }));

      Alert.alert(t("Videos.downloadComplete"), t("Videos.downloadComplete"));
    } catch (error) {
      console.error("Download failed:", error);
      setDownloading((prev) => ({ ...prev, [video.id]: false }));
      setDownloadProgress((prev) => ({ ...prev, [video.id]: 0 }));
      Alert.alert(
        t("Videos.error"),
        t("Videos.downloadError")
      );
    }
  };

  const handleCancelDownload = (videoId: number) => {
    if (downloadResumables[videoId]) {
      downloadResumables[videoId]?.pauseAsync();
    }
    setDownloading((prev) => ({ ...prev, [videoId]: false }));
    setDownloadProgress((prev) => ({ ...prev, [videoId]: 0 }));
  };

  const handleTabSwitch = (tab: "All" | "Downloaded") => {
    setCurrentTab(tab);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Filter videos based on the current tab
  const filteredVideos =
    currentTab === "All"
      ? videos
      : videos.filter((video) => downloaded[video.id]);

  if (isLoading && videos.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <HeaderNavigation
          showLeft={true}
          showRight={true}
          title={t("Videos.title")}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#A23A91" />
          <Text className="mt-4 text-gray-600">{t("Videos.loading_data", "Loading videos...")}</Text>
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
          title={t("Videos.title")}
        />
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-xl text-red-500 mb-4">{t("Videos.error", "Error loading videos")}</Text>
          <Text className="text-gray-600 text-center mb-8">
            {error instanceof Error ? error.message : t("Videos.unknown_error", "An unknown error occurred")}
          </Text>
          <TouchableOpacity 
            onPress={() => refetch()} 
            className="bg-primary px-6 py-3 rounded-full"
          >
            <Text className="text-white font-semibold">{t("Common.try_again", "Try Again")}</Text>
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
        title={t("Videos.title")}
      />
      <View className="p-4">
        <View className="flex flex-row justify-between items-center p-2 rounded-full my-4 bg-gray-100">
          <TouchableOpacity
            onPress={() => handleTabSwitch("All")}
            className={`flex-1 p-4 items-center ${
              currentTab === "All" ? "bg-white" : "bg-transparent"
            } rounded-full`}
          >
            <Text
              className={`text-sm font-semibold ${
                currentTab === "All" ? "text-primary" : "text-gray-800"
              }`}
            >
              {t("History.all")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleTabSwitch("Downloaded")}
            className={`flex-1 p-4 items-center ${
              currentTab === "Downloaded" ? "bg-white" : "bg-transparent"
            } rounded-full`}
          >
            <Text
              className={`text-sm font-semibold ${
                currentTab === "Downloaded" ? "text-primary" : "text-gray-800"
              }`}
            >
              {t("Videos.downloaded")}
            </Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={filteredVideos}
          keyExtractor={(item) => item.id.toString()}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={() => (
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-gray-500">
                {currentTab === "All" 
                  ? t("Videos.no_videos") 
                  : t("Videos.no_downloaded")}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(videos)/${item.id}`)}
              className="p-4 border flex flex-row justify-between bg-white border-[#0000001A] items-center rounded-xl w-full mb-4"
            >
              <View className="flex-row gap-x-4">
                <TabBarIcon name="video" family="Entypo" />
                <View className="w-3/4">
                  <Text className="text-lg font-semibold flex-wrap w-full">
                    {item.name}
                  </Text>
                  <Text className="text-gray-500 text-xs/1 line-clamp-2 line py-2">
                    {item.description}
                  </Text>
                  <View className="flex-row gap-x-2 items-center justify-start">
                    {downloaded[item.id] ? (
                      <>
                        <TabBarIcon
                          name="checkmark-done-outline"
                          family="Ionicons"
                          size={20}
                          color="#4CAF50"
                        />
                        <Text className="text-green-600 font-semibold text-xs/1">
                          {t("Videos.downloaded")}
                        </Text>
                      </>
                    ) : null}
                  </View>
                </View>
              </View>
              {downloading[item.id] ? (
                <View className="flex-col items-center gap-2">
                  <Svg height={24} width={24}>
                    <Circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#808080"
                      strokeWidth="2"
                      fill="none"
                    />
                    <Circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#A23A91"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="65"
                      strokeDashoffset={
                        65 - (downloadProgress[item.id] || 0) * 0.65
                      }
                    />
                  </Svg>
                  <TouchableOpacity
                    onPress={() => handleCancelDownload(item.id)}
                    className="bg-red-500 rounded-full h-8 w-8 flex flex-col justify-center items-center"
                  >
                    <TabBarIcon
                      name="close-circle-outline"
                      family="Ionicons"
                      size={24}
                      color="white"
                    />
                  </TouchableOpacity>
                </View>
              ) : !downloaded[item.id] ? (
                <TouchableOpacity
                  onPress={() => handleDownload(item)}
                  className="bg-transparent rounded-full h-8 w-8 flex flex-col justify-center items-center"
                >
                  <TabBarIcon
                    name="download"
                    family="Feather"
                    color="#A23A91"
                    size={20}
                  />
                </TouchableOpacity>
              ) : (
                <TabBarIcon
                  name="check-circle"
                  family="Feather"
                  color="#4CAF50"
                  size={20}
                />
              )}
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

export default VideoScreen;
