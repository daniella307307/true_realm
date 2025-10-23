// import {
//   View,
//   FlatList,
//   TouchableOpacity,
//   RefreshControl,
//   SafeAreaView,
// } from "react-native";
// import React, { useState, useMemo } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import CustomInput from "~/components/ui/input";
// import { useTranslation } from "react-i18next";
// import { router } from "expo-router";
// import { IProject } from "~/types";
// import { TabBarIcon } from "~/components/ui/tabbar-icon";
// import { Text } from "~/components/ui/text";
// import { useGetAllProjects } from "~/services/project";
// import { SimpleSkeletonItem } from "~/components/ui/skeleton";
// import HeaderNavigation from "~/components/ui/header";
// import EmptyDynamicComponent from "~/components/EmptyDynamic";

// const ProjectScreen = () => {
//   const { projects, isLoading, refresh } = useGetAllProjects();
//   const { t, i18n } = useTranslation();
//   const { control, watch } = useForm({
//     resolver: zodResolver(
//       z.object({
//         searchQuery: z.string(),
//       })
//     ),
//     mode: "onChange",
//   });

//   const searchQuery = watch("searchQuery");
//   const [refreshing, setRefreshing] = useState(false);

//   const onRefresh = async () => {
//     setRefreshing(true);
//     await refresh();
//     setRefreshing(false);
//   };

//   // Filter and organize projects
//   const filteredProjects = useMemo(() => {
//     if (!projects) return [];

//     // Filter active projects
//     const activeProjects = projects.filter((project) => project.status !== 0);

//     // Apply search filter if exists
//     if (searchQuery) {
//       return activeProjects.filter((project) =>
//         project.name.toLowerCase().includes(searchQuery.toLowerCase())
//       );
//     }

//     // Organize: Risk management first, then others
//     const riskProjects = activeProjects.filter((project) =>
//       project.name.toLowerCase().includes("risk of harm management")
//     );
//     const otherProjects = activeProjects.filter(
//       (project) =>
//         !project.name.toLowerCase().includes("risk of harm management")
//     );

//     return [...riskProjects, ...otherProjects];
//   }, [projects, searchQuery]);

//   const renderItem = ({ item, index }: { item: IProject; index: number }) => {
//     const isRiskManagement = item.name
//       .toLowerCase()
//       .includes("risk of harm management");

//     // Skip risk management projects in the list
//     if (isRiskManagement) {
//       return null;
//     }

//     return (
//       <TouchableOpacity
//         onPress={() => router.push(`/(mods)/(projects)/${item.id}`)}
//         className="p-4 border border-gray-200 mb-4 rounded-xl"
//       >
//         <View className="flex flex-row pr-4 items-center">
//           <TabBarIcon
//             name="chat"
//             family="MaterialIcons"
//             size={24}
//             color="#71717A"
//           />
//           <Text className="text-lg ml-4 font-semibold">
//             {i18n.language === "rw-RW" ? item.kin_name || item.name : item.name}
//           </Text>
//         </View>
//         {item.description && (
//           <Text className="text-sm py-2 text-gray-600">
//             {item.description}
//           </Text>
//         )}
//       </TouchableOpacity>
//     );
//   };

//   const ListEmptyComponent = () => (
//     <View className="flex-1 justify-center items-center py-20">
//       <EmptyDynamicComponent message={searchQuery
//           ? t("Project.no_projects_found")
//           : t("ProjectPage.empty_projects")}/>
//     </View>
//   );

//   return (
//     <SafeAreaView className="flex-1 bg-background">
//       <HeaderNavigation
//         showLeft={true}
//         showRight={true}
//         title={t("ProjectPage.projects")}
//       />
//       <View className="flex-1 p-4 bg-white">
//         <CustomInput
//           control={control}
//           name="searchQuery"
//           placeholder={t("ProjectPage.search_project")}
//           keyboardType="default"
//           accessibilityLabel={t("ProjectPage.search_project")}
//         />

//         {isLoading ? (
//           <View className="flex-1 justify-center items-center">
//             <SimpleSkeletonItem />
//             <SimpleSkeletonItem />
//             <SimpleSkeletonItem />
//           </View>
//         ) : (
//           <FlatList
//             data={filteredProjects}
//             showsVerticalScrollIndicator={false}
//             keyExtractor={(item: IProject) => item.id.toString()}
//             renderItem={renderItem}
//             ListEmptyComponent={ListEmptyComponent}
//             refreshControl={
//               <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//             }
//           />
//         )}
//       </View>
//     </SafeAreaView>
//   );
// };

