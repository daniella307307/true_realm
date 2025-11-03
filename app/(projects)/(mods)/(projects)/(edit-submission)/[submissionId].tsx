// import React, { useState, useEffect, useMemo } from "react";
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   Alert,
//   SafeAreaView,
//   StyleSheet,
//   ActivityIndicator,
//   TextInput,
// } from "react-native";
// import HeaderNavigation from "~/components/ui/header";
// import { useTranslation } from "react-i18next";
// import { useAuth } from "~/lib/hooks/useAuth";
// import { router, useLocalSearchParams } from "expo-router";
// import { useSQLite } from "~/providers/RealContextProvider";
// import { 
//   updateSurveySubmissionLocally, 
//   updateSurveySubmissionOnServer,
//   parseSQLiteRow,
//   SurveySubmission 
// } from "~/services/survey-submission";
// import Toast from "react-native-toast-message";
// import { checkNetworkConnection } from "~/utils/networkHelpers";

// const EditSubmissionScreen = () => {
//   const { t } = useTranslation();
//   const { user } = useAuth({});
//   const params = useLocalSearchParams<{ submissionId: string }>();
//   const { getAll, update } = useSQLite();
  
//   const [submission, setSubmission] = useState<SurveySubmission | null>(null);
//   const [editedData, setEditedData] = useState<Record<string, any>>({});
//   const [isLoading, setIsLoading] = useState(true);
//   const [isSaving, setIsSaving] = useState(false);
//   const [isOnline, setIsOnline] = useState(true);
//   const [hasChanges, setHasChanges] = useState(false);
  
//   const userId = user?.id || user?.json?.id;

//   // Load submission
//   useEffect(() => {
//     const loadSubmission = async () => {
//       try {
//         setIsLoading(true);
//         const allSubmissions = await getAll("SurveySubmissions");
//         const parsedSubmissions = allSubmissions.map(parseSQLiteRow);
        
//         const found = parsedSubmissions.find(
//           (s: SurveySubmission) => s._id === params.submissionId
//         );
        
//         if (found) {
//           setSubmission(found);
//           setEditedData({ ...found.data });
//         } else {
//           Alert.alert(
//             t("CommonPage.error") || "Error",
//             "Submission not found",
//             [{ text: t("CommonPage.ok") || "OK", onPress: () => router.back() }]
//           );
//         }
//       } catch (error) {
//         console.error("Error loading submission:", error);
//         Alert.alert(
//           t("CommonPage.error") || "Error",
//           "Failed to load submission",
//           [{ text: t("CommonPage.ok") || "OK", onPress: () => router.back() }]
//         );
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     loadSubmission();
//   }, [params.submissionId]);

//   // Check network status
//   useEffect(() => {
//     const checkNetwork = async () => {
//       const connected = await checkNetworkConnection();
//       setIsOnline(connected);
//     };
    
//     checkNetwork();
//     const interval = setInterval(checkNetwork, 30000);
    
//     return () => clearInterval(interval);
//   }, []);

//   // Track changes
//   useEffect(() => {
//     if (!submission) return;
    
//     const changed = Object.keys(editedData).some(
//       key => JSON.stringify(editedData[key]) !== JSON.stringify(submission.data[key])
//     );
    
//     setHasChanges(changed);
//   }, [editedData, submission]);

//   const handleFieldChange = (key: string, value: any) => {
//     setEditedData(prev => ({ ...prev, [key]: value }));
//   };
//   // In EditSubmissionScreen.tsx

// const handleSaveLocally = async () => {
//   if (!submission || !userId) return;

//   try {
//     setIsSaving(true);

//     // ✅ Pass both getAll and update functions
//     await updateSurveySubmissionLocally(
//       getAll,      // ✅ First parameter: getAll
//       update,      // ✅ Second parameter: update
//       submission._id!,
//       { data: editedData },
//       userId
//     );

//     Toast.show({
//       type: "success",
//       text1: t("Alerts.success.title") || "Success",
//       text2: "Changes saved locally",
//       position: "top",
//       visibilityTime: 3000,
//     });

//     // Refresh submission data
//     const allSubmissions = await getAll("SurveySubmissions");
//     const parsedSubmissions = allSubmissions.map(parseSQLiteRow);
//     const updated = parsedSubmissions.find((s: SurveySubmission) => s._id === submission._id);
    
//     if (updated) {
//       setSubmission(updated);
//       setEditedData({ ...updated.data });
//       setHasChanges(false);
//     }

//     router.back();
//   } catch (error) {
//     console.error("Error saving locally:", error);
//     Toast.show({
//       type: "error",
//       text1: t("Alerts.error.title") || "Error",
//       text2: "Failed to save changes",
//       position: "top",
//       visibilityTime: 4000,
//     });
//   } finally {
//     setIsSaving(false);
//   }
// };

// const handleSyncNow = async () => {
//   if (!submission || !userId) return;

//   if (!isOnline) {
//     Toast.show({
//       type: "error",
//       text1: t("Alerts.error.network.title") || "Network Error",
//       text2: "You are offline. Changes will sync when online.",
//       position: "top",
//       visibilityTime: 4000,
//     });
//     return;
//   }

//   if (!submission.id) {
//     Toast.show({
//       type: "error",
//       text1: t("CommonPage.error") || "Error",
//       text2: "Cannot sync: No remote ID. This submission needs to be created first.",
//       position: "top",
//       visibilityTime: 4000,
//     });
//     return;
//   }

//   try {
//     setIsSaving(true);

