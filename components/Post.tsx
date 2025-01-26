import React from "react";
import { View, Text, Image, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ReportModal } from "./modals/ReportModal";

interface PostProps {
  user: {
    avatar: string;
    title: string;
  };
  time: string;
  content: string;
  comments: Comment[];
}

interface Comment {
  user: {
    avatar: string;
    title: string;
  };
  time: string;
  content: string;
}

const Post: React.FC<PostProps> = ({ user, time, content, comments }) => {
  const [isModalVisible, setModalVisible] = React.useState(false);

  const toggleReportModal = () => setModalVisible((prev) => !prev);

  const renderComment = ({ item }: { item: Comment }) => (
    <Post
      user={item.user}
      time={item.time}
      content={item.content}
      comments={[]}
    />
  );

  return (
    <View className="p-4 rounded-lg border-b border-gray-200">
      <View className="flex-row items-center mb-2">
        <Image source={{ uri: user.avatar }} className="w-10 h-10 rounded-full" />
        <View className="ml-3">
          <Text className="font-semibold">{user.title}</Text>
          <Text className="text-sm text-gray-500">{time}</Text>
        </View>
        <TouchableOpacity onPress={toggleReportModal} className="ml-auto">
          <Ionicons name="ellipsis-vertical" size={24} color="gray" />
        </TouchableOpacity>
      </View>

      <Text className="text-base text-gray-800 mb-4">{content}</Text>

      {comments.length > 0 && (
        <View className="ml-4 border-t border-gray-200 pt-4">
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item, index) => index.toString()}
          />
        </View>
      )}

      {isModalVisible && <ReportModal onClose={toggleReportModal} />}
    </View>
  );
};

export default Post;
