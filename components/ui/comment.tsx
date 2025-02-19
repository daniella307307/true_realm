import React from "react";
import { View, Text, Image } from "react-native";

interface CommentProps {
  user: {
    avatar: string;
    title: string;
  };
  time: string;
  content: string;
}

const Comment: React.FC<CommentProps> = ({ user, time, content }) => {
  return (
    <View className="flex-row items-start p-3 border-b border-gray-200">
      <Image
        source={{ uri: user.avatar }}
        className="w-8 h-8 rounded-full mr-3"
      />
      <View className="flex-1">
        <Text className="font-semibold">{user.title}</Text>
        <Text className="text-gray-500 text-xs">{time}</Text>
        <Text className="mt-1">{content}</Text>
      </View>
    </View>
  );
};

export default Comment;
