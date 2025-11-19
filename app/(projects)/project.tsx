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
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const normalizedLang = currentLang.split('-')[0].toLowerCase();

  console.log('Current language:', currentLang, '-> normalized:', normalizedLang);

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

  // Helper function to parse the custom translation format
  const parseTranslations = (translationsString: string) => {
    const result: any = {};
    
    // Match patterns like: title={en=New Year Glove, fr=, rw=Umwaka mushya Glove}
    const fieldRegex = /(\w+)=\{([^}]+)\}/g;
    let fieldMatch;
    
    while ((fieldMatch = fieldRegex.exec(translationsString)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldContent = fieldMatch[2];
      
      result[fieldName] = {};
      
      // Match language pairs like: en=New Year Glove, rw=Umwaka mushya Glove
      const langRegex = /(\w+)=([^,}]*?)(?=,\s*\w+=|$)/g;
      let langMatch;
      
      while ((langMatch = langRegex.exec(fieldContent)) !== null) {
        const lang = langMatch[1];
        const value = langMatch[2].trim();
        result[fieldName][lang] = value;
      }
    }
    
    return result;
  };

  // Helper function to get translated text
  const getTranslatedText = (item: any, field: string) => {
    // Check if translations exist
    if (!item.translations) {
      console.log('No translations object found, returning original:', item[field]);
      return item[field];
    }

    try {
      // Parse translations if it's a string
      let translationsObj = item.translations;
      if (typeof item.translations === 'string') {
        translationsObj = parseTranslations(item.translations);
        console.log('Parsed translations:', translationsObj);
      }

      // Check if the field exists in translations
      if (translationsObj[field]) {
        const fieldTranslations = translationsObj[field];
        
        // Try normalized language (e.g., 'rw')
        if (fieldTranslations[normalizedLang] && fieldTranslations[normalizedLang].trim() !== '') {
          console.log('Found translation for', normalizedLang, ':', fieldTranslations[normalizedLang]);
          return fieldTranslations[normalizedLang];
        }

        // Try full language code (e.g., 'rw-RW')
        if (fieldTranslations[currentLang] && fieldTranslations[currentLang].trim() !== '') {
          console.log('Found translation for', currentLang, ':', fieldTranslations[currentLang]);
          return fieldTranslations[currentLang];
        }

        // Fallback to English if current language is empty
        if (fieldTranslations['en'] && fieldTranslations['en'].trim() !== '') {
          console.log('Using English fallback:', fieldTranslations['en']);
          return fieldTranslations['en'];
        }
      }
    } catch (error) {
      console.error('Error parsing translations:', error);
    }

    console.log('No translation found, returning original:', item[field]);
    return item[field];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      Toast.show({
        type: "success",
        text1: t("FormPage.refreshed") || "Refreshed",
        text2: t("FormPage.forms_updated") || "Forms list updated",
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
      return publishedForms.filter((form) => {
        const translatedTitle = getTranslatedText(form, 'title');
        return translatedTitle.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    return publishedForms;
  }, [forms, searchQuery, normalizedLang]);

  const renderItem = ({ item }: { item: IExistingForm }) => {
    const isRiskManagement =
      item.title.toLowerCase().includes("risk of harm management") ||
      item.metadata?.category?.toLowerCase().includes("risk");
    if (isRiskManagement) return null;

    const translatedTitle = getTranslatedText(item, 'title');
    const translatedDescription = item.description ? getTranslatedText(item, 'description') : null;

    return (
      <TouchableOpacity
        onPress={() => router.push(
          `/(projects)/(mods)/(projects)/(form-element)/${item.id}`
        )}
        className="p-4 border border-blue-100 mb-4 rounded-xl"
      >
        <View className="flex flex-row pr-4 items-center justify-between">
          <View className="flex flex-row items-center flex-1">
            <TabBarIcon
              name="description"
              family="MaterialIcons"
              size={24}
              color="#00227c"
            />
            <View className="ml-4 flex-1">
              <Text className="text-lg font-semibold">{translatedTitle}</Text>
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
                size={18}
                color="#71717A"
              />
              <Text className="text-xs text-gray-500 ml-1">
                {item.metadata.estimatedTime} min
              </Text>
            </View>
          )}
        </View>
        {translatedDescription && (
          <Text className="text-sm py-2 text-gray-600">{translatedDescription}</Text>
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
            ? t("FormPage.no_forms_found") || "No forms found"
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