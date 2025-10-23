// import React, { useState, useMemo, useCallback } from "react";
// import {
//   View,
//   FlatList,
//   RefreshControl,
//   TouchableOpacity,
//   SafeAreaView,
// } from "react-native";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { useTranslation } from "react-i18next";
// import { router, useLocalSearchParams } from "expo-router";

// import { Text } from "~/components/ui/text";
// import CustomInput from "~/components/ui/input";
// import { TabBarIcon } from "~/components/ui/tabbar-icon";
// import HeaderNavigation from "~/components/ui/header";
// import EmptyDynamicComponent from "~/components/EmptyDynamic";
// import { SimpleSkeletonItem } from "~/components/ui/skeleton";
// import { NotFound } from "~/components/ui/not-found";

// import { useGetFormsByProject } from "~/services/formElements";
// import { useGetProjectById } from "~/services/project";
// import { IExistingForm, IForm } from "~/types";

// // Helper: convert IExistingForm → IForm
// function mapExistingFormToIForm(form: IExistingForm): IForm {
//   return {
//     _id: form.id,
//     id: form.id,
//     name: form.name,
//     name_kin: form.name_kin,
//     slug: form.slug,
//     json2: form.json2,
//     json2_bkp: form.json2_bkp,
//     survey_status: form.survey_status,
//     module_id: form.module_id,
//     is_primary: form.is_primary,
//     table_name: form.table_name,
//     post_data: form.post_data,
//     fetch_data: form.fetch_data,
//     loads: form.loads,
//     prev_id: form.prev_id,
//     created_at: form.created_at,
//     updated_at: form.updated_at,
//     order_list: form.order_list,
//     project_module_id: form.project_module_id,
//     project_id: form.project_id,
//     source_module_id: form.source_module_id,
//     description: form.description || "",
//     data: [],
//   };
// }

 const ProjectFormsScreen = () => {
//   const { t, i18n } = useTranslation();
//   const { projectId } = useLocalSearchParams<{ projectId: string }>();

//   if (!projectId) {
//     return (
//       <NotFound
//         title={t("ProjectModulePage.no_project_id")}
//         description={t("ProjectModulePage.go_back_and_try_again")}
//         redirectTo={() => router.back()}
//       />
//     );
//   }

//   // Fetch project & forms
//   const numericProjectId = Number(projectId);
//   const {
//     project,
//     isLoading: isProjectLoading,
//     refresh: refreshProject,
//   } = useGetProjectById(numericProjectId);

//   const {
//     filteredForms: formsRaw,
//     isLoading: isFormsLoading,
//     refresh: refreshForms, 
//   } = useGetFormsByProject(numericProjectId);

//   const { control, watch } = useForm({
//     resolver: zodResolver(z.object({ searchQuery: z.string().optional() })),
//     mode: "onChange",
//     defaultValues: { searchQuery: "" },
//   });

//   const searchQuery = watch("searchQuery") || "";
//   const [refreshing, setRefreshing] = useState(false);

//   // 🧠 Map to IForm safely
//   const forms: IForm[] = useMemo(
//     () => (formsRaw || []).map(mapExistingFormToIForm),
//     [formsRaw]
//   );

//   // 🔍 Filter by search term
//   const filteredForms = useMemo(() => {
//     const query = searchQuery.toLowerCase();
//     if (!query) return forms;
//     return forms.filter(
//       (form) =>
//         form.name.toLowerCase().includes(query) ||
//         (form.name_kin && form.name_kin.toLowerCase().includes(query))
//     );
//   }, [forms, searchQuery]);

//   // 🔄 Pull-to-refresh
//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     try {
//       await Promise.all([refreshProject(), refreshForms?.()]);
//     } catch (e) {
//       console.error("Refresh error:", e);
//     } finally {
//       setRefreshing(false);
//     }
//   }, [refreshProject, refreshForms]);

//   // 📄 Render each form item
//   const renderItem = ({ item }: { item: IForm }) => (
//     <TouchableOpacity
//       onPress={() =>
//         router.push({
//           pathname: "/(projects)/(mods)/(projects)/(form-element)/[formId]",
//           params: {
//             formId: item.id.toString(),
//             project_id: projectId,
//             source_module_id: item.source_module_id?.toString() || "",
//             project_module_id: item.project_module_id?.toString() || "",
//           },
//         })
//       }
//       className="p-4 border mb-4 border-gray-200 rounded-xl"
//     >
//       <View className="flex-row items-center pr-4 justify-start">
//         <TabBarIcon
//           name="description"
//           family="MaterialIcons"
//           size={24}
//           color="#71717A"
//         />
//         <Text className="text-lg ml-2 font-semibold">
//           {i18n.language === "rw-RW"
//             ? item.name_kin || item.name
//             : item.name}
//         </Text>
//       </View>
//     </TouchableOpacity>
//   );

//   const isLoading = isProjectLoading || isFormsLoading;
//   return (
//     <SafeAreaView className="flex-1 bg-background">
//       <HeaderNavigation
//         showLeft
//         showRight
//         title={project?.name || t("ModulePage.title")}
//       />
//       <View className="flex-1 p-4 bg-white">
//         <CustomInput
//           control={control}
//           name="searchQuery"
//           placeholder={t("ModulePage.search_module")}
//           keyboardType="default"
//           accessibilityLabel={t("ModulePage.search_module")}
//         />

//         {isLoading ? (
//           <View className="flex-1 justify-center items-center">
//             <SimpleSkeletonItem />
//             <SimpleSkeletonItem />
//             <SimpleSkeletonItem />
//           </View>
//         ) : (
//           <FlatList<IForm>
//             data={filteredForms}
//             keyExtractor={(item) => item.id.toString()}
//             showsVerticalScrollIndicator={false}
//             ListEmptyComponent={() => (
//               <EmptyDynamicComponent
//                 message={
//                   searchQuery
//                     ? t("ProjectModulePage.no_forms_found")
//                     : t("ProjectModulePage.no_related_modules")
//                 }
//               />
//             )}
//             renderItem={renderItem}
//             refreshControl={
//               <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//             }
//           />
//         )}
//       </View>
//     </SafeAreaView>
//   );
 };

//
 export default ProjectFormsScreen;
