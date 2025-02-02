import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  TouchableOpacity,
  View,
  Text,
  Image,
  Modal,
  TextInput,
  Button,
} from "react-native";
import { useRouter } from "expo-router";
import { TabBarIcon } from "~/components/ui/tabbar-icon";

const CommunityScreen: React.FC = () => {
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [reportText, setReportText] = useState("");
  const router = useRouter();
  const posts = [
    {
      id: 1,
      user: {
        avatar: "https://randomuser.me/api/portraits/men/1.jpg",
        title: "John Doe",
      },
      time: "2 hours ago",
      content: "This is a sample post content.",
      comments: [
        {
          id: 1,
          user: {
            avatar: "https://randomuser.me/api/portraits/women/1.jpg",
            title: "Jane Doe",
          },
          time: "1 hour ago",
          content: "Great post!",
        },
      ],
    },
    {
      id: 2,
      user: {
        avatar: "https://randomuser.me/api/portraits/men/2.jpg",
        title: "Mike Smith",
      },
      time: "3 hours ago",
      content: "Another interesting post here.",
      comments: [
        {
          id: 2,
          user: {
            avatar: "https://randomuser.me/api/portraits/women/2.jpg",
            title: "Anna Johnson",
          },
          time: "30 minutes ago",
          content: "Nice thoughts!",
        },
      ],
    },
  ];

  const handlePostPress = (postId: number) => {
    setExpandedPost(expandedPost === postId ? null : postId);
  };

  const handleReportPress = () => {
    setModalVisible(true);
  };

  const handleSendReport = () => {
    console.log("Report Sent:", reportText);
    setModalVisible(false);
    setReportText("");
  };

  const renderPost = ({ item }: { item: any }) => {
    return (
      <View className="bg-white p-4 m-2 rounded-lg shadow">
        <TouchableOpacity onPress={() => handlePostPress(item.id)}>
          {/* Post Header */}
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Image
                source={{ uri: item.user.avatar }}
                className="w-10 h-10 rounded-full"
              />
              <View className="ml-3">
                <Text className="font-semibold">{item.user.title}</Text>
                <Text className="text-gray-500 text-sm">{item.time}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleReportPress}
              className="h-10 w-10 bg-gray-50 flex-row justify-center items-center rounded-xl"
            >
              <TabBarIcon
                name="ellipsis-vertical"
                family="FontAwesome6"
                color="#000"
                size={16}
              />
            </TouchableOpacity>
          </View>

          {/* Post Content */}
          <Text className="text-base">{item.content}</Text>
        </TouchableOpacity>

        {/* Show Comments if Expanded */}
        {expandedPost === item.id && (
          <View className="mt-3 bg-gray-100 p-2 rounded-lg">
            {item.comments.map((comment: any) => (
              <View key={comment.id} className="flex-row items-start mb-2">
                <Image
                  source={{ uri: comment.user.avatar }}
                  className="w-8 h-8 rounded-full"
                />
                <View className="ml-3">
                  <Text className="font-semibold">{comment.user.title}</Text>
                  <Text className="text-gray-500 text-xs">{comment.time}</Text>
                  <Text className="text-sm">{comment.content}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
      <TouchableOpacity
        onPress={() => router.push("/add-post")}
        className="absolute bottom-16 right-6 bg-primary rounded-full p-4"
      >
        <Ionicons name="pencil" size={24} color="white" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-6 rounded-lg w-4/5">
            <Text className="text-lg font-semibold mb-2">Report Issue</Text>
            <TextInput
              className={`w-full px-4 h-44 border border-[#E4E4E7] rounded-lg dark:text-white bg-white dark:bg-[#1E1E1E]`}
              placeholder={"Add your post description here"}
              value={reportText}
              onChangeText={(text: string) => setReportText(text)}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              onPress={handleSendReport}
              className="bg-primary p-4 rounded-lg flex-row items-center justify-center mt-4"
            >
              <Text className="ml-2 text-white font-semibold">Create Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CommunityScreen;
