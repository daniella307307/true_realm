// import { View, ScrollView, SafeAreaView } from "react-native";
// import { router, useLocalSearchParams } from "expo-router";
// import { Text } from "~/components/ui/text";
// import { useTranslation } from "react-i18next";
// import HeaderNavigation from "~/components/ui/header";
// import { useGetMonitoringFormById } from "~/services/monitoring/monitoring-forms";
// import { useGetFamilies } from "~/services/families";
// import { NotFound } from "~/components/ui/not-found";
// import { format } from "date-fns";
// import React from 'react';

// const MonitoringDetailScreen = () => {
//   const { t, i18n } = useTranslation();
//   const { type, submissions: submissionsJson } = useLocalSearchParams<{
//     type: 'visits' | 'risk';
//     submissions: string;
//   }>();

//   if (!submissionsJson) {
//     return (
//       <NotFound
//         title={t("Common.missing_data")}
//         description={t("Common.please_try_again")}
//         redirectTo={() => router.back()}
//       />
//     );
//   }

//   const submissions = JSON.parse(submissionsJson);
//   const { families } = useGetFamilies();

//   // Get form data for field labels
//   const firstSubmission = submissions[0];
//   const formId = firstSubmission?.form_data?.survey_id;

//   const { form } = useGetMonitoringFormById(formId ?? 0);

//   // Create field label mapping
//   const fieldLabelMap = React.useMemo(() => {
//     if (!form?.[0]?.json2) {
//       return {};
//     }
//     try {
//       const formDefinition = typeof form[0].json2 === 'string' ? JSON.parse(form[0].json2) : form[0].json2;
//       const map: { [key: string]: string } = {};
//       const isKinyarwanda = i18n.language === "rw-RW";

//       // Recursive function to process all components and their children
//       const processComponents = (components: any[]) => {
//         if (!Array.isArray(components)) return;

//         components.forEach((field: any) => {
//           if (field?.key) {
//             if (field.title) {
//               if (isKinyarwanda && field.title.kn) {
//                 map[field.key] = field.title.kn;
//               } else if (field.title.en) {
//                 map[field.key] = field.title.en;
//               } else if (field.title.default) {
//                 map[field.key] = field.title.default;
//               } else {
//                 map[field.key] = field.key;
//               }
//             } else {
//               map[field.key] = field.key;
//             }
//           }

//           // Process child components recursively
//           if (field.components && Array.isArray(field.components)) {
//             processComponents(field.components);
//           }

//           // Process columns for layoutComponents
//           if (field.columns && Array.isArray(field.columns)) {
//             field.columns.forEach((column: any) => {
//               if (column.components && Array.isArray(column.components)) {
//                 processComponents(column.components);
//               }
//             });
//           }

//           // Process rows for tables
//           if (field.rows && Array.isArray(field.rows)) {
//             field.rows.forEach((row: any) => {
//               if (row.components && Array.isArray(row.components)) {
//                 processComponents(row.components);
//               }
//             });
//           }

//           // Process panels
//           if (field.content && Array.isArray(field.content)) {
//             processComponents(field.content);
//           }
//         });
//       };

//       if (formDefinition?.components && Array.isArray(formDefinition.components)) {
//         processComponents(formDefinition.components);
//       }

//       return map;
//     } catch (error) {
//       console.log("Error parsing form json2:", error);
//       return {};
//     }
//   }, [form?.[0]?.json2, i18n.language]);

//   return (
//     <SafeAreaView className="flex-1 bg-background">
//       <HeaderNavigation
//         showLeft={true}
//         showRight={true}
//         title={type === 'visits' ? t("StatisticsPage.visits_detail") : t("StatisticsPage.risk_detail")}
//       />
//       <ScrollView className="flex-1 p-4 bg-white">
//         {submissions.map((submission: any, index: number) => {
//           const family = families.find(f => f.hh_id === submission.form_data?.family);
//           const answers = submission.answers || {};
//           const syncStatus = submission.sync_data?.sync_status;
//           const submittedAt = submission.sync_data?.submitted_at;

//           return (
//             <View key={index} className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
//               {/* Family Info */}
//               {family && (
//                 <View className="mb-4">
//                   <Text className="font-medium text-gray-700 mb-2">
//                     {t("Common.family_info")}
//                   </Text>
//                   <Text className="text-gray-600">
//                     {t("Common.family")}: {family.hh_id}
//                   </Text>
//                   <Text className="text-gray-600">
//                     {t("Common.headName")}: {family.hh_head_fullname}
//                   </Text>
//                   {family.village_name && (
//                     <Text className="text-gray-600">
//                       {t("Common.village")}: {family.village_name}
//                     </Text>
//                   )}
//                 </View>
//               )}

//               {/* Form Answers */}
//               <View className="mb-4">
//                 <Text className="font-medium text-gray-700 mb-2">
//                   {t("Common.form_answers")}
//                 </Text>
//                 {Object.entries(answers).map(([key, value]) => {
//                   let displayValue: string = "";

//                   if (value === null || value === undefined) {
//                     displayValue = t("History.not_answered");
//                   } else if (typeof value === "object") {
//                     try {
//                       displayValue = JSON.stringify(value);
//                     } catch (e) {
//                       displayValue = String(value);
//                     }
//                   } else if (Array.isArray(value)) {
//                     displayValue = value.join(", ");
//                   } else {
//                     displayValue = String(value);
//                   }

//                   const formattedKey = key
//                     .replace(/_/g, " ")
//                     .replace(/\b\w/g, (char) => char.toUpperCase());
//                   const displayLabel =
//                     fieldLabelMap[key] || t(`Form.${key}`, formattedKey);

//                   return (
//                     <View key={key} className="mb-3 p-3 bg-gray-50 rounded">
//                       <Text className="font-medium text-gray-700 mb-1">
//                         {displayLabel}
//                       </Text>
//                       <Text className="text-gray-600">{displayValue}</Text>
//                     </View>
//                   );
//                 })}
//               </View>

//               {/* Sync Status */}
//               <View className="mt-4 pt-4 border-t border-gray-200">
//                 <Text className="text-gray-600">
//                   {t("History.status")}: {syncStatus ? t("History.synced") : t("History.pending")}
//                 </Text>
//                 {submittedAt && (
//                   <Text className="text-gray-600">
//                     {t("History.submitted_at")}: {format(new Date(submittedAt), "PPpp")}
//                   </Text>
//                 )}
//               </View>
//             </View>
//           );
//         })}
//       </ScrollView>
//     </SafeAreaView>
//   );
// };

// export default MonitoringDetailScreen; 