import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import React, { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Image } from "react-native";
import { useAuth } from "~/lib/hooks/useAuth";
import HeaderNavigation from "~/components/ui/header";
import { RealmContext } from "~/providers/RealContextProvider";
import { useGetLocationByVillageId } from "~/services/locations";
const { useRealm } = RealmContext;

const SettingsScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth({});
  const realm = useRealm();
  const parsedIncentives = user?.incentives ? JSON.parse(user.incentives) : [];

  const { data: locationNames, isLoading: isLoadingLocations } =
    useGetLocationByVillageId(user?.village.toString() || "");

  type InfoItemProps = {
    label: string;
    value: string | string[];
    className?: string;
    isLoading?: boolean;
  };

  const InfoItem: React.FC<InfoItemProps> = ({
    label,
    value,
    className,
    isLoading = false,
  }) => (
    <View className={`mb-4 ${className}`}>
      <Text className="text-gray-600">{label}</Text>
      {isLoading ? (
        <View className="mt-2 p-2 flex items-center justify-center">
          <ActivityIndicator size="small" color="#4B5563" />
        </View>
      ) : Array.isArray(value) ? (
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
          {value || t("SettingsPage.not_available")}
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
          {user?.picture ? (
            <Image
              source={{ uri: user.picture }}
              className="w-20 h-20 rounded-full"
            />
          ) : (
            <View className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
              <Text className="text-xl font-bold text-gray-400">
                {user?.name?.charAt(0) || "U"}
              </Text>
            </View>
          )}
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

        {user && (
          <>
            <Text className="text-lg font-semibold mb-2 mt-4">
              {t("SettingsPage.location")}
            </Text>
            <InfoItem
              label={t("SettingsPage.province")}
              value={locationNames?.province.province_name || ""}
              isLoading={isLoadingLocations}
            />
            <InfoItem
              label={t("SettingsPage.district")}
              value={locationNames?.district.district_name || ""}
              isLoading={isLoadingLocations}
            />
            <InfoItem
              label={t("SettingsPage.sector")}
              value={locationNames?.sector.sector_name || ""}
              isLoading={isLoadingLocations}
            />
            <InfoItem
              label={t("SettingsPage.cell")}
              value={locationNames?.cell.cell_name || ""}
              isLoading={isLoadingLocations}
            />
            <InfoItem
              label={t("SettingsPage.village")}
              value={locationNames?.village.village_name || ""}
              isLoading={isLoadingLocations}
            />
          </>
        )}

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