//     // ✅ Save locally first with both parameters
//     await updateSurveySubmissionLocally(
//       getAll,      // ✅ First parameter: getAll
//       update,      // ✅ Second parameter: update
//       submission._id!,
//       { data: editedData },
//       userId
//     );

//     // Get updated submission
//     const allSubmissions = await getAll("SurveySubmissions");
//     const parsedSubmissions = allSubmissions.map(parseSQLiteRow);
//     const updatedSubmission = parsedSubmissions.find(
//       (s: SurveySubmission) => s._id === submission._id
//     );

//     if (!updatedSubmission) {
//       throw new Error("Failed to find updated submission");
//     }

//     // Sync to server
//     Toast.show({
//       type: "info",
//       text1: "Syncing...",
//       text2: "Uploading changes to server",
//       position: "top",
//       visibilityTime: 2000,
//     });

//     await updateSurveySubmissionOnServer(updatedSubmission, t);

//     // Mark as synced
//     await update("SurveySubmissions", submission._id!, {
//       sync_status: 1,
//       needs_update_sync: 0,
//       is_modified: 0,
//       sync_reason: "Successfully updated on server",
//       updated_at: new Date().toISOString(),
//     });

//     Toast.show({
//       type: "success",
//       text1: t("Alerts.success.title") || "Success",
//       text2: "Changes synced successfully",
//       position: "top",
//       visibilityTime: 3000,
//     });

//     router.back();
//   } catch (error: any) {
//     console.error("Error syncing:", error);
//     Toast.show({
//       type: "error",
//       text1: t("Alerts.error.title") || "Error",
//       text2: error?.response?.data?.message || "Failed to sync changes",
//       position: "top",
//       visibilityTime: 4000,
//     });
//   } finally {
//     setIsSaving(false);
//   }
// };
//   const handleSaveAndSync = async () => {
//     if (isOnline && submission?.id) {
//       Alert.alert(
//         "Sync Now?",
//         "Do you want to sync these changes to the server immediately?",
//         [
//           {
//             text: "Save Locally",
//             onPress: handleSaveLocally,
//             style: "cancel",
//           },
//           {
//             text: "Save & Sync",
//             onPress: handleSyncNow,
//           },
//         ]
//       );
//     } else {
//       handleSaveLocally();
//     }
//   };

//   const renderField = (key: string, value: any) => {
//     const fieldValue = editedData[key] ?? value;

