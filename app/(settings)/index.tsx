import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";
import { useAuth } from "~/lib/hooks/useAuth";
import { useSQLite } from "~/providers/RealContextProvider";
import { useGetLocationByVillageIdOffline } from "~/services/locations";
import { User } from "~/types";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { COLORS } from "~/constants/colors";
import {  useRouter } from "expo-router";


interface LocalUser {
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
  const router = useRouter();
  
  const { t } = useTranslation();
  const { user: authUser } = useAuth({});
  const { query } = useSQLite();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const { logout } = useAuth({});

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
 


  const parsedIncentives =
    user?.incentives && user.incentives !== ""
      ? JSON.parse(user.incentives)
      : [];

  
  const { data: locationNamesOffline, isLoading: isLoadingLocationsOffline } =
    useGetLocationByVillageIdOffline(user?.village?.toString() || "");



  const handleEditProfile = () => {    
    router.push('/(settings)/edit-profile');
  };


  const handlePrivacyPolicy = () => {
    Alert.alert(
      "Privacy Policy",
      "Your privacy is important to us. Read our full privacy policy on our website.",
      [{ text: "OK" }]
    );
  };

  const handleTermsOfService = () => {
    Alert.alert(
      "Terms of Service",
      "Review our terms and conditions on our website.",
      [{ text: "OK" }]
    );
  };

