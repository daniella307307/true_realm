import { View, Text } from "react-native";
import React from "react";
import { useAuth } from "~/lib/hooks/useAuth";

const AccountScreen = () => {
  const { user } = useAuth({});

  return (
    <View className="flex-1 bg-background p-4">
      <View className="bg-white p-4 rounded-lg shadow-md">
        <Text className="text-lg font-semibold mb-2">Account Details</Text>
        <View>
          <Text className="text-gray-600 mb-2">Name </Text>
          <Text className="text-gray-500 font-semibold bg-slate-100 p-4 rounded-xl mb-2">{user?.name} </Text>
        </View>
        {/* <Text className="text-gray-600">Email: {user}</Text> */}
      </View>
    </View>
  );
};

export default AccountScreen;
