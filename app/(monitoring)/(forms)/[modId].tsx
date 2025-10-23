// import React, { useState, useCallback, useMemo } from "react";
// import {
//   View,
//   FlatList,
//   TouchableOpacity,
//   SafeAreaView,
//   RefreshControl,
// } from "react-native";
// import { router, useLocalSearchParams } from "expo-router";
// import CustomInput from "~/components/ui/input";
// import EmptyDynamicComponent from "~/components/EmptyDynamic";
// import HeaderNavigation from "~/components/ui/header";
// import { SimpleSkeletonItem } from "~/components/ui/skeleton";
// import { IMonitoringModules } from "~/types";
// import { TabBarIcon } from "~/components/ui/tabbar-icon";
// import { Text } from "~/components/ui/text";
// import { useForm } from "react-hook-form";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { useTranslation } from "react-i18next";
// import { useGetMonitoringFormsByModule } from "~/services/monitoring/monitoring-forms";
// import { NotFound } from "~/components/ui/not-found";
// import { useGetMonitoringModules } from "~/services/monitoring/monitoring-module";

const MonitoringFormsScreen = () => {
//   const { modId, project_id } = useLocalSearchParams<{
//     modId: string;
//     project_id: string;
//   }>();
  
//   const insets = useSafeAreaInsets();
//   const { t, i18n } = useTranslation();

//   if (!modId) {
//     return (
//       <NotFound 
//         title={t("ModulePage.not_found")}
//         description={t("Common.try_again")}
//         redirectTo={() => router.back()}
//       />
//     );
//   }

//   const { monitoringModules, isLoading: isMonitoringLoading } = useGetMonitoringModules();
  
//   const moduleId = parseInt(modId);
//   const projectId = parseInt(project_id || "3");

//   // Get monitoring forms for this module
//   const { 
//     moduleForms, 
//     isLoading: isMonitoringFormsLoading,
//     refreshModuleForms
//   } = useGetMonitoringFormsByModule(moduleId);
  
//   const { control, watch } = useForm({
//     defaultValues: {
//       searchQuery: "",
//     },
//     mode: "onChange",
//   });

//   const searchQuery = watch("searchQuery");
//   const [refreshing, setRefreshing] = useState(false);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     try {
//       if (refreshModuleForms) {
//         await refreshModuleForms();
//       }
//     } catch (error) {
//       console.error("Error refreshing monitoring forms:", error);
//     } finally {
//       setRefreshing(false);
//     }
//   }, [moduleId, refreshModuleForms]);

//   // Filter forms based on search query
//   const filteredItems = useMemo(() => {
//     return moduleForms.filter((form: any) => {
//       if (!searchQuery) return true;
//       const formName = form.name || "";
//       return formName.toString().toLowerCase().includes(searchQuery.toLowerCase());
//     });
//   }, [moduleForms, searchQuery]);
  
//   const ListHeaderComponent = useCallback(
//     () => (
//       <CustomInput
//         control={control}
//         name="searchQuery"
//         placeholder={t("FormPage.search_form")}
//         keyboardType="default"
//         accessibilityLabel={t("FormPage.search_form")}
//       />
//     ),
//     [control, t]
//   );

//   const renderItem = ({ item }: { item: any }) => {
//     return (
//       <TouchableOpacity
//         onPress={() => 
//           router.push(`/(monitoring)/(form-element)/${item.id}?project_id=${projectId}&monitoring_module_id=${moduleId}`)
//         }
//         className="p-4 border mb-4 border-gray-200 rounded-xl"
//       >
//         <View className="flex-row items-center pr-4 justify-start">
//           <TabBarIcon
//             name="account-star"
//             family="MaterialCommunityIcons"
//             size={24}
//             color="#71717A"
//           />
//           <Text className="text-lg ml-4 font-semibold">
//             {i18n.language === "rw-RW" ? item.name_kin || item.name : item.name}
//           </Text>
//         </View>
//       </TouchableOpacity>
//     );
//   };

//   const isLoading = isMonitoringLoading || isMonitoringFormsLoading;

//   const renderContent = () => {
//     if (isLoading) {
//       return (
//         <View className="mt-6">
//           {[1, 2, 3].map((item) => (
//             <SimpleSkeletonItem key={item} />
//           ))}
//         </View>
//       );
//     }

//     return null;
//   };

//   return (
//     <SafeAreaView className="flex-1 bg-background">
//       <HeaderNavigation
//         showLeft={true}
//         showRight={true}
//         title={t("FormPage.monitoring_title")}
//       />

//       <FlatList
//         data={filteredItems}
//         keyExtractor={(item, index) => `${item.id}-${index}`}
//         showsVerticalScrollIndicator={false}
//         ListHeaderComponent={ListHeaderComponent}
//         ListHeaderComponentStyle={{ paddingHorizontal: 0, paddingTop: 16 }}
//         ListEmptyComponent={() =>
//           isLoading ? (
//             renderContent()
//           ) : (
//             <EmptyDynamicComponent message={t("FormPage.empty_monitoring_forms")} />
//           )
//         }
//         contentContainerStyle={{
//           paddingHorizontal: 16,
//           paddingBottom: insets.bottom + 24,
//           flexGrow: 1,
//         }}
//         renderItem={renderItem}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }
//       />
//     </SafeAreaView>
//   );
};

export default MonitoringFormsScreen; 