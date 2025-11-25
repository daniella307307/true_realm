import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";
import { useAuth } from "~/lib/hooks/useAuth";
import { useSQLite } from "~/providers/RealContextProvider";
import { useGetLocationByVillageIdOffline } from "~/services/locations";
import { User } from "~/types";
import { TabBarIcon } from "~/components/ui/tabbar-icon";

// Local User type (from SQLite)
export interface LocalUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  user_code: string;
  date_enrollment: string;
  incentives: string | null;
  village: number | null;
  picture?: string | null;
}

const SettingsScreen = () => {
  const { t } = useTranslation();
  const { user: authUser } = useAuth({});
  const { query, db, create } = useSQLite();

  const [user, setUser] = useState<LocalUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth({});
  // useEffect(() => {
  //   const saveUser = async()=>{
  //     try{
  //       if (!authUser?.id) return;
  //       const existingUsers = await query<LocalUser>(
  //         "SELECT * FROM users WHERE id = ?",
  //         [authUser.id]
  //       );

  //       let savedUser : User;
  //       if(existingUsers.length == 0){
  //         // Update existing user
  //         savedUser = await create<User>("Izu",{

  //         } as User);
  //       }else{

  //       }
  //       setUser(savedUser as LocalUser);
  //       if(loadingUser){
  //         setLoadingUser(false);
  //       }

  //     }catch(error){
  //       console.error("Error saving user to SQLite:", error);
  //     }

  //   }
  // })
  // Fetch user info from SQLite
  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!authUser?.id) return;
        const res = authUser;

        if (res) {
          setUser(res as unknown as LocalUser);
        }
      } catch (error) {
        console.error("Error loading user from SQLite:", error);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, [authUser?.id]);

  // Parse incentives JSON safely
  const parsedIncentives =
    user?.incentives && user.incentives !== ""
      ? JSON.parse(user.incentives)
      : [];

  // Location (from offline DB)
  const { data: locationNamesOffline, isLoading: isLoadingLocationsOffline } =
    useGetLocationByVillageIdOffline(user?.village?.toString() || "");

  // UI helper component
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
          <ActivityIndicator size="large" color="#4B5563" />
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

  if (loadingUser) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#4B5563" />
      </SafeAreaView>
    );
  }

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
        {/* <Text className="text-lg font-semibold mb-2">
          {t("SettingsPage.account_details")}
        </Text> */}

        <View className="items-center justify-center w-full h-40">
          {user?.picture ? (
            <Image
              source={{ uri: user.picture }}
              className="w-20 h-20 rounded-full"
            />
          ) : (
            <View className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
              <Text className="text-xl font-bold text-gray-400">
                {user?.firstName?.charAt(0) || "U"}
              </Text>
            </View>
          )}

        </View>
        <View>
          <InfoItem
            label={t("SettingsPage.name")}
            value={user?.firstName + " " + user?.lastName || ""}
          />
          <InfoItem label={t("SettingsPage.email")} value={user?.email || ""} />
        </View>
        <TouchableOpacity
          onPress={() => logout()}
          className="bg-orange-200 p-2 rounded-2xl border border-orange-200 shadow-sm"

        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 bg-orange-200/30 rounded-xl items-center justify-center">
                <TabBarIcon
                  name="logout"
                  family="MaterialCommunityIcons"
                  color="orange"
                  size={24}
                />
              </View>
              <Text className="text-orange-900 text-lg font-semibold ml-4">
                {t("SettingsPage.logout")}
              </Text>
            </View>
            <TabBarIcon
              name="chevron-right"
              family="MaterialCommunityIcons"
              color="orange"
              size={20}
            />
          </View>
        </TouchableOpacity>


        {/* <InfoItem label={t("SettingsPage.phone")} value={user?.telephone || ""} />
        <InfoItem label={t("SettingsPage.user_code")} value={user?.user_code || ""} />
        <InfoItem label={t("SettingsPage.date_of_enrollment")} value={user?.date_enrollment || ""} /> */}

        {/* {user && (
          <>
            <Text className="text-lg font-semibold mb-2 mt-4">
              {t("SettingsPage.location")}
            </Text>
            <InfoItem
              label={t("SettingsPage.province")}
              value={locationNamesOffline?.location.province.province_name || ""}
              isLoading={isLoadingLocationsOffline}
            />
            <InfoItem
              label={t("SettingsPage.district")}
              value={locationNamesOffline?.location.district.district_name || ""}
              isLoading={isLoadingLocationsOffline}
            />
            <InfoItem
              label={t("SettingsPage.sector")}
              value={locationNamesOffline?.location.sector.sector_name || ""}
              isLoading={isLoadingLocationsOffline}
            />
            <InfoItem
              label={t("SettingsPage.cell")}
              value={locationNamesOffline?.location.cell.cell_name || ""}
              isLoading={isLoadingLocationsOffline}
            />
            <InfoItem
              label={t("SettingsPage.village")}
              value={locationNamesOffline?.location.village.village_name || ""}
              isLoading={isLoadingLocationsOffline}
            />
          </>
        )} */}

        {/* <InfoItem
          label={t("SettingsPage.incentives")}
          value={
            parsedIncentives.length > 0
              ? parsedIncentives
              : [t("SettingsPage.no_incentives")]
          }
          className="flex-wrap gap-x-2 pb-4"
        /> */}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
