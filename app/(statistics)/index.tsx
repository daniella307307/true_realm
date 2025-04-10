import { FlatList, Pressable, SafeAreaView, View, TextInput } from "react-native";
import { router } from "expo-router";
import { Text } from "~/components/ui/text";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import Skeleton from "~/components/ui/skeleton";
import HeaderNavigation from "~/components/ui/header";
import { useGetIzus } from "~/services/izus";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

interface IIzu {
  id: number;
  user_code: string;
  name: string;
  cohorts?: Array<{
    id: number;
    name: string;
  }>;
}

const StatisticsScreen = () => {
  const { t } = useTranslation();
  const [selectedIzu, setSelectedIzu] = useState<IIzu | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: storedIzus, isLoading } = useGetIzus();
  const filteredIzuMembers = storedIzus.filter((member) => {
    if (!searchQuery) return true;
    return member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           member.user_code.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSelectIzu = (izu: IIzu) => {
    setSelectedIzu(izu);
    router.push(`/${izu.id}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("StatisticsPage.statistics")}
      />
      <View className="flex-1 p-4 bg-white">
        <Text className="text-xl font-bold mb-4">
          {t("IzuMonitoringPage.all_izu")}
        </Text>

        {/* Selected IZU Input */}
        <TextInput
          className={`w-full px-4 py-4 border rounded-lg mb-2 ${
            selectedIzu ? "border-primary" : "border-[#E4E4E7]"
          } bg-white`}
          value={selectedIzu ? `${selectedIzu.id} - ${selectedIzu.name}` : ""}
          placeholder="Select an IZU"
          editable={false}
        />

        {/* Search Input */}
        <View className="flex-row items-center space-x-2 mb-4">
          <Ionicons name="search" size={20} color="#A0A3BD" className="mr-2" />
          <TextInput
            className="w-11/12 px-4 py-3 border rounded-lg border-[#E4E4E7] bg-white"
            placeholder={t("IzuMonitoringPage.search_izu")}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {isLoading ? (
          [1, 2, 3, 4].map((index) => <Skeleton key={index} />)
        ) : (
          <FlatList
            data={filteredIzuMembers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectIzu(item)}
                className={`p-4 border flex-row items-center justify-between mb-4 rounded-xl ${
                  selectedIzu?.id === item.id ? "border-primary" : "border-gray-200"
                }`}
              >
                <View className="flex-row items-center">
                  <Text className="text-lg font-semibold">{item.id}</Text>
                  <Text className="text-lg ml-2 font-semibold">
                    {item.name}
                  </Text>
                </View>
                <Pressable onPress={() => handleSelectIzu(item)}>
                  <TabBarIcon
                    name="arrow-down-left"
                    family="Feather"
                    size={24}
                    color="#71717A"
                  />
                </Pressable>
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default StatisticsScreen;
