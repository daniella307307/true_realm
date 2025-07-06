import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { useGetNotifications } from "~/services/notifications";
import HeaderNavigation from "~/components/ui/header";
import { INotifications } from "~/types";
import EmptyDynamicComponent from "~/components/EmptyDynamic";

const NotificationsScreen = () => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const { notifications, isLoading, refresh } = useGetNotifications();

  console.log("Hello Notifications");
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const renderNotificationItem = ({ item }: { item: INotifications }) => {
    const formattedDate = item.created_at
      ? format(new Date(item.created_at), "MMM dd, yyyy")
      : "N/A";

    return (
      <TouchableOpacity
        className="mb-4 bg-gray-100 border border-gray-200 rounded-xl"
        onPress={() =>
          router.push({
            // @ts-ignore
            pathname: `/(notifications)/${item.survey_result?.id}`,
            params: {
              project_module_id: item.form_data?.project_module_id,
              survey_id: item.form_data?.survey_id,
              _id: item.survey_result?.id,
              itemType: "notification",
              id: item.id,
            },
          })
        }
      >
        <>
          <View className="flex-1 p-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-lg font-semibold">{item.survey?.name}</Text>
              <View
                className={`px-2 py-1 rounded-full ${
                  item.status === "resolved" ? "bg-green-100" : "bg-yellow-100"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    item.status === "resolved"
                      ? "text-green-800"
                      : "text-yellow-800"
                  }`}
                >
                  {item.status
                    ? t(`Notifications.${item.status}`)
                    : t("Notifications.pending")}
                </Text>
              </View>
            </View>

            <View className="mb-2">
              <Text className="text-gray-600">{item.comment}</Text>
            </View>

            <View className="flex-row justify-between items-center mt-2">
              <Text className="text-gray-500 text-sm">{formattedDate}</Text>
              <Text className="text-gray-500 font-bold text-sm">
                {t("Notifications.by")}: {item.user?.name}
              </Text>
            </View>

            {item.followup_date && (
              <View className="mt-2 bg-white p-2 rounded-md">
                <Text className="text-blue-800 text-sm">
                  {t("Notifications.followup_date")}:{" "}
                  {format(new Date(item.followup_date), "MMM dd, yyyy")}
                </Text>
              </View>
            )}
          </View>
        </>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("Notifications.title")}
      />

      {isLoading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : (
        <FlatList
          data={notifications as unknown as INotifications[]}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => `${item.id}-${item.created_at}`}
          contentContainerClassName="p-4"
          ListEmptyComponent={
            <EmptyDynamicComponent
              message={t("Notifications.no_notifications")}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0000ff"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default NotificationsScreen;