  const handleHelpSupport = () => {
    Alert.alert(
      "Help & Support",
      "Need assistance? Our support team is here to help.",
      [
        { text: "Contact Support", onPress: () => {
       
          Alert.alert("Support", "Email: support@example.com\nPhone: +1 (555) 123-4567");
        }},
        { text: "FAQs", onPress: () => {
          Alert.alert("FAQs", "Visit our website for frequently asked questions.");
        }},
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout from your account?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", onPress: () => logout(), style: "destructive" }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  if (loadingUser) {
    return (
      <SafeAreaView 
        style={{ backgroundColor: COLORS.background.light }}
        className="flex-1 items-center justify-center"
      >
        <View className="items-center">
          <ActivityIndicator size="large" color={COLORS.primary.blue[500]} />
          <Text style={{ color: COLORS.text.secondary }} className="mt-4">
            Loading your profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView 
      style={{ backgroundColor: COLORS.background.light }}
      className="flex-1"
    >
    
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title="My Profile"
      />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: COLORS.background.light }}
        className="px-4 pt-2"
      >
     
        <View className="items-center py-6 mb-4">
          <View className="relative">
            <View 
              style={{ 
                borderWidth: 4,
                borderColor: COLORS.primary.blue[500],
              }}
              className="w-36 h-36 rounded-full overflow-hidden mb-5"
            >
              {user?.picture ? (
                <Image
                  source={{ uri: user.picture }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View 
                  style={{ 
                    backgroundColor: COLORS.primary.blue[500],
                  }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <Text className="text-6xl font-bold text-white">
                    {user?.firstName?.charAt(0) || "U"}
                  </Text>
                </View>
              )}
            </View>
            
       
          <TouchableOpacity
            onPress={handleEditProfile}
            style={{ 
              backgroundColor: COLORS.primary.orange[500],
            }}
            className="absolute bottom-4 right-0 w-12 h-12 rounded-full items-center justify-center shadow-lg"
          >
            <TabBarIcon
              name="pencil"
              family="MaterialCommunityIcons"
              color={COLORS.neutral.white}
              size={20}
            />
          </TouchableOpacity>
          </View>
          
          <Text 
            style={{ color: COLORS.text.primary }}
            className="text-2xl font-bold mb-2"
          >
            {user?.firstName + " " + user?.lastName || ""}
          </Text>
          
          <Text 
            style={{ color: COLORS.text.secondary }}
            className="text-base mb-3"
          >
            {user?.email || ""}
          </Text>
          
          {user?.user_code && (
            <View 
              style={{ 
                backgroundColor: COLORS.primary.blue[50],
                borderWidth: 1,
                borderColor: COLORS.primary.blue[200],
              }}
              className="px-5 py-2 rounded-full"
            >
              <Text 
                style={{ color: COLORS.primary.blue[700] }}
                className="font-semibold text-sm"
              >
                User ID: {user.user_code}
              </Text>
            </View>
          )}
        </View>

      
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4 px-2">
            <Text 
              style={{ color: COLORS.text.primary }}
              className="text-lg font-bold"
            >
              Account Information
            </Text>
            <Text 
              style={{ color: COLORS.primary.blue[500] }}
              className="text-sm font-medium"
            >
              ✓ Verified
            </Text>
          </View>
          
          <View 
            style={{ 
              backgroundColor: COLORS.neutral.white,
              borderRadius: 16,
              shadowColor: COLORS.neutral.gray[800],
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 3,
            }}
            className="overflow-hidden mb-4"
          >
        
            {user?.telephone && (
              <>
                <View className="flex-row items-center px-5 py-4">
                  <View 
                    style={{ backgroundColor: COLORS.primary.blue[50] }}
                    className="w-10 h-10 rounded-lg items-center justify-center mr-3"
                  >
                    <TabBarIcon
                      name="phone"
                      family="MaterialCommunityIcons"
                      color={COLORS.primary.blue[600]}
                      size={20}
                    />
                  </View>
                  <View className="flex-1">
                    <Text 
                      style={{ color: COLORS.text.secondary }}
                      className="text-sm"
                    >
                      Phone Number
                    </Text>
                    <Text 
                      style={{ color: COLORS.text.primary }}
                      className="font-semibold"
                    >
                      {user.telephone}
                    </Text>
                  </View>
                </View>
                <View 
                  style={{ backgroundColor: COLORS.neutral.gray[100] }}
                  className="h-px mx-5"
                />
              </>
            )}

            
            {user?.date_enrollment && (
              <View className="flex-row items-center px-5 py-4">
                <View 
                  style={{ backgroundColor: COLORS.primary.blue[50] }}
                  className="w-10 h-10 rounded-lg items-center justify-center mr-3"
                >
                  <TabBarIcon
                    name="calendar-month"
                    family="MaterialCommunityIcons"
                    color={COLORS.primary.blue[600]}
                    size={20}
                  />
                </View>
                <View className="flex-1">
                  <Text 
                    style={{ color: COLORS.text.secondary }}
                    className="text-sm"
                  >
                    Member Since
                  </Text>
                  <Text 
                    style={{ color: COLORS.text.primary }}
                    className="font-semibold"
                  >
                    {formatDate(user.date_enrollment)}
                  </Text>
                </View>
              </View>
            )}
          </View>

      
          {user?.village && !isLoadingLocationsOffline && locationNamesOffline && (
            <View 
              style={{ 
                backgroundColor: COLORS.primary.blue[50],
                borderWidth: 1,
                borderColor: COLORS.primary.blue[100],
                borderRadius: 16,
              }}
              className="p-5"
            >
              <View className="flex-row items-start mb-3">
                <View 
                  style={{ backgroundColor: COLORS.primary.blue[500] }}
                  className="w-10 h-10 rounded-lg items-center justify-center mr-3 mt-1"
                >
                  <TabBarIcon
                    name="map-marker"
                    family="MaterialCommunityIcons"
                    color={COLORS.neutral.white}
                    size={20}
                  />
                </View>
                <View className="flex-1">
                  <Text 
                    style={{ color: COLORS.primary.blue[700] }}
                    className="font-bold text-base mb-1"
                  >
                    Registered Location
                  </Text>
                  <Text 
                    style={{ color: COLORS.primary.blue[600] }}
                    className="text-sm"
                  >
                    {locationNamesOffline?.location.village.village_name}
                  </Text>
                </View>
              </View>
              
              <View className="ml-13">
                <View className="flex-row items-center mb-1">
                  <View className="w-2 h-2 rounded-full bg-primary-blue-400 mr-2" />
                  <Text style={{ color: COLORS.primary.blue[600] }} className="text-sm">
                    {locationNamesOffline?.location.cell.cell_name}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-primary-blue-400 mr-2" />
                  <Text style={{ color: COLORS.primary.blue[600] }} className="text-sm">
                    {locationNamesOffline?.location.sector.sector_name}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        
        {parsedIncentives.length > 0 && (
          <View className="mb-6">
            <Text 
              style={{ color: COLORS.text.primary }}
              className="text-lg font-bold mb-4 px-2"
            >
              Rewards & Benefits
            </Text>
            
            <View 
              style={{ 
                backgroundColor: COLORS.neutral.white,
                borderRadius: 16,
                shadowColor: COLORS.neutral.gray[800],
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 3,
              }}
              className="overflow-hidden"
            >
              <View className="p-5">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <View 
                      style={{ backgroundColor: COLORS.primary.orange[50] }}
                      className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                    >
                      <TabBarIcon
                        name="trophy"
                        family="MaterialCommunityIcons"
                        color={COLORS.primary.orange[600]}
                        size={24}
                      />
                    </View>
                    <View>
                      <Text 
                        style={{ color: COLORS.text.primary }}
                        className="font-bold text-base"
                      >
                        Your Rewards
                      </Text>
                      <Text 
                        style={{ color: COLORS.text.secondary }}
                        className="text-sm"
                      >
                        {parsedIncentives.length} active benefits
                      </Text>
                    </View>
                  </View>
                  <View 
                    style={{ backgroundColor: COLORS.primary.orange[500] }}
                    className="px-3 py-1 rounded-full"
                  >
                    <Text className="text-white text-sm font-semibold">
                      {parsedIncentives.length}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row flex-wrap gap-2">
                  {parsedIncentives.slice(0, 4).map((incentive: string, index: number) => (
                    <View 
                      key={index}
                      style={{ 
                        backgroundColor: COLORS.primary.orange[50],
                        borderLeftWidth: 3,
                        borderLeftColor: COLORS.primary.orange[500],
                      }}
                      className="px-3 py-2 rounded-r-lg flex-1 min-w-[45%] mb-2"
                    >
                      <Text 
                        style={{ color: COLORS.primary.orange[700] }}
                        className="font-medium text-sm"
                      >
                        {incentive}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        <View className="mb-6">
          <Text 
            style={{ color: COLORS.text.primary }}
            className="text-lg font-bold mb-4 px-2"
          >
            App Settings
          </Text>
          
          <View 
            style={{ 
              backgroundColor: COLORS.neutral.white,
              borderRadius: 16,
              shadowColor: COLORS.neutral.gray[800],
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 3,
            }}
            className="overflow-hidden"
          >
            <TouchableOpacity
              onPress={handleHelpSupport}
              className="flex-row items-center px-5 py-4 active:bg-gray-50"
            >
              <View 
                style={{ backgroundColor: COLORS.neutral.gray[50] }}
                className="w-10 h-10 rounded-lg items-center justify-center mr-3"
              >
                <TabBarIcon
                  name="help-circle"
                  family="MaterialCommunityIcons"
                  color={COLORS.neutral.gray[600]}
                  size={20}
                />
              </View>
              <View className="flex-1">
                <Text 
                  style={{ color: COLORS.text.primary }}
                  className="font-semibold"
                >
                  Help Center
                </Text>
                <Text 
                  style={{ color: COLORS.text.secondary }}
                  className="text-sm mt-0.5"
                >
                  FAQs, guides, and support
                </Text>
              </View>
              <TabBarIcon
                name="chevron-right"
                family="MaterialCommunityIcons"
                color={COLORS.neutral.gray[400]}
                size={20}
              />
            </TouchableOpacity>
            
            <View 
              style={{ backgroundColor: COLORS.neutral.gray[100] }}
              className="h-px mx-5"
            />

            <TouchableOpacity
              onPress={handlePrivacyPolicy}
              className="flex-row items-center px-5 py-4 active:bg-gray-50"
            >
              <View 
                style={{ backgroundColor: COLORS.neutral.gray[50] }}
                className="w-10 h-10 rounded-lg items-center justify-center mr-3"
              >
                <TabBarIcon
                  name="shield-check"
                  family="MaterialCommunityIcons"
                  color={COLORS.neutral.gray[600]}
                  size={20}
                />
              </View>
              <View className="flex-1">
                <Text 
                  style={{ color: COLORS.text.primary }}
                  className="font-semibold"
                >
                  Privacy & Security
                </Text>
                <Text 
                  style={{ color: COLORS.text.secondary }}
                  className="text-sm mt-0.5"
                >
                  Privacy policy and data settings
                </Text>
              </View>
              <TabBarIcon
                name="chevron-right"
                family="MaterialCommunityIcons"
                color={COLORS.neutral.gray[400]}
                size={20}
              />
            </TouchableOpacity>
            
            <View 
              style={{ backgroundColor: COLORS.neutral.gray[100] }}
              className="h-px mx-5"
            />

            <TouchableOpacity
              onPress={handleTermsOfService}
              className="flex-row items-center px-5 py-4 active:bg-gray-50"
            >
              <View 
                style={{ backgroundColor: COLORS.neutral.gray[50] }}
                className="w-10 h-10 rounded-lg items-center justify-center mr-3"
              >
                <TabBarIcon
                  name="file-document"
                  family="MaterialCommunityIcons"
                  color={COLORS.neutral.gray[600]}
                  size={20}
                />
              </View>
              <View className="flex-1">
                <Text 
                  style={{ color: COLORS.text.primary }}
                  className="font-semibold"
                >
                  Terms & Conditions
                </Text>
                <Text 
                  style={{ color: COLORS.text.secondary }}
                  className="text-sm mt-0.5"
                >
                  User agreement and policies
                </Text>
              </View>
              <TabBarIcon
                name="chevron-right"
                family="MaterialCommunityIcons"
                color={COLORS.neutral.gray[400]}
                size={20}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{ 
            backgroundColor: COLORS.neutral.white,
            borderWidth: 1,
            borderColor: COLORS.neutral.gray[200],
            borderRadius: 16,
            shadowColor: COLORS.neutral.gray[800],
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
          className="mb-8 p-5 flex-row items-center justify-center active:bg-red-50"
        >
          <TabBarIcon
            name="logout"
            family="MaterialCommunityIcons"
            color={COLORS.semantic.error}
            size={20}
          />
          <Text 
            style={{ color: COLORS.semantic.error }}
            className="font-semibold text-base ml-2"
          >
            Sign Out
          </Text>
        </TouchableOpacity>

        <View className="items-center py-6">
          <Text 
            style={{ color: COLORS.text.tertiary }}
            className="text-sm mb-1"
          >
            Version 1.0.0 • Build 2024.12.01
          </Text>
          <Text 
            style={{ color: COLORS.text.tertiary }}
            className="text-xs"
          >
            © 2024 YourAppName. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;