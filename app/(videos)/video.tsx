import { Entypo, Feather } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Pressable } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { router } from "expo-router";

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

  const handleDownload = (video: any) => {
    console.log(`Downloading: ${video.title}`);
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
              <TouchableOpacity onPress={handleDownload}>
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
