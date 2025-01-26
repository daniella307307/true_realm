import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import Post from "~/components/Post";

const CommunityScreen: React.FC = () => {
  const posts = [
    {
      user: {
        avatar: "https://randomuser.me/api/portraits/men/1.jpg",
        title: "John Doe",
      },
      time: "2 hours ago",
      content: "This is a sample post content.",
      comments: [
        {
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
      user: {
        avatar: "https://randomuser.me/api/portraits/men/1.jpg",
        title: "John Doe",
      },
      time: "2 hours ago",
      content: "This is a sample post content.",
      comments: [
        {
          user: {
            avatar: "https://randomuser.me/api/portraits/women/1.jpg",
            title: "Jane Doe",
          },
          time: "1 hour ago",
          content: "Great post!",
        },
      ],
    },
  ];

  const renderPost = ({ item }: { item: any }) => {
    return (
      <Post
        user={item.user}
        time={item.time}
        content={item.content}
        comments={item.comments}
      />
    );
  };

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
      <TouchableOpacity
        onPress={() => console.log("Add new post")}
        className="absolute bottom-16 right-6 bg-primary rounded-full p-4"
      >
        <Ionicons name="pencil" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
};

export default CommunityScreen;
