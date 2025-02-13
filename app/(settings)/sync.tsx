import { View, Text, TouchableOpacity, FlatList, Alert } from "react-native";
import { useMemo } from "react";
import { TabBarIcon } from "~/components/ui/tabbar-icon";

interface SyncItem {
  key: string;
  name: string;
  status: string;
}

const SyncPage = () => {
  //   const { statuses = [], retryRefetch } = useRefetchStatuses(services);
  const services = useMemo(
    () => [
      {
        key: "posts",
        name: "Community Posts",
        status: "Success",
      },
      {
        key: "comments",
        name: "Community Comments",
        status: "Success",
      },
      {
        key: "users",
        name: "Users",
        status: "Failed",
      },
      {
        key: "families",
        name: "Get Families",
        status: "Success",
      },
      {
        key: "modules",
        name: "Get Modified Modules",
        status: "Success",
      },
      {
        key: "forms",
        name: "Get Forms",
        status: "Success",
      },
    ],
    []
  );
  const renderItem = ({ item }: { item: SyncItem }) => (
    <View className="p-4 border-b bg-white flex flex-row justify-between border-gray-300">
      <View>
        <Text className="text-lg font-bold">{item.name}</Text>
        <Text className={
            item.status === "Success"
                ? "text-green-500"
                : item.status === "Failed"
                ? "text-red-500"
                : "text-yellow-500"
        }>{item.status}</Text>
      </View>
      {item.status !== "Success" && (
        <TouchableOpacity
          className=" bg-slate-100 flex items-center justify-center h-12 w-12 flex-col rounded-full"
            onPress={() => Alert.alert("Retry", "Are you sure you want to retry?", [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Retry",
                    onPress: () => console.log("Retry"),
                },
                ])
            }
        >
          <TabBarIcon name="refresh" family="MaterialIcons" size={24} color="#71717A" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View>
      <FlatList
        data={services as SyncItem[]}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
      />
    </View>
  );
};

export default SyncPage;