// export default ProjectScreen;


import React, { useState, useMemo } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { IExistingForm } from "~/types";
import CustomInput from "~/components/ui/input";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { Text } from "~/components/ui/text";
import { useGetAllForms } from "~/services/project";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import HeaderNavigation from "~/components/ui/header";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import Toast from "react-native-toast-message";

const FormsScreen = () => {
  const { forms, isLoading, refresh } = useGetAllForms();
  const { t } = useTranslation();

  const { control, watch } = useForm({
    resolver: zodResolver(
      z.object({
        searchQuery: z.string().optional(),
      })
    ),
    mode: "onChange",
  });

  const searchQuery = watch("searchQuery") || "";
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      Toast.show({
        type: "success",
        text1: t("Forms.refreshed") || "Refreshed",
        text2: t("Forms.forms_updated") || "Forms list updated",
        position: "top",
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error("Error refreshing forms:", error);
      Toast.show({
        type: "error",
        text1: t("Alerts.error.title") || "Error",
        text2: t("Forms.refresh_error") || "Failed to refresh forms",
        position: "top",
        visibilityTime: 3000,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const filteredForms = useMemo(() => {
    if (!forms || forms.length === 0) return [];

    const publishedForms = forms.filter((form) => form.status === "published");

    // Apply search filter if user typed something
    if (searchQuery.trim()) {
      return publishedForms.filter((form) =>
        form.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return publishedForms;
  }, [forms, searchQuery]);

  const renderItem = ({ item }: { item: IExistingForm }) => {
    const isRiskManagement =
      item.title.toLowerCase().includes("risk of harm management") ||
      item.metadata?.category?.toLowerCase().includes("risk");
      console.log(item.id);
    if (isRiskManagement) return null;

    return (
      <TouchableOpacity
        onPress={() => router.push(
          `/(projects)/(mods)/(projects)/(form-element)/${item.id}`
        )}
        className="p-4 border border-gray-200 mb-4 rounded-xl"
      >
        <View className="flex flex-row pr-4 items-center justify-between">
          <View className="flex flex-row items-center flex-1">
            <TabBarIcon
              name="description"
              family="MaterialIcons"
              size={24}
              color="#71717A"
            />
            <View className="ml-4 flex-1">
              <Text className="text-lg font-semibold">{item.title}</Text>
              {item.metadata?.category && (
                <Text className="text-xs text-gray-500 mt-1">
                  {item.metadata.category}
                </Text>
              )}
            </View>
          </View>
          {item.metadata?.estimatedTime && (
            <View className="flex flex-row items-center">
              <TabBarIcon
                name="schedule"
                family="MaterialIcons"
                size={16}
                color="#71717A"
              />
              <Text className="text-xs text-gray-500 ml-1">
                {item.metadata.estimatedTime} min
              </Text>
            </View>
          )}
        </View>
        {item.description && (
          <Text className="text-sm py-2 text-gray-600">{item.description}</Text>
        )}
        {item.metadata?.country && (
          <View className="flex flex-row items-center mt-2">
            <TabBarIcon
              name="location-on"
              family="MaterialIcons"
              size={14}
              color="#71717A"
            />
            <Text className="text-xs text-gray-500 ml-1">
              {item.metadata.country}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const ListEmptyComponent = () => (
    <View className="flex-1 justify-center items-center py-20">
      <EmptyDynamicComponent
        message={
          searchQuery
            ? t("Forms.no_forms_found") || "No forms found"
            : t("ProjectPage.empty_projects") || "No projects yet"
        }
      />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("HomePage.projects") || "Projects"}
      />
      <View className="flex-1 p-4 bg-white">
        <CustomInput
          control={control}
          name="searchQuery"
          placeholder={t("ProjectPage.search_project") || "Search project"}
          keyboardType="default"
          accessibilityLabel={t("ProjectPage.search_project") || "Search project"}
        />

        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <SimpleSkeletonItem />
            <SimpleSkeletonItem />
            <SimpleSkeletonItem />
          </View>
        ) : (
          <FlatList
            data={filteredForms}
            keyExtractor={(item: IExistingForm) => item.id.toString()}
            renderItem={renderItem}
            ListEmptyComponent={ListEmptyComponent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default FormsScreen;
