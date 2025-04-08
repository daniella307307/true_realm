import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";

const VideoIndexScreen = () => {
  const { vidId } = useLocalSearchParams();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [player, setPlayer] = useState<ReturnType<
    typeof useVideoPlayer
  > | null>(null);
  const videos = [
    {
      id: 1,
      title: "Language Development",
      path: "1733815813_Language%20Development.mp4",
      description:
        "This video provides deep insights into how family dynamics influence individual well-being. It explores the importance of effective communication, mutual respect, and shared responsibilities in building a strong family unit. Through real-life examples and expert opinions, viewers will learn strategies for resolving conflicts, fostering emotional intelligence, and maintaining healthy relationships. The video also sheds light on the psychological impact of family conflicts and offers solutions to strengthen family bonds through meaningful conversations and active listening. Whether you're a parent, sibling, or relative, this resource serves as an essential guide to understanding and navigating family matters in a supportive and constructive manner.",
    },
    {
      id: 2,
      title: "Father Engagement.mp4",
      path: "Father Engagement.mp4",
      description:
        "Family unions are crucial for maintaining emotional and social connections among relatives. This video explores the significance of regular family gatherings, traditions, and shared activities in fostering unity and belonging. Experts discuss the psychological benefits of reconnecting with extended family members and how it contributes to mental well-being. Additionally, practical tips on organizing successful family reunions, managing conflicts, and ensuring inclusivity are provided. The video highlights cultural traditions that emphasize the importance of togetherness and offers actionable steps to create memorable and meaningful family experiences.",
    },
    {
      id: 3,
      title: "Observing Proper Nutritional Practices",
      path: "Observing%20Proper%20Nutritional%20Practices.mp4",
      description:
        "Family gatherings are special occasions that bring loved ones together to celebrate, share stories, and create lasting memories. This video showcases the joy and warmth of family reunions, highlighting the importance of bonding over food, music, and laughter. Viewers will learn about the cultural significance of family gatherings and the role they play in preserving traditions and strengthening relationships. Experts provide insights on the psychological benefits of socializing with family members and offer advice on overcoming common challenges during family events. Whether it's a holiday celebration or a casual get-together, this resource inspires viewers to cherish their family connections and create meaningful experiences together.",
    },
    {
      id: 4,
      title: "Positive Parenting",
      path: "Positive%20Parenting%20-26%20July.mp4",
      description:
        "Helping children navigate the complexities of family life is essential for their emotional and social development. This video offers practical tips and expert advice on supporting children through various life stages, from infancy to adolescence. Viewers will learn about effective parenting strategies, communication techniques, and conflict resolution skills to nurture healthy family relationships. The video addresses common challenges faced by children and parents, such as sibling rivalry, academic pressure, and emotional distress, and provides guidance on fostering resilience and empathy. By promoting open dialogue and understanding within the family, viewers can create a supportive environment that promotes children's well-being and growth.",
    },
    {
      id: 5,
      title: "Stress Management & Conflict Resolution Techniques",
      path: "Positive%20Parenting%20-26%20July.mp4",
      description:
        "Helping children navigate the complexities of family life is essential for their emotional and social development. This video offers practical tips and expert advice on supporting children through various life stages, from infancy to adolescence. Viewers will learn about effective parenting strategies, communication techniques, and conflict resolution skills to nurture healthy family relationships. The video addresses common challenges faced by children and parents, such as sibling rivalry, academic pressure, and emotional distress, and provides guidance on fostering resilience and empathy. By promoting open dialogue and understanding within the family, viewers can create a supportive environment that promotes children's well-being and growth.",
    },
  ];

  const video = videos.find((v) => v.id === Number(vidId));

  const videoPlayer = useVideoPlayer(
    `https://continuous.sugiramuryango.org.rw/public/videos/` + video?.path ||
      "",
    (playerInstance) => {
      playerInstance.loop = true;
    }
  );

  useEffect(() => {
    if (videoPlayer) {
      setPlayer(videoPlayer);
      setIsLoading(false);
    }
  }, [videoPlayer]);

  const togglePlayPause = () => {
    if (isPlaying) {
      player?.pause();
    } else {
      player?.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (!video) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-xl text-red-500">Video not found!</Text>
      </View>
    );
  }

  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("Videos.single_video")}
      />
      <ScrollView showsVerticalScrollIndicator={false} className="p-4 px-6">
        <View className="w-full h-56 rounded-lg overflow-hidden bg-gray-100">
          {isLoading && (
            <View className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <ActivityIndicator size="large" color="#0000ff" />
              <Text className="mt-2 text-gray-600">Loading video...</Text>
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
              {isPlaying ? "Pause" : "Play"}
            </Text>
          </TouchableOpacity>
        </View>
        <Text className="text-xl font-bold text-gray-800 mt-4">
          {video.title}
        </Text>
        <Text className="text-gray-600 mt-2 text-base">
          {video.description}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VideoIndexScreen;
