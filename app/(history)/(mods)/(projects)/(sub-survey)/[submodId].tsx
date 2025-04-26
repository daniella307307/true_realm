import { View, FlatList, TouchableOpacity, SafeAreaView } from "react-native";
import React, { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import { RefreshControl } from "react-native";
import { CheckCheckIcon } from "lucide-react-native";
import HeaderNavigation from "~/components/ui/header";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetAllLocallyCreatedFamilies,
  useGetFamilies,
} from "~/services/families";
import { IFamilies } from "~/types";
import { ListRenderItemInfo } from "react-native";
import { Entypo } from "@expo/vector-icons";
import { ProcessedSubmission } from "~/types/form-types";
import { NotFound } from "~/components/ui/not-found";
import CustomInput from "~/components/ui/input";

// Extended type for our combined data
type CombinedItem = {
  _id: string;
  table_name: string;
  sync_status: boolean;
  survey_id: string | null;
  source_module_id: string | number | null;
  submittedAt: string | null;
  family: string | null;
  lastSyncAttempt: string | null;
  project_module_id: number;
  itemType: 'submission' | 'family';
  familyData?: {
    hh_id: string;
    hh_head_fullname: string;
    village_name: string;
    cohort: string;
  };
};

const SubmissionListByModuleScreen = () => {
  const { submodId, family } = useLocalSearchParams<{
    submodId: string;
    family?: string;
  }>();
  console.log("SubmodId: ", submodId);
  console.log("Family Filter: ", family);
  if (!submodId) {
    return (
      <NotFound
        title="Missing module id"
        description="Please go back and select a module"
        redirectTo={() => router.back()}
      />
    );
  }

  const [activeTab, setActiveTab] = useState<"all" | "synced" | "pending">(
    "all"
  );
  const {
    surveySubmissions,
    isLoading: surveySubmissionsLoading,
    refresh: refreshSurveySubmissions,
  } = useGetAllSurveySubmissions();

  const {
    locallyCreatedFamilies,
    isLoading: locallyCreatedFamiliesLoading,
    refresh: refreshLocallyCreatedFamilies,
  } = useGetAllLocallyCreatedFamilies();
  
  const {
    families,
    isLoading: familiesLoading,
  } = useGetFamilies();
  
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const { control, watch } = useForm({
    defaultValues: {
      searchQuery: "",
    },
    mode: "onChange",
  });
  const searchQuery = watch("searchQuery");

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshSurveySubmissions();
    await refreshLocallyCreatedFamilies();
    setRefreshing(false);
  };

  // Combine and process all data in one step
  const combinedData = useMemo(() => {
    // Process survey submissions
    const processedSubmissions: CombinedItem[] = Array.from(surveySubmissions).map(
      (sub: any) => ({
        _id: sub._id.toString(),
        table_name: sub.table_name,
        sync_status: sub.sync_status,
        survey_id: sub.survey_id,
        source_module_id: sub.source_module_id,
        submittedAt: sub.submittedAt,
        family: sub.family,
        lastSyncAttempt: sub.lastSyncAttempt,
        project_module_id: sub.project_module_id,
        itemType: 'submission'
      })
    );

    // Process locally created families
    const processedFamilies: CombinedItem[] = locallyCreatedFamilies.map((fam: any) => ({
      _id: fam?.id || fam?.hh_id,
      table_name: 'families',
      sync_status: !fam?.is_temporary, // inverse of is_temporary
      survey_id: fam?.form_data?.survey_id,
      source_module_id: fam?.form_data?.source_module_id,
      submittedAt: fam?.form_data?.submittedAt,
      family: fam?.hh_id,
      lastSyncAttempt: null,
      project_module_id: fam?.form_data?.project_module_id,
      itemType: 'family',
      familyData: {
        hh_id: fam?.hh_id,
        hh_head_fullname: fam?.hh_head_fullname,
        village_name: fam?.village_name,
        cohort: fam?.cohort
      }
    }));

    // Combine both datasets
    return [...processedSubmissions, ...processedFamilies];
  }, [surveySubmissions, locallyCreatedFamilies]);
  
  // Filter and sort combined data
  const filteredAndSortedData = useMemo(() => {
    return combinedData
      .filter((item) => {
        // Filter by module ID
        if (item?.project_module_id !== parseInt(submodId)) return false;

        // If family parameter is provided, filter by family ID
        if (family && item.family !== family) return false;

        // Search filter
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          const foundFamily = item.itemType === 'family'
            ? item.familyData
            : families?.find((fam: IFamilies) => fam.hh_id === item.family);
            
          return (
            foundFamily?.hh_head_fullname?.toLowerCase().includes(searchLower) ||
            foundFamily?.village_name?.toLowerCase().includes(searchLower) ||
            item.family?.toLowerCase().includes(searchLower) || false
          );
        }

        // Tab filter
        switch (activeTab) {
          case "synced":
            return item.sync_status;
          case "pending":
            return !item.sync_status;
          default:
            return true;
        }
      })
      .sort(
        (a, b) =>
          (b.submittedAt ? new Date(b.submittedAt).getTime() : 0) -
          (a.submittedAt ? new Date(a.submittedAt).getTime() : 0)
      );
  }, [combinedData, submodId, family, searchQuery, activeTab, families]);

  const renderTab = (tab: "all" | "synced" | "pending", label: string) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tab)}
      className={`py-3 flex-1 items-center justify-center rounded-full ${
        activeTab === tab ? "bg-primary" : "bg-white"
      }`}
    >
      <Text
        className={`text-sm whitespace-nowrap ${
          activeTab === tab ? "text-white" : "text-gray-700"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const insets = useSafeAreaInsets();

  const ListHeaderComponent = useCallback(
    () => (
      <>
        <CustomInput
          control={control}
          name="searchQuery"
          placeholder={t("History.search_form")}
          keyboardType="default"
          accessibilityLabel={t("History.search_form")}
        />

        <View className="flex flex-row justify-between items-center p-2 gap-2 rounded-full mb-4 bg-gray-100">
          {renderTab("all", t("History.all", "All"))}
          {renderTab("synced", t("History.synced", "Synced"))}
          {renderTab("pending", t("History.pending", "Pending"))}
        </View>
      </>
    ),
    [control, t, activeTab]
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={
          family
            ? t("History.family_submissions", "Family Submissions: ") +
              (families?.find((f) => f.hh_id === family)?.hh_head_fullname ||
                family)
            : t("History.submissions", "Submissions")
        }
      />

      <FlatList
        data={filteredAndSortedData}
        keyExtractor={(item: CombinedItem) => item._id.toString()}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeaderComponent}
        ListHeaderComponentStyle={{ paddingHorizontal: 0, paddingTop: 16 }}
        ListEmptyComponent={() => <EmptyDynamicComponent />}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          flexGrow: 1,
        }}
        renderItem={({ item }: ListRenderItemInfo<CombinedItem>) => {
          const foundFamily = item.itemType === 'family'
            ? item.familyData
            : families?.find((fam: IFamilies) => fam.hh_id === item.family);

          console.log("item", JSON.stringify(item, null, 2));
          return (
            <TouchableOpacity
              onPress={() =>
                router.push(
                  `/(sub-detail)/${item._id}?project_module_id=${item.project_module_id}&source_module_id=${item.source_module_id}${
                    item.itemType === 'family' ? '&isFamily=true' : ''
                  }`
                )
              }
              className="p-4 border mb-4 border-gray-200 rounded-xl bg-white"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-lg font-semibold text-gray-800">
                  {foundFamily?.hh_id ?? item.family ?? "Unknown Family"}
                </Text>
                <View
                  className={`px-2 py-1 rounded-full ${
                    item.sync_status ? "bg-green-100" : "bg-yellow-100"
                  }`}
                >
                  {item.sync_status ? (
                    <View className="flex-row items-center">
                      <CheckCheckIcon
                        size={24}
                        color="green"
                        className="mr-1"
                      />
                    </View>
                  ) : (
                    <View>
                      <Entypo name="circle-with-cross" size={24} color="red" />
                    </View>
                  )}
                </View>
              </View>
              <View className="space-y-1 mb-3">
                {foundFamily && (
                  <>
                    <Text className="text-sm text-gray-600">
                      {t("Common.headName", "Head Name")}:{" "}
                      {foundFamily.hh_head_fullname}
                    </Text>
                    {foundFamily.village_name && (
                      <Text className="text-sm text-gray-600">
                        {t("Common.village", "Village")}:{" "}
                        {foundFamily.village_name}
                      </Text>
                    )}
                  </>
                )}
                <Text className="text-sm text-gray-600">
                  {t("History.createdAt", "Created At")}:{" "}
                  {item.submittedAt
                    ? new Date(item.submittedAt).toLocaleString()
                    : "-"}
                </Text>
                {item.lastSyncAttempt && (
                  <Text className="text-sm text-gray-600">
                    {t("History.lastSync", "Last Synced")}:{" "}
                    {item.lastSyncAttempt
                      ? new Date(item.lastSyncAttempt).toLocaleString()
                      : "-"}
                  </Text>
                )}
                <Text className="text-sm text-gray-600">
                  {t("Common.type", "Type")}:{" "}
                  {item.itemType === 'family' 
                    ? t("Common.family", "Family") 
                    : t("Common.submission", "Submission")}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
};

export default SubmissionListByModuleScreen;