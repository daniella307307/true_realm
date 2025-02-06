import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  Pressable,
  Alert,
  FlatList,
  Image,
} from "react-native";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { router } from "expo-router";
import { Text } from "~/components/ui/text";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { PermissionStatus } from "expo-media-library";
import Svg, { Circle } from "react-native-svg";
import { useTranslation } from "react-i18next";

const VideoScreen = () => {
  const { t } = useTranslation();
  const [downloadProgress, setDownloadProgress] = useState<{
    [key: number]: number;
  }>({});
  const [downloading, setDownloading] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [downloaded, setDownloaded] = useState<{ [key: number]: boolean }>({});
  const [downloadResumables, setDownloadResumables] = useState<{
    [key: number]: FileSystem.DownloadResumable | null;
  }>({});

  const videos = [
    {
      id: 1,
      title: "Helping Family Matters",
      source: "https://www.w3schools.com/html/mov_bbb.mp4",
      description:
        "This video provides deep insights into how family dynamics influence individual well-being. It explores the importance of effective communication, mutual respect, and shared responsibilities in building a strong family unit. Through real-life examples and expert opinions, viewers will learn strategies for resolving conflicts, fostering emotional intelligence, and maintaining healthy relationships. The video also sheds light on the psychological impact of family conflicts and offers solutions to strengthen family bonds through meaningful conversations and active listening. Whether you're a parent, sibling, or relative, this resource serves as an essential guide to understanding and navigating family matters in a supportive and constructive manner.",
    },
    {
      id: 2,
      title: "Family Union Help",
      source: "https://www.w3schools.com/html/mov_bbb.mp4",
      description:
        "Family unions are crucial for maintaining emotional and social connections among relatives. This video explores the significance of regular family gatherings, traditions, and shared activities in fostering unity and belonging. Experts discuss the psychological benefits of reconnecting with extended family members and how it contributes to mental well-being. Additionally, practical tips on organizing successful family reunions, managing conflicts, and ensuring inclusivity are provided. The video highlights cultural traditions that emphasize the importance of togetherness and offers actionable steps to create memorable and meaningful family experiences.",
    },
    {
      id: 3,
      title: "Family Gathering",
      source: "https://www.w3schools.com/html/mov_bbb.mp4",
      description:
        "Family gatherings are special occasions that bring loved ones together to celebrate, share stories, and create lasting memories. This video showcases the joy and warmth of family reunions, highlighting the importance of bonding over food, music, and laughter. Viewers will learn about the cultural significance of family gatherings and the role they play in preserving traditions and strengthening relationships. Experts provide insights on the psychological benefits of socializing with family members and offer advice on overcoming common challenges during family events. Whether it's a holiday celebration or a casual get-together, this resource inspires viewers to cherish their family connections and create meaningful experiences together.",
    },
    {
      id: 4,
      title: "Helping Children",
      source: "https://www.w3schools.com/html/mov_bbb.mp4",
      description:
        "Helping children navigate the complexities of family life is essential for their emotional and social development. This video offers practical tips and expert advice on supporting children through various life stages, from infancy to adolescence. Viewers will learn about effective parenting strategies, communication techniques, and conflict resolution skills to nurture healthy family relationships. The video addresses common challenges faced by children and parents, such as sibling rivalry, academic pressure, and emotional distress, and provides guidance on fostering resilience and empathy. By promoting open dialogue and understanding within the family, viewers can create a supportive environment that promotes children's well-being and growth.",
    },
  ];

  useEffect(() => {
    const checkDownloads = async () => {
      let downloadStatus: { [key: number]: boolean } = {};
      for (const video of videos) {
        const filePath = `${FileSystem.documentDirectory}${video.title}.mp4`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        downloadStatus[video.id] = fileInfo.exists;
      }
      setDownloaded(downloadStatus);
    };
    checkDownloads();
  }, []);

  const handleDownload = async (video: any) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== PermissionStatus.GRANTED) {
        Alert.alert("Permission Required", "Please grant storage permissions.");
        return;
      }

      const downloadPath = `${FileSystem.documentDirectory}${video.title}.mp4`;

      const fileInfo = await FileSystem.getInfoAsync(downloadPath);
      if (fileInfo.exists) {
        Alert.alert("Already Downloaded", "This video is already saved.");
        return;
      }

      setDownloading((prev) => ({ ...prev, [video.id]: true }));

      const downloadResumable = FileSystem.createDownloadResumable(
        video.source,
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

      Alert.alert("Download Complete", `Video saved to: ${result.uri}`);
    } catch (error) {
      console.error("Download failed:", error);
      setDownloading((prev) => ({ ...prev, [video.id]: false }));
      setDownloadProgress((prev) => ({ ...prev, [video.id]: 0 }));
      Alert.alert(
        "Download Failed",
        "An error occurred while downloading the video."
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

  return (
    <View className="flex-1 p-4 bg-background">
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(videos)/${item.id}`)}
            className="p-4 border flex flex-row justify-between bg-white border-[#0000001A] items-center rounded-xl w-full mb-4"
          >
            <View className="flex-row gap-x-4">
              <TabBarIcon name="video" family="Entypo" />
              <View className="w-3/4">
                <Text className="text-lg font-semibold flex-wrap w-full">
                  {item.title}
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
                      />
                      <Text className="text-gray-500 font-semibold text-xs/1">
                        {t("Video.downloaded")}
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
                    stroke="#A23A91"
                    strokeWidth="2"
                    fill="none"
                  />
                  <Circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#808080"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="65"
                    strokeDashoffset={downloadProgress[item.id]}
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
            ) : (
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
            )}
          </Pressable>
        )}
      />
    </View>
  );
};

export default VideoScreen;
