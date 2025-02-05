import React from "react";
import { View, TouchableOpacity, Pressable, Alert, Platform } from "react-native";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { router } from "expo-router";
import { Text } from "~/components/ui/text";
import RNFS from "react-native-fs";
import { check, PERMISSIONS, request, RESULTS } from "react-native-permissions";

const VideoScreen = () => {
  const videos = [
    {
      id: 1,
      title: "Helping Family matters",
      source: "https://www.w3schools.com/html/mov_bbb.mp4",
    },
    {
      id: 2,
      title: "Family union help",
      source: "https://www.w3schools.com/html/movie.mp4",
    },
    {
      id: 3,
      title: "Family gathering",
      source: "https://www.w3schools.com/html/mov_bbb.mp4",
    },
    {
      id: 4,
      title: "Helping Children",
      source: "https://www.w3schools.com/html/movie.mp4",
    },
  ];

  const handleDownload = async (video: any) => {
    try {
      // Request storage permissions
      const permission =
        Platform.OS === "android"
          ? PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE
          : PERMISSIONS.IOS.MEDIA_LIBRARY;

      const status = await check(permission);

      if (status !== RESULTS.GRANTED) {
        const requestStatus = await request(permission);
        if (requestStatus !== RESULTS.GRANTED) {
          Alert.alert(
            "Permission Required",
            "Please grant storage permissions to download videos."
          );
          return;
        }
      }

      // Define the download path
      const downloadPath = `${RNFS.DownloadDirectoryPath}/${video.title}.mp4`;

      // Start the download
      const download = RNFS.downloadFile({
        fromUrl: video.source,
        toFile: downloadPath,
        progress: (res) => {
          const progressPercent = (res.bytesWritten / res.contentLength) * 100;
          console.log(`Download Progress: ${progressPercent.toFixed(2)}%`);
        },
      });

      // Wait for the download to complete
      await download.promise;

      Alert.alert(
        "Download Complete",
        `Video saved to: ${downloadPath}`,
        [{ text: "OK" }]
      );
      console.log(`Video downloaded to: ${downloadPath}`);
    } catch (error) {
      console.error("Download failed:", error);
      Alert.alert(
        "Download Failed",
        "An error occurred while downloading the video."
      );
    }
  };

  return (
    <View className="bg-background flex-1">
      <View className="flex-row flex-wrap justify-between p-6">
        {videos.map((vid, index) => (
          <Pressable
            key={index}
            onPress={() => router.push(`/(videos)/${vid.id}`)}
            className="flex flex-col bg-[#A23A910D] border border-[#0000001A] items-center gap-6 py-6 rounded-xl w-[48%] mb-4"
          >
            <View className="flex flex-row justify-between gap-x-12">
              <TabBarIcon name={"video"} family="Entypo" />
              <TouchableOpacity onPress={() => handleDownload(vid)}>
                <TabBarIcon name={"download"} family="Feather" />
              </TouchableOpacity>
            </View>
            <Text>
              <Text className="font-bold text-gray-500">{vid.title}</Text>
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

export default VideoScreen;