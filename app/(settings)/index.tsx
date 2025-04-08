import { View, Text, ScrollView, SafeAreaView } from "react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image } from "react-native";
import { useAuth } from "~/lib/hooks/useAuth";
import HeaderNavigation from "~/components/ui/header";

const SettingsScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth({});
  const parsedIncentives = user?.incentives ? JSON.parse(user.incentives) : [];

  type InfoItemProps = {
    label: string;
    value: string | string[];
    className?: string;
  };

  const InfoItem: React.FC<InfoItemProps> = ({ label, value, className }) => (
    <View className={`mb-4 ${className}`}>
      <Text className="text-gray-600">{label}</Text>
      {Array.isArray(value) ? (
        <View className="flex flex-row flex-wrap gap-2 mt-2">
          {value.map((item, index) => (
            <View key={index} className="flex flex-col items-center">
              <Text className="text-gray-500 font-semibold bg-slate-100 p-4 rounded-xl">
                {item}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-gray-500 font-semibold mt-2 bg-slate-100 p-4 rounded-xl">
          {value}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("SettingsPage.title")}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="bg-white p-4 rounded-lg shadow-md"
      >
        <Text className="text-lg font-semibold mb-2">
          {t("SettingsPage.account_details")}
        </Text>
        <View className="flex-row gap-x-2 items-center w-full">
          <Image
            source={{ uri: user.picture }}
            className="w-20 h-20 rounded-full"
          />
          <InfoItem
            label={t("SettingsPage.name")}
            value={user?.name || ""}
            className="max-w-fit"
          />
        </View>
        <InfoItem label={t("SettingsPage.email")} value={user?.email || ""} />
        <InfoItem
          label={t("SettingsPage.phone")}
          value={user?.telephone || ""}
        />
        <InfoItem
          label={t("SettingsPage.user_code")}
          value={user?.user_code || ""}
        />
        <InfoItem
          label={t("SettingsPage.date_of_enrollment")}
          value={user?.date_enrollment || ""}
        />
        <InfoItem
          label={t("SettingsPage.incentives")}
          value={
            parsedIncentives.length > 0
              ? parsedIncentives
              : ["No incentives available"]
          }
          className="flex-wrap gap-x-2 pb-4"
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