//     if (typeof fieldValue === "boolean") {
//       return (
//         <View key={key} style={styles.fieldContainer}>
//           <Text style={styles.fieldLabel}>{formatFieldName(key)}</Text>
//           <View style={styles.switchContainer}>
//             <TouchableOpacity
//               style={[
//                 styles.switchOption,
//                 fieldValue === true && styles.switchOptionActive,
//               ]}
//               onPress={() => handleFieldChange(key, true)}
//             >
//               <Text
//                 style={[
//                   styles.switchOptionText,
//                   fieldValue === true && styles.switchOptionTextActive,
//                 ]}
//               >
//                 {t("CommonPage.yes") || "Yes"}
//               </Text>
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={[
//                 styles.switchOption,
//                 fieldValue === false && styles.switchOptionActive,
//               ]}
//               onPress={() => handleFieldChange(key, false)}
//             >
//               <Text
//                 style={[
//                   styles.switchOptionText,
//                   fieldValue === false && styles.switchOptionTextActive,
//                 ]}
//               >
//                 {t("CommonPage.no") || "No"}
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       );
//     }

//     if (Array.isArray(fieldValue)) {
//       return (
//         <View key={key} style={styles.fieldContainer}>
//           <Text style={styles.fieldLabel}>{formatFieldName(key)}</Text>
//           <TextInput
//             style={styles.textInput}
//             value={fieldValue.join(", ")}
//             onChangeText={(text) =>
//               handleFieldChange(
//                 key,
//                 text.split(",").map((item) => item.trim())
//               )
//             }
//             placeholder="Enter comma-separated values"
//             multiline
//           />
//         </View>
//       );
//     }

//     if (typeof fieldValue === "number") {
//       return (
//         <View key={key} style={styles.fieldContainer}>
//           <Text style={styles.fieldLabel}>{formatFieldName(key)}</Text>
//           <TextInput
//             style={styles.textInput}
//             value={String(fieldValue)}
//             onChangeText={(text) => handleFieldChange(key, Number(text) || 0)}
//             keyboardType="numeric"
//             placeholder="Enter number"
//           />
//         </View>
//       );
//     }

//     return (
//       <View key={key} style={styles.fieldContainer}>
//         <Text style={styles.fieldLabel}>{formatFieldName(key)}</Text>
//         <TextInput
//           style={styles.textInput}
//           value={String(fieldValue || "")}
//           onChangeText={(text) => handleFieldChange(key, text)}
//           placeholder="Enter value"
//           multiline
//         />
//       </View>
//     );
//   };

//   const formatFieldName = (key: string) => {
//     return key
//       .replace(/_/g, " ")
//       .replace(/\b\w/g, (l) => l.toUpperCase())
//       .trim();
//   };

//   if (isLoading) {
//     return (
//       <SafeAreaView style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#00227c" />
//         <Text style={styles.loadingText}>
//           {t("CommonPage.loading") || "Loading..."}
//         </Text>
//       </SafeAreaView>
//     );
//   }

//   if (!submission) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <HeaderNavigation
//           showLeft={true}
//           title={t("CommonPage.error") || "Error"}
//         />
//         <View style={styles.emptyState}>
//           <Text style={styles.emptyText}>Submission not found</Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <HeaderNavigation
//         showLeft={true}
//         title={t("Edit Submission") || "Edit Submission"}
//         showRight={true}
//       />

//       {!isOnline && (
//         <View style={styles.offlineBanner}>
//           <Text style={styles.offlineText}>
//             📴 {t("CommonPage.offline_mode") || "Offline Mode"}
//           </Text>
//         </View>
//       )}

//       {submission.is_modified && (
//         <View style={styles.modifiedBanner}>
//           <Text style={styles.modifiedText}>
//             ⚠️ This submission has unsaved changes
//           </Text>
//         </View>
//       )}

//       <ScrollView style={styles.scrollView}>
//         <View style={styles.header}>
//           <Text style={styles.title}>
//             {submission.form_data?.survey_id
//               ? `Form #${submission.form_data.survey_id}`
//               : "Survey Submission"}
//           </Text>
//           <View style={styles.statusContainer}>
//             {submission.sync_status ? (
//               <View style={styles.statusBadgeSuccess}>
//                 <Text style={styles.statusBadgeText}>✓ Synced</Text>
//               </View>
//             ) : (
//               <View style={styles.statusBadgePending}>
//                 <Text style={styles.statusBadgeText}>⟳ Pending</Text>
//               </View>
//             )}
//             {submission.needs_update_sync && (
//               <View style={styles.statusBadgeWarning}>
//                 <Text style={styles.statusBadgeText}>⚠ Needs Sync</Text>
//               </View>
//             )}
//           </View>
//         </View>

//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Form Fields</Text>
//           <View style={styles.sectionContent}>
//             {Object.entries(submission.data)
//               .filter(([key]) => key !== "language" && key !== "submit")
//               .map(([key, value]) => renderField(key, value))}
//           </View>
//         </View>

//         {submission.location &&
//           Object.keys(submission.location).some((k) => submission.location[k]) && (
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Location Information</Text>
//               <View style={styles.sectionContent}>
//                 {Object.entries(submission.location)
//                   .filter(([_, value]) => value != null)
//                   .map(([key, value]) => (
//                     <View key={key} style={styles.infoRow}>
//                       <Text style={styles.infoLabel}>{formatFieldName(key)}:</Text>
//                       <Text style={styles.infoValue}>{String(value)}</Text>
//                     </View>
//                   ))}
//               </View>
//             </View>
//           )}
//       </ScrollView>

//       <View style={styles.footer}>
//         <TouchableOpacity
//           style={[styles.button, styles.buttonSecondary]}
//           onPress={() => router.back()}
//           disabled={isSaving}
//         >
//           <Text style={styles.buttonSecondaryText}>
//             {t("CommonPage.cancel") || "Cancel"}
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={[
//             styles.button,
//             styles.buttonPrimary,
//             (!hasChanges || isSaving) && styles.buttonDisabled,
//           ]}
//           onPress={handleSaveAndSync}
//           disabled={!hasChanges || isSaving}
//         >
//           {isSaving ? (
//             <ActivityIndicator size="small" color="white" />
//           ) : (
//             <Text style={styles.buttonPrimaryText}>
//               {isOnline && submission.id
//                 ? t("Save & Sync") || "Save & Sync"
//                 : t("CommonPage.save") || "Save"}
//             </Text>
//           )}
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f8f9fa",
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#f8f9fa",
//   },
//   loadingText: {
//     fontSize: 16,
//     color: "#666",
//     marginTop: 12,
//     fontWeight: "500",
//   },
//   offlineBanner: {
//     backgroundColor: "#FFA500",
//     padding: 12,
//     alignItems: "center",
//   },
//   offlineText: {
//     color: "white",
//     fontSize: 13,
//     fontWeight: "600",
//   },
//   modifiedBanner: {
//     backgroundColor: "#fff3cd",
//     padding: 12,
//     alignItems: "center",
//   },
//   modifiedText: {
//     color: "#856404",
//     fontSize: 13,
//     fontWeight: "600",
//   },
//   scrollView: {
//     flex: 1,
//   },
//   header: {
//     backgroundColor: "white",
//     padding: 20,
//     borderBottomWidth: 1,
//     borderBottomColor: "#e9ecef",
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: "700",
//     color: "#212529",
//     marginBottom: 12,
//   },
//   statusContainer: {
//     flexDirection: "row",
//     gap: 8,
//   },
//   statusBadgeSuccess: {
//     backgroundColor: "#28a745",
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 12,
//   },
//   statusBadgePending: {
//     backgroundColor: "#FFA500",
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 12,
//   },
//   statusBadgeWarning: {
//     backgroundColor: "#dc3545",
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 12,
//   },
//   statusBadgeText: {
//     color: "white",
//     fontSize: 12,
//     fontWeight: "600",
//   },
//   section: {
//     margin: 16,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: "700",
//     color: "#212529",
//     marginBottom: 12,
//   },
//   sectionContent: {
//     backgroundColor: "white",
//     borderRadius: 12,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: "#e9ecef",
//   },
//   fieldContainer: {
//     marginBottom: 20,
//   },
//   fieldLabel: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#495057",
//     marginBottom: 8,
//   },
//   textInput: {
//     borderWidth: 1,
//     borderColor: "#dee2e6",
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 14,
//     color: "#212529",
//     backgroundColor: "white",
//     minHeight: 44,
//   },
//   switchContainer: {
//     flexDirection: "row",
//     gap: 8,
//   },
//   switchOption: {
//     flex: 1,
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     borderRadius: 8,
//     borderWidth: 2,
//     borderColor: "#dee2e6",
//     backgroundColor: "white",
//     alignItems: "center",
//   },
//   switchOptionActive: {
//     borderColor: "#00227c",
//     backgroundColor: "#00227c",
//   },
//   switchOptionText: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#6c757d",
//   },
//   switchOptionTextActive: {
//     color: "white",
//   },
//   infoRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     paddingVertical: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: "#f1f3f4",
//   },
//   infoLabel: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#495057",
//   },
//   infoValue: {
//     fontSize: 14,
//     color: "#212529",
//   },
//   footer: {
//     flexDirection: "row",
//     padding: 16,
//     backgroundColor: "white",
//     borderTopWidth: 1,
//     borderTopColor: "#e9ecef",
//     gap: 12,
//   },
//   button: {
//     flex: 1,
//     paddingVertical: 14,
//     borderRadius: 8,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   buttonPrimary: {
//     backgroundColor: "#00227c",
//   },
//   buttonSecondary: {
//     backgroundColor: "white",
//     borderWidth: 2,
//     borderColor: "#00227c",
//   },
//   buttonDisabled: {
//     backgroundColor: "#cccccc",
//     opacity: 0.6,
//   },
//   buttonPrimaryText: {
//     color: "white",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   buttonSecondaryText: {
//     color: "#00227c",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   emptyState: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 32,
//   },
//   emptyText: {
//     fontSize: 16,
//     color: "#6c757d",
//     textAlign: "center",
//   },
// });

// export default EditSubmissionScreen;


import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { NotFound } from "~/components/ui/not-found";
import { WebView } from "react-native-webview";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/lib/hooks/useAuth";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLite } from "~/providers/RealContextProvider";
import { 
  updateSurveySubmissionLocally, 
  updateSurveySubmissionOnServer,
  parseSQLiteRow,
  SurveySubmission 
} from "~/services/survey-submission";
import Toast from "react-native-toast-message";
import { checkNetworkConnection } from "~/utils/networkHelpers";
import * as FileSystem from "expo-file-system";
import { useGetFormById } from "~/services/formElements";

function convertToWizardForm(formSchema: any, questionsPerPage: number = 5): any {
  if (!formSchema || typeof formSchema !== 'object') {
    console.warn('Invalid form schema provided to convertToWizardForm');
    return formSchema;
  }

  if (formSchema.display === 'wizard' && formSchema._converted === true) {
    console.log('Form is already a converted wizard, skipping conversion');
    return formSchema;
  }

  if (!formSchema.components || !Array.isArray(formSchema.components)) {
    console.warn('Form schema has no valid components array');
    return formSchema;
  }

  const components = formSchema.components;
  
  const questionComponents = components.filter((comp: any) => {
    if (!comp || typeof comp !== 'object') return false;
    const excludedTypes = ['button', 'htmlelement', 'content'];
    const isSubmitButton = comp.type === 'button' && (comp.action === 'submit' || comp.key === 'submit');
    return !excludedTypes.includes(comp.type) && !isSubmitButton;
  });

  if (questionComponents.length === 0) {
    console.warn('No valid question components found');
    return formSchema;
  }

  const pages: any[] = [];
  const totalPages = Math.ceil(questionComponents.length / questionsPerPage);
  
  for (let i = 0; i < questionComponents.length; i += questionsPerPage) {
    const pageComponents = questionComponents.slice(i, i + questionsPerPage);
    const pageNumber = Math.floor(i / questionsPerPage) + 1;
    
    if (pageComponents.length > 0) {
      pages.push({
        title: `Page ${pageNumber} of ${totalPages}`,
        label: `Page ${pageNumber} of ${totalPages}`,
        type: 'panel',
        key: `page${pageNumber}`,
        components: pageComponents,
      });
    }
  }

  console.log(`Converted form to wizard with ${pages.length} pages`);

  return {
    ...formSchema,
    display: 'wizard',
    components: pages,
    _converted: true,
  };
}

const EditSubmissionScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth({});
  const params = useLocalSearchParams<{ submissionId: string }>();
  const { getAll, update } = useSQLite();
  
  const [submission, setSubmission] = useState<SurveySubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [assetsReady, setAssetsReady] = useState(false);
  const [loadingStep, setLoadingStep] = useState("Initializing...");
  const [assetError, setAssetError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(true);
  const [formSchema, setFormSchema] = useState<any>(null);
  const [isSubmitting, setIssubmitting] = useState(false);
  const [loading,setLoading] = useState(true);
  const isSubmittingRef = useRef(false);
  const assetsLoadedRef = useRef(false);
  const networkStatusInitialized = useRef(false);
  
  const userId = user?.id || user?.json?.id;

  // Get the original form structure
  const { form: regularForm } = useGetFormById(submission?.form_data?.survey_id?.toString() || '');

  // Initial network check
  useEffect(() => {
    let mounted = true;

    const initialNetworkCheck = async () => {
      try {
        const isConnected = await checkNetworkConnection();
        if (mounted) {
          setIsOnline(isConnected);
          networkStatusInitialized.current = true;
          console.log("Initial network status:", isConnected ? "Online" : "Offline");
        }
      } catch (error) {
        console.warn("Error checking initial network status:", error);
        if (mounted) {
          setIsOnline(false);
          networkStatusInitialized.current = true;
        }
      }
    };

    initialNetworkCheck();

    return () => {
      mounted = false;
    };
  }, []);

  // Periodic network checking
  useEffect(() => {
    if (!networkStatusInitialized.current) {
      return;
    }

    let intervalId: number | null = null;

    const checkConnectivity = async () => {
      try {
        const isConnected = await checkNetworkConnection();
        
        setIsOnline(prevIsOnline => {
          if (isConnected !== prevIsOnline) {
            console.log("Network status changed:", isConnected ? "Online" : "Offline");
            
            Toast.show({
              type: isConnected ? "success" : "info",
              text1: isConnected ? "Back Online" : "Offline Mode",
              text2: isConnected ? "Connected to network" : "Using cached resources",
              position: "top",
              visibilityTime: 2000,
            });
          }
          
          return isConnected;
        });
      } catch (error) {
        console.warn("Error checking network status:", error);
      }
    };
    
    intervalId = setInterval(checkConnectivity, 30000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [networkStatusInitialized.current]);

  // Download and cache FormIO assets
  useEffect(() => {
    if (!networkStatusInitialized.current) {
      return;
    }

    let isMounted = true;

    const downloadAndCacheAssets = async () => {
      if (assetsLoadedRef.current) {
        if (isMounted) {
          setAssetsReady(true);
        }
        return;
      }

      try {
        setLoadingStep("Checking cached assets...");
        
        const jsPath = `${FileSystem.cacheDirectory}formio.full.min.js`;
        const cssPath = `${FileSystem.cacheDirectory}formio.full.min.css`;
        const bootstrapPath = `${FileSystem.cacheDirectory}bootstrap.min.css`;

        const [jsInfo, cssInfo, bootstrapInfo] = await Promise.all([
          FileSystem.getInfoAsync(jsPath),
          FileSystem.getInfoAsync(cssPath),
          FileSystem.getInfoAsync(bootstrapPath),
        ]);

        const allExist = jsInfo.exists && cssInfo.exists && bootstrapInfo.exists;

        if (allExist) {
          console.log("Using cached assets");
          if (isMounted) {
            assetsLoadedRef.current = true;
            setAssetsReady(true);
            setLoadingStep("");
          }
          return;
        }

        if (!isOnline) {
          console.error("Offline and no cached assets available");
          if (isMounted) {
            setAssetError("Form assets not available offline. Please connect to the internet to download required files.");
            setLoadingStep("");
          }
          return;
        }

        setLoadingStep("Downloading FormIO assets...");
        console.log("Downloading FormIO assets from CDN...");
        
        const downloads = [
          {
            url: "https://cdn.form.io/formiojs/formio.full.min.js",
            path: jsPath,
            name: "FormIO JS"
          },
          {
            url: "https://cdn.form.io/formiojs/formio.full.min.css",
            path: cssPath,
            name: "FormIO CSS"
          },
          {
            url: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
            path: bootstrapPath,
            name: "Bootstrap CSS"
          },
        ];

        const results = await Promise.allSettled(
          downloads.map(({ url, path, name }) =>
            FileSystem.downloadAsync(url, path).then(() => ({ name, success: true }))
          )
        );

        const allSucceeded = results.every(result => result.status === 'fulfilled');
        
        if (!allSucceeded) {
          const failed = results
            .map((result, index) => result.status === 'rejected' ? downloads[index].name : null)
            .filter(Boolean);
          
          console.error("Failed to download assets:", failed);
          
          if (isMounted) {
            setAssetError(`Failed to download required assets: ${failed.join(', ')}. Please check your internet connection.`);
            setLoadingStep("");
          }
          return;
        }

        console.log("Assets downloaded successfully");

        if (isMounted) {
          assetsLoadedRef.current = true;
          setAssetsReady(true);
          setLoadingStep("");
        }
      } catch (error) {
        console.error("Error with assets:", error);
        if (isMounted) {
          setAssetError("Failed to load form assets. Please check your internet connection and try again.");
          setLoadingStep("");
        }
      }
    };

    downloadAndCacheAssets();

    return () => {
      isMounted = false;
    };
  }, [isOnline, networkStatusInitialized.current]);

  // Load submission
  useEffect(() => {
    const loadSubmission = async () => {
      try {
        setIsLoading(true);
        const allSubmissions = await getAll("SurveySubmissions");
        const parsedSubmissions = allSubmissions.map(parseSQLiteRow);
        
        const found = parsedSubmissions.find(
          (s: SurveySubmission) => s._id === params.submissionId
        );
        
        if (found) {
          setSubmission(found);
          console.log("Loaded submission:", found);
        } else {
          Alert.alert(
            t("CommonPage.error") || "Error",
            "Submission not found",
            [{ text: t("CommonPage.ok") || "OK", onPress: () => router.back() }]
          );
        }
      } catch (error) {
        console.error("Error loading submission:", error);
        Alert.alert(
          t("CommonPage.error") || "Error",
          "Failed to load submission",
          [{ text: t("CommonPage.ok") || "OK", onPress: () => router.back() }]
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadSubmission();
  }, [params.submissionId]);

  const parsedForm = useMemo(() => {
    if (!regularForm?.json) {
      console.log('No form json available');
      return null;
    }

    try {
      console.log('Parsing form JSON...');
      let baseForm;
      
      if (typeof regularForm.json === "string") {
        baseForm = JSON.parse(regularForm.json);
      } else if (typeof regularForm.json === "object") {
        baseForm = JSON.parse(JSON.stringify(regularForm.json));
      } else {
        console.error('Invalid json format:', typeof regularForm.json);
        return null;
      }
      
      console.log('Form parsed successfully, converting to wizard...');
      const wizardForm = convertToWizardForm(baseForm, 5);
      console.log('Wizard conversion complete');
      
      return wizardForm;
    } catch (err) {
      console.error("Failed to parse form JSON:", err);
      return null;
    }
  }, [regularForm?.json]);

  const handleFormSubmission = useCallback(
    async (formData: any) => {
      console.log("handleFormSubmission called with data:", formData);
      
      if (isSubmittingRef.current || !submission) {
        console.warn("Already submitting or no submission, ignoring");
        return;
      }

      isSubmittingRef.current = true;
      setIsSaving(true);
      setIssubmitting(true);

      try {

        // Save locally first
        await updateSurveySubmissionLocally(
          getAll,
          update,
          submission._id!,
          { data: formData },
          userId
        );

        console.log("Updated locally");

        // If online and has remote ID, sync to server
        if (isOnline && submission.id) {
          Toast.show({
            type: "info",
            text1: "Syncing...",
            text2: "Uploading changes to server",
            position: "top",
            visibilityTime: 2000,
          });

          const allSubmissions = await getAll("SurveySubmissions");
          const parsedSubmissions = allSubmissions.map(parseSQLiteRow);
          const updatedSubmission = parsedSubmissions.find(
            (s: SurveySubmission) => s._id === submission._id
          );

          if (updatedSubmission) {
            await updateSurveySubmissionOnServer(updatedSubmission, t);

            await update("SurveySubmissions", submission._id!, {
              sync_status: 1,
              needs_update_sync: 0,
              is_modified: 0,
              sync_reason: "Successfully updated on server",
              updated_at: new Date().toISOString(),
            });

            Toast.show({
              type: "success",
              text1: t("Alerts.success.title") || "Success",
              text2: "Changes synced successfully",
              position: "top",
              visibilityTime: 3000,
            });
          }
        } else {
          Toast.show({
            type: "success",
            text1: t("Alerts.success.title") || "Success",
            text2: "Changes saved locally",
            position: "top",
            visibilityTime: 3000,
          });
        }

        // Navigate back after a short delay to ensure toast is visible
        setTimeout(() => {
          router.back();
        }, 500);
      } catch (error: any) {
        console.error("Error saving:", error);
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title") || "Error",
          text2: error?.response?.data?.message || "Failed to save changes",
          position: "top",
          visibilityTime: 4000,
        });
      } finally {
        isSubmittingRef.current = false;
        setIsSaving(false);
      }
    },
    [submission, getAll, update, userId, isOnline, t]
  );

  const handleWebViewMessage = useCallback(
    (event: any) => {
      try {
        const message = JSON.parse(event.nativeEvent.data);
        console.log("WebView message:", message.type);

        switch (message.type) {
          case "FORM_READY":
            console.log("Form is ready and displayed");
            setFormLoading(false);
            break;
            
          case "FORM_SUBMIT":
            console.log("Form submitted");
            handleFormSubmission(message.data);
            break;
            
          case "FORM_ERROR":
            console.error("Form error:", message.error);
            setFormLoading(false);
            Toast.show({
              type: "error",
              text1: t("Alerts.error.title") || "Error",
              text2: message.error || "Form error",
              position: "top",
              visibilityTime: 4000,
            });
            break;
            
          case "FORM_VALIDATION_ERROR":
            Toast.show({
              type: "error",
              text1: "Validation Error",
              text2: "Please check all required fields",
              position: "top",
              visibilityTime: 3000,
            });
            break;
            
          case "DEBUG":
            console.log("Debug:", message.message);
            break;
            
          default:
            console.log("Unknown message:", message.type);
        }
      } catch (err) {
        console.error("Failed to parse WebView message:", err);
      }
    },
    [handleFormSubmission, t]
  );

  const formHtml = useMemo(() => {
    console.log(parsedForm)
    console.log(submission)
    console.log("assets ready:", assetsReady);
    if (!parsedForm || !assetsReady) {
      console.log('Cannot generate HTML - missing requirements');
      return "";
    }

    try {
      const formJsonString = JSON.stringify(parsedForm);
      const escapedFormJson = formJsonString.replace(/</g, "\\u003c");
      
      // Pre-fill the form with existing submission data
      const submissionData = JSON.stringify(submission.data || {});
      const escapedSubmissionData = submissionData.replace(/</g, "\\u003c");
      
      const escapedFormName = (regularForm?.name || "Edit Form").replace(/'/g, "\\'");
      const totalPages = parsedForm.display === 'wizard' && Array.isArray(parsedForm.components) 
        ? parsedForm.components.length 
        : 1;

      console.log('Generating form HTML with pre-filled data');

      const jsPath = `${FileSystem.cacheDirectory}formio.full.min.js`;
      const cssPath = `${FileSystem.cacheDirectory}formio.full.min.css`;
      const bootstrapPath = `${FileSystem.cacheDirectory}bootstrap.min.css`;

      return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Edit Form</title>
    <link href="${cssPath}" rel="stylesheet" onerror="this.href='https://cdn.form.io/formiojs/formio.full.min.css'">
    <link href="${bootstrapPath}" rel="stylesheet" onerror="this.href='https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
      :root {
        --primary-color: #00227c;
        --primary-light: #1d4097ff;
        --primary-dark: #001a5e;
      }
      body { 
        margin: 0; 
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f5f5f5;
      }
      .form-container {
        margin: 20px auto;
        padding: 20px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      .form-title {
        color: var(--primary-color);
        font-size: 24px;
        font-weight: 600;
        text-align: center;
        margin-bottom: 10px;
      }
      .edit-badge {
        display: inline-block;
        background: #FFA500;
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        margin-left: 10px;
      }
      
      .custom-progress-container {
        margin: 15px 0 25px 0;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
      }
      
      .custom-progress-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        font-size: 14px;
        color: #666;
      }
      
      .custom-progress-text {
        font-weight: 600;
        color: var(--primary-color);
      }
      
      .custom-progress-bar-container {
        width: 100%;
        height: 8px;
        background: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .custom-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, var(--primary-color), var(--primary-light));
        border-radius: 4px;
        transition: width 0.3s ease;
      }
      
      .pagination {
        display: none !important;
      }
      
      .btn-wizard-nav-cancel,
      .btn-wizard-nav-previous,
      .btn-wizard-nav-next,
      .btn-wizard-nav-submit {
        border-radius: 8px;
        padding: 10px 24px;
        font-weight: 600;
        border: none;
        margin: .7em 0px;
      }
      
      .btn-wizard-nav-next,
      .btn-wizard-nav-submit {
        background: var(--primary-color) !important;
        color: white !important;
      }
      
      .btn-wizard-nav-next:hover,
      .btn-wizard-nav-submit:hover {
        background: var(--primary-dark) !important;
      }
      
      .btn-wizard-nav-previous {
        background: #6c757d !important;
        color: white !important;
      }
      
      .btn-wizard-nav-cancel {
        background: #dc3545 !important;
        color: white !important;
      }
      
      .form-control:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(0, 34, 124, 0.1);
      }
      
      /* Highlight pre-filled fields with existing values */
      .form-control[value]:not([value=""]) {
        background-color: #fff3cd;
        border-color: #ffc107;
      }
      
      .form-check-input:checked {
        background-color: var(--primary-color);
        border-color: var(--primary-color);
      }
      
      .loading {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 300px;
        font-size: 18px;
        color: var(--primary-color);
      }
      
      .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid var(--primary-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 15px;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div class="form-container">
      <div class="form-title">
        ${escapedFormName}
        <span class="edit-badge">EDITING</span>
      </div>
      <div id="custom-progress" class="custom-progress-container" style="display: none;">
        <div class="custom-progress-info">
          <span class="custom-progress-text" id="progress-text">Page 1 of ${totalPages}</span>
          <span id="progress-percentage">0%</span>
        </div>
        <div class="custom-progress-bar-container">
          <div class="custom-progress-bar" id="progress-bar" style="width: 0%"></div>
        </div>
      </div>
      <div id="loading" class="loading">
        <div class="loading-spinner"></div>
        <div>Loading form with your data...</div>
      </div>
      <div id="formio" style="display: none;"></div>
    </div>
    <script>
      Object.defineProperty(document, 'cookie', {
        get: function() { return ''; },
        set: function() { return true; }
      });
      
      const originalError = console.error;
      console.error = function(...args) {
        const message = args.join(' ');
        if (message.includes('cookie') || message.includes('Cookie')) {
          return;
        }
        originalError.apply(console, args);
      };
    </script>
    <script src="${jsPath}" onerror="this.src='https://cdn.form.io/formiojs/formio.full.min.js'"></script>
    <script>
      (function() {
        const loadingEl = document.getElementById('loading');
        const formioEl = document.getElementById('formio');
        const TOTAL_PAGES = ${totalPages};
        let formInitialized = false;
        let initAttempts = 0;
        const MAX_INIT_ATTEMPTS = 30;
        const RETRY_DELAY = 500;
        
        function postMessage(data) {
          try {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify(data));
            } else {
              console.warn('ReactNativeWebView not available');
            }
          } catch (err) {
            console.error('Error posting message:', err);
          }
        }

        async function initializeForm() {
          if (formInitialized) {
            console.log('Form already initialized, skipping');
            return;
          }
          
          if (typeof Formio === 'undefined' || !window.Formio || !window.Formio.createForm) {
            initAttempts++;
            console.log('Formio not ready, attempt ' + initAttempts + '/' + MAX_INIT_ATTEMPTS);
            
            if (initAttempts < MAX_INIT_ATTEMPTS) {
              setTimeout(initializeForm, RETRY_DELAY);
              return;
            } else {
              const errorMsg = 'FormIO library failed to load. Please check your internet connection.';
              console.error(errorMsg);
              loadingEl.innerHTML = '<div style="color: red; padding: 20px; text-align: center;">' + errorMsg + '</div>';
              postMessage({ type: 'FORM_ERROR', error: errorMsg });
              return;
            }
          }
          
          formInitialized = true;
          console.log('Formio loaded successfully, initializing form...');
          
          try {
            const formSchema = ${escapedFormJson};
            const existingData = ${escapedSubmissionData};
            
            console.log('Creating form with existing data:', existingData);
            
            const form = await Formio.createForm(formioEl, formSchema, {
              noAlerts: true,
              readOnly: false,
              sanitize: true,
              buttonSettings: {
                showCancel: false,
                showPrevious: true,
                showNext: true,
                showSubmit: true
              }
            });

            // Pre-fill form with existing data
            if (existingData && Object.keys(existingData).length > 0) {
              form.submission = {
                data: existingData
              };
              console.log('Form pre-filled with existing data');
              
              // Add a slight delay to ensure rendering completes
              setTimeout(() => {
                // Add visual highlighting to pre-filled fields
                const inputs = document.querySelectorAll('.form-control, .form-check-input, .form-select');
                inputs.forEach(input => {
                  if (input.value && input.value !== '') {
                    input.style.backgroundColor = '#fff3cd';
                    input.style.borderColor = '#ffc107';
                  }
                });
              }, 100);
            }

            console.log('Form created successfully');
            
            loadingEl.style.display = 'none';
            formioEl.style.display = 'block';
            
            const isWizard = formSchema.display === 'wizard';
            const progressContainer = document.getElementById('custom-progress');
            const progressText = document.getElementById('progress-text');
            const progressBar = document.getElementById('progress-bar');
            const progressPercentage = document.getElementById('progress-percentage');
            
            if (isWizard && TOTAL_PAGES > 1) {
              progressContainer.style.display = 'block';
              
              function updateProgress(currentPage) {
                const pageNum = currentPage + 1;
                const percentage = Math.round((pageNum / TOTAL_PAGES) * 100);
                
                progressText.textContent = \`Page \${pageNum} of \${TOTAL_PAGES}\`;
                progressPercentage.textContent = \`\${percentage}%\`;
                progressBar.style.width = \`\${percentage}%\`;
              }
              
              updateProgress(0);
              
              form.on('wizardPageSelected', function(page) {
                updateProgress(page);
              });
            }

            form.on('submit', function(submission) {
              console.log('Form submitted with updated data');
              postMessage({ 
                type: 'FORM_SUBMIT', 
                data: submission.data 
              });
            });

            form.on('error', function(errors) {
              console.error('Form error:', errors);
              postMessage({ 
                type: 'FORM_ERROR', 
                error: JSON.stringify(errors)
              });
            });

            form.on('change', function(changed) {
              console.log('Form changed:', changed);
            });

            postMessage({ type: 'FORM_READY' });
            console.log('Form ready and displayed with existing data');
            
          } catch (error) {
            console.error('Form initialization error:', error);
            loadingEl.innerHTML = '<div style="color: red; padding: 20px; text-align: center;">Error: ' + error.message + '</div>';
            postMessage({ type: 'FORM_ERROR', error: error.message });
          }
        }

        function waitForFormio() {
          console.log('Waiting for Formio to load...');
          if (typeof window.Formio !== 'undefined' && window.Formio && window.Formio.createForm) {
            console.log('Formio detected, initializing...');
            initializeForm();
          } else {
            setTimeout(waitForFormio, 200);
          }
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', waitForFormio);
        } else {
          else {
                        waitForFormio();
                      }
                    })();
                  </script>
                </body>
              </html>
                `;
              } catch (err) {
                console.error('Error generating form HTML:', err);
                return "";
              }
            }, [parsedForm, regularForm?.name, assetsReady]);
          
            // Show error if assets couldn't be loaded
            if (assetError) {
              return (
                <SafeAreaView className="flex-1 bg-background">
                  <HeaderNavigation title={t("FormElementPage.title")} showLeft showRight />
                  <View className="flex-1 items-center justify-center px-6">
                    <View className="items-center">
                      <Text className="text-6xl mb-4">📡</Text>
                      <Text className="text-xl font-bold text-gray-800 text-center mb-2">
                        Assets Not Available
                      </Text>
                      <Text className="text-gray-600 text-center mb-6">
                        {assetError}
                      </Text>
                      <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <Text className="text-sm text-blue-800 text-center">
                          Tip: Connect to the internet and reload this form to download required assets for offline use.
                        </Text>
                      </View>
                    </View>
                  </View>
                </SafeAreaView>
              );
            }
          
            if (isLoading || !assetsReady || !networkStatusInitialized.current) {
              return (
                <View className="flex-1 items-center justify-center bg-white">
                  <ActivityIndicator size="large" color="#00227c" />
                  <Text className="mt-3 text-gray-600 font-medium">{loadingStep || "Loading..."}</Text>
                  {!isOnline && (
                    <Text className="mt-2 text-sm text-amber-600">
                      Offline - checking cached assets...
                    </Text>
                  )}
                </View>
              );
            }
          
            if (!regularForm) {
              return <NotFound title="Form not found" description="Please try again" />;
            }
          
            if (!parsedForm) {
              return <NotFound title="Form error" description="Form JSON is invalid." />;
            }
          
            return (
              <SafeAreaView className="flex-1 bg-background">
                <HeaderNavigation title={t("FormElementPage.title")} showLeft showRight />
                <WebView
                  originWhitelist={["*"]}
                  source={{ html: formHtml, baseUrl: 'about:blank' }}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  onMessage={handleWebViewMessage}
                  cacheEnabled={true}
                  sharedCookiesEnabled={false}
                  thirdPartyCookiesEnabled={false}
                  incognito={true}
                  allowFileAccess={true}
                  allowFileAccessFromFileURLs={true}
                  allowUniversalAccessFromFileURLs={true}
                  mixedContentMode="always"
                  onError={(syntheticEvent) => {
                    console.warn("WebView error:", syntheticEvent.nativeEvent);
                    setLoading(false);
                  }}
                  onHttpError={(syntheticEvent) => {
                    console.warn("WebView HTTP error:", syntheticEvent.nativeEvent);
                  }}
                  onLoadEnd={() => {
                    console.log("WebView loaded");
                    setLoading(false)
                  
                  }}
                />
                {loading && (
                  <View className="absolute inset-0 items-center justify-center bg-white bg-opacity-95">
                    <ActivityIndicator size="large" color="#00227c" />
                    <Text className="mt-3 text-gray-600 font-medium">{t("FormElementPage.loading_form")}</Text>
                    {/* <Text className="mt-2 text-sm text-gray-500">
                      {isOnline ? "Loading from server..." : "Loading from cache..."}
                    </Text> */}
                  </View>
                )}
                {isSubmitting && (
                  <View className="absolute inset-0 items-center justify-center bg-background bg-opacity-50">
                    <View className="bg-white p-6 rounded-lg items-center">
                      <ActivityIndicator size="large" color="#00227c" />
                      <Text className="mt-3 text-gray-700 font-medium">{t("FormElementPage.save")}</Text>
                    </View>
                  </View>
                )}
              </SafeAreaView>
            );
          }
          
          export default EditSubmissionScreen  ;
