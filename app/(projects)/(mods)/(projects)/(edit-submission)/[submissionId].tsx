import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
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
import { useMediaPicker, MediaResult } from "~/lib/hooks/useMediaPicker";
import { parseTranslations, translateFormSchema } from "~/components/utils-form/form-translation";
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

function EditSubmissionScreen(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { user } = useAuth({});
  const params = useLocalSearchParams<{ submissionId: string }>();
  const { getAll, update } = useSQLite();
  const [selectedMedia, setSelectedMedia] = useState<MediaResult[] | null>(null);
  const [submission, setSubmission] = useState<SurveySubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [assetsReady, setAssetsReady] = useState(false);
  const [loadingStep, setLoadingStep] = useState("Initializing...");
  const [assetError, setAssetError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const currentLang = i18n.language;
  const normalizedLang = currentLang.split('-')[0].toLowerCase();
  const assetsLoadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const networkStatusInitialized = useRef(false);


  const userId = user?.id || user?.json?.id;

  // Get the original form structure
  const { form: regularForm } = useGetFormById(submission?.form_data?.survey_id?.toString() || '');
  const { pickImage, takePhoto, pickVideo, pickMedia } = useMediaPicker();
  const webViewRef = useRef<WebView>(null);
  const handleMediaUpload = useCallback(async (fieldKey: string, allowMultiple: boolean = false) => {
    try {
      console.log("Media upload requested for field:", fieldKey, "Allow multiple:", allowMultiple);

      Alert.alert(
        'Select Media',
        'Choose how to add media',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              try {
                const photo = await takePhoto();
                console.log("Photo taken:", photo);
                if (photo && webViewRef.current) {
                  const message = JSON.stringify({
                    type: 'MEDIA_SELECTED',
                    fieldKey: fieldKey,
                    media: [photo]
                  });
                  console.log("Sending photo to WebView:", message);
                  webViewRef.current.postMessage(message);
                }
              } catch (error) {
                console.error("Error taking photo:", error);
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Failed to take photo',
                  position: 'top',
                  visibilityTime: 3000,
                });
              }
            },
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              try {
                const images = await pickImage({ allowsMultipleSelection: allowMultiple });
                console.log("Images selected:", images);
                if (images && images.length > 0 && webViewRef.current) {
                  const message = JSON.stringify({
                    type: 'MEDIA_SELECTED',
                    fieldKey: fieldKey,
                    media: images
                  });
                  console.log("Sending images to WebView:", message);
                  webViewRef.current.postMessage(message);
                }
              } catch (error) {
                console.error("Error picking images:", error);
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Failed to select images',
                  position: 'top',
                  visibilityTime: 3000,
                });
              }
            },
          },
          {
            text: 'Choose Video',
            onPress: async () => {
              try {
                const video = await pickVideo();
                console.log("Video selected:", video);
                if (video && webViewRef.current) {
                  const message = JSON.stringify({
                    type: 'MEDIA_SELECTED',
                    fieldKey: fieldKey,
                    media: [video]
                  });
                  console.log("Sending video to WebView:", message);
                  webViewRef.current.postMessage(message);
                }
              } catch (error) {
                console.error("Error picking video:", error);
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Failed to select video',
                  position: 'top',
                  visibilityTime: 3000,
                });
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('Error in handleMediaUpload:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to open media picker',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  }, [takePhoto, pickImage, pickVideo]);
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
        setIsSubmitting(false);
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
      let translatedForm = baseForm;
      if (regularForm.translations) {
        console.log(`translating form to ${currentLang}...`);
        console.log('Translation type:', typeof regularForm.translations);
        console.log('Translation data:', regularForm.translations);

        // Parse the translations string into an object
        const parsedTranslations = parseTranslations(regularForm.translations);

        if (parsedTranslations) {
          console.log('Parsed translations successfully:', parsedTranslations);
          translatedForm = translateFormSchema(baseForm, parsedTranslations, currentLang);
        } else {
          console.log('Failed to parse translations');
        }
      }

      console.log('Form parsed successfully, converting to wizard...');
      const wizardForm = convertToWizardForm(translatedForm, 5);
      console.log('Wizard conversion complete', wizardForm);

      return wizardForm;
    } catch (err) {
      console.error("Failed to parse form JSON:", err);
      return null;
    }
  }, [regularForm?.json]);

  const handleFormSubmission = useCallback(
    async (formData: any) => {

      if (isSubmittingRef.current || !submission) {
        console.warn("Already submitting or no submission, ignoring");
        return;
      }

      isSubmittingRef.current = true;
      setIsSaving(true);
      setIsSubmitting(true);

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
        if (isOnline && submission.id) {
          Toast.show({
            type: "info",
            text1: t("Login.syncingData") || "Syncing",
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
              position: "top",
              visibilityTime: 3000,
            });
          }
        } else {
          Toast.show({
            type: "success",
            text1: t("Alerts.success.title") || "Success",
            position: "top",
            visibilityTime: 3000,
          });
        }


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
        const messageData = event.nativeEvent.data;
        const message = typeof messageData === 'string' ? JSON.parse(messageData) : messageData;
        console.log("WebView message:", message.type);

        switch (message.type) {
          case "FORM_READY":
            console.log("Form is ready and displayed");
            setLoading(false);
            break;

          case "FORM_SUBMIT":
            handleFormSubmission(message.data);
            break;

          case "FORM_ERROR":
            console.error("Form error:", message.error);
            setLoading(false);
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

          case "FORM_CHANGE":
            break;

          case "DEBUG":
            console.log("Debug:", message.message);
            break;

          case "REQUEST_MEDIA":
            console.log("Media upload requested for field:", message.fieldKey, "Allow multiple:", message.allowMultiple);
            handleMediaUpload(message.fieldKey, message.allowMultiple);
            break;

          default:
            console.log("Unknown message:", message.type);
        }
      } catch (err) {
        console.error("Failed to parse WebView message:", err, "Data:", event.nativeEvent.data);
      }
    },
    [handleFormSubmission, t, handleMediaUpload]
  );
  const formHtml = useMemo(() => {
      if (!parsedForm) {
        console.log('Cannot generate HTML - form not ready');
        return "";
      }
  
      if (!assetsReady) {
        console.log('Cannot generate HTML - assets not ready');
        return "";
      }
  
      try {
        const formJsonString = JSON.stringify(parsedForm);
        const escapedFormJson = formJsonString
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "\\'")
          .replace(/"/g, '\\"')
          .replace(/</g, '\\u003c')
          .replace(/>/g, '\\u003e')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r');
        const escapedFormName = (parsedForm.title || regularForm?.name || "Form").replace(/'/g, "\\'");
        const totalPages = parsedForm.display === 'wizard' && Array.isArray(parsedForm.components)
          ? parsedForm.components.length
          : 1;
  
        console.log('Generating form HTML with', totalPages, 'pages');
  
        const jsPath = `${FileSystem.cacheDirectory}formio.full.min.js`;
        const cssPath = `${FileSystem.cacheDirectory}formio.full.min.css`;
        const bootstrapPath = `${FileSystem.cacheDirectory}bootstrap.min.css`;
        const reviewTranslations = {
          reviewTitle: t("ReviewPage.title") || "Review Your Answers",
          reviewSubtitle: t("ReviewPage.description") || "Please review your answers carefully before submitting. You can go back to make changes if needed.",
          pageOf: t("ReviewPage.pageOf") || "Page {page} of {total}",
          notProvided: t("ReviewPage.notProvided") || "Not provided",
          yes: t("ReviewPage.yes") || "Yes",
          no: t("ReviewPage.no") || "No"
        };
        const btnTranslations = {
          en: {
            submit: 'Submit',
            cancel: 'Cancel',
            previous: 'Previous',
            next: 'Next'
          },
          es: {
            submit: 'Enviar',
            cancel: 'Cancelar',
            previous: 'Anterior',
            next: 'Siguiente'
          },
          fr: {
            submit: 'Soumettre',
            cancel: 'Annuler',
            previous: 'Précédent',
            next: 'Suivant'
          },
          rw:{
            submit :"Ohereza",
            cancel:"Reka",
            previous:"Subira Inyuma",
            next:"Komeza"
          }
        }
        const currentBtnTranslations = btnTranslations[normalizedLang] || btnTranslations['en'];
      
      console.log('Current language:', normalizedLang);
      console.log('Button translations:', currentBtnTranslations);
        const escapedReviewTranslations = JSON.stringify(reviewTranslations)
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "\\'")
          .replace(/"/g, '\\"');
             // Escape button translations for injection
      const escapedBtnTranslations = JSON.stringify(currentBtnTranslations)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"');
      const submissionData = JSON.stringify(submission.data || {});
      const escapedSubmissionData = submissionData.replace(/</g, "\\u003c");

        return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
          <title>Form</title>
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
              background: #a19e9eff !important;
              color: white !important;
            }
            
            .form-control:focus {
              border-color: var(--primary-color);
              box-shadow: 0 0 0 3px rgba(162, 58, 145, 0.1);
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
  
            /* Review Page Styles */
            .review-container {
              background: #f8f9fa;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
  
            .review-header {
              background: var(--primary-color);
              color: white;
              padding: 15px 20px;
              border-radius: 8px 8px 0 0;
              margin: -20px -20px 20px -20px;
            }
  
            .review-header h3 {
              margin: 0;
              font-size: 20px;
              font-weight: 600;
            }
  
            .review-section {
              background: white;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 15px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
  
            .review-section-title {
              color: var(--primary-color);
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 2px solid #e9ecef;
            }
  
            .review-item {
              padding: 12px 0;
              border-bottom: 1px solid #f0f0f0;
            }
  
            .review-item:last-child {
              border-bottom: none;
            }
  
            .review-label {
              font-weight: 600;
              color: #495057;
              margin-bottom: 5px;
              font-size: 14px;
            }
  
            .review-value {
              color: #212529;
              font-size: 15px;
              line-height: 1.5;
              word-wrap: break-word;
            }
  
            .review-empty {
              color: #6c757d;
              font-style: italic;
            }
  
            .review-file {
              display: inline-flex;
              align-items: center;
              background: #e7f3ff;
              padding: 8px 12px;
              border-radius: 6px;
              margin: 5px 5px 5px 0;
              font-size: 14px;
            }
  
            .review-file i {
              margin-right: 8px;
              color: var(--primary-color);
            }
  
            .review-image {
              max-width: 200px;
              max-height: 200px;
              border-radius: 8px;
              margin: 5px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
  
            .review-actions {
              margin-top: 25px;
              padding-top: 20px;
              border-top: 2px solid #e9ecef;
              display: flex;
              gap: 10px;
              flex-wrap: wrap;
            }
  
            .review-btn {
              padding: 12px 30px;
              border-radius: 8px;
              font-weight: 600;
              border: none;
              cursor: pointer;
              font-size: 16px;
              transition: all 0.3s ease;
            }
  
            .review-btn-submit {
              background: #28a745;
              color: white;
              flex: 1;
              min-width: 200px;
            }
  
            .review-btn-submit:hover {
              background: #218838;
              transform: translateY(-2px);
              box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
            }
  
            .review-btn-edit {
              background: var(--primary-color);
              color: white;
              flex: 1;
              min-width: 150px;
            }
  
            .review-btn-edit:hover {
              background: var(--primary-dark);
            }
  
            .review-list {
              padding-left: 20px;
            }
  
            .review-list li {
              margin: 5px 0;
            }
          </style>
          <script>
    let formInstance;
    document.addEventListener('click', function(e) {
      const target = e.target;
      
      // Check if clicking on file input, button, or label
      let fileInput = null;
      let componentElement = null;
      
      if (target.matches('input[type="file"]')) {
        fileInput = target;
        componentElement = target.closest('.formio-component-file');
      } else if (target.matches('button') && target.closest('.formio-component-file')) {
        componentElement = target.closest('.formio-component-file');
        fileInput = componentElement.querySelector('input[type="file"]');
      } else if (target.closest('label')) {
        const label = target.closest('label');
        fileInput = label.querySelector('input[type="file"]') || document.getElementById(label.getAttribute('for'));
        if (fileInput) {
          componentElement = fileInput.closest('.formio-component-file');
        }
      } else if (target.closest('.formio-component-file')) {
        componentElement = target.closest('.formio-component-file');
        fileInput = componentElement.querySelector('input[type="file"]');
      }
      
      if (fileInput && componentElement) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Try multiple ways to get the field key
        let fieldKey = fileInput.name || fileInput.id || fileInput.getAttribute('data-key');
        
        // If still no key, try to get it from the component element's ref attribute
        if (!fieldKey && componentElement) {
          fieldKey = componentElement.getAttribute('ref') || 
                     componentElement.getAttribute('data-component-key') ||
                     componentElement.id;
        }
        
        // If still no key, try to find it from FormIO's component structure
        if (!fieldKey && formInstance) {
          const components = formInstance.components;
          for (let comp of components) {
            if (comp.element === componentElement || componentElement.contains(comp.element)) {
              fieldKey = comp.component.key;
              break;
            }
          }
        }
        
        const allowMultiple = fileInput.hasAttribute('multiple');
        
        console.log('File input clicked, requesting media for:', fieldKey, 'Element:', componentElement);
        
        if (fieldKey) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'REQUEST_MEDIA',
            fieldKey: fieldKey,
            allowMultiple: allowMultiple
          }));
        } else {
          console.error('Could not determine field key for file input');
        }
        
        return false;
      }
    }, true);
    
    // Handle messages from React Native
    document.addEventListener('message', function(event) {
      handleMediaMessage(event.data);
    });
    
    window.addEventListener('message', function(event) {
      handleMediaMessage(event.data);
    });
    
    function handleMediaMessage(data) {
      try {
        const message = typeof data === 'string' ? JSON.parse(data) : data;
        
        if (message.type === 'MEDIA_SELECTED') {
          const fieldKey = message.fieldKey;
          const media = message.media;
          
          console.log('Media received for field:', fieldKey, media);
          
          if (!formInstance) {
            console.error('Form instance not available');
            return;
          }
          
          let component = formInstance.getComponent(fieldKey);
          
          if (!component) {
           
            let input = document.querySelector(\`input[name="\${fieldKey}"], input#\${fieldKey}\`);
            if (input) {
              const componentEl = input.closest('.formio-component');
              if (componentEl) {
                const componentKey = componentEl.getAttribute('ref');
                component = formInstance.getComponent(componentKey);
              }
            }
          }
          
          if (component && media && media.length > 0) {
            const formioFiles = media.map(item => ({
              name: item.name || 'file',
              size: item.size || 0,
              type: item.type || 'application/octet-stream',
              url: item.uri,
              uri: item.uri,
              storage: 'url',
              originalData: item
            }));
            
            console.log('Setting files on component:', formioFiles);
            
            if (component.component.multiple) {
              const currentValue = component.getValue() || [];
              component.setValue([...currentValue, ...formioFiles]);
            } else {
              component.setValue(formioFiles[0]);
            }
            
            // Trigger change event
            component.triggerChange();
            
            console.log('Media successfully added to field:', fieldKey);
          } else {
            console.error('Component not found or no media:', fieldKey);
          }
        }
      } catch (err) {
        console.error('Error handling media message:', err);
      }
    }
  </script>
        </head>
        <body>
          <div class="form-container">
            <div class="form-title">${escapedFormName}</div>
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
              <div>Loading form...</div>
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
              let form;
              const reviewTranslations = JSON.parse('${escapedReviewTranslations}');
              const currentLanguage = '${normalizedLang}';
              const buttonTranslations = JSON.parse('${escapedBtnTranslations}');
              
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
  
             function formatValue(value, label) {
      if (value === null || value === undefined || value === '') {
        return '<span class="review-empty">' + reviewTranslations.notProvided + '</span>';
      }
      
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return '<span class="review-empty">' + reviewTranslations.notProvided + '</span>';
        }
        
        if (value[0] && (value[0].url || value[0].uri)) {
          let html = '<div>';
          value.forEach(file => {
            const fileName = file.name || 'File';
            const fileUrl = file.url || file.uri;
            const isImage = file.type && file.type.startsWith('image');
            
            if (isImage) {
              html += \`<img src="\${fileUrl}" alt="\${fileName}" class="review-image" />\`;
            } else {
              html += \`<div class="review-file"><i class="fas fa-file"></i>\${fileName}</div>\`;
            }
          });
          html += '</div>';
          return html;
        }
        
        return '<ul class="review-list">' + value.map(v => '<li>' + String(v) + '</li>').join('') + '</ul>';
      }
                
               if (typeof value === 'object') {
        if (value.url || value.uri) {
          const fileName = value.name || 'File';
          const fileUrl = value.url || value.uri;
          const isImage = value.type && value.type.startsWith('image');
          
          if (isImage) {
            return \`<img src="\${fileUrl}" alt="\${fileName}" class="review-image" />\`;
          } else {
            return \`<div class="review-file"><i class="fas fa-file"></i>\${fileName}</div>\`;
          }
        }
        return '<pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto;">' + JSON.stringify(value, null, 2) + '</pre>';
      }
      
      if (typeof value === 'boolean') {
        return value 
          ? '<i class="fas fa-check-circle" style="color: #28a745;"></i> ' + reviewTranslations.yes
          : '<i class="fas fa-times-circle" style="color: #dc3545;"></i> ' + reviewTranslations.no;
      }
      
      return String(value);
    }
  
   function generateReviewPage(formData, components) {
      let html = \`
        <div class="review-container">
          <div class="review-header">
            <h3><i class="fas fa-clipboard-check"></i> \${reviewTranslations.reviewTitle}</h3>
          </div>
          <p style="margin-bottom: 20px; color: #6c757d;">\${reviewTranslations.reviewSubtitle}</p>
      \`;
  
      const pages = {};
      components.forEach((comp, index) => {
        const pageNum = Math.floor(index / 5) + 1;
        if (!pages[pageNum]) {
          pages[pageNum] = [];
        }
        pages[pageNum].push(comp);
      });
  
      Object.keys(pages).forEach(pageNum => {
        const pageText = reviewTranslations.pageOf
          .replace('{page}', pageNum)
          .replace('{total}', Object.keys(pages).length);
          
        html += \`
          <div class="review-section">
            <div class="review-section-title">
              <i class="fas fa-list-ul"></i> \${pageText}
            </div>
        \`;
  
        pages[pageNum].forEach(comp => {
          if (comp.type === 'button' || comp.type === 'htmlelement') return;
          
          const label = comp.label || comp.key;
          const value = formData[comp.key];
          
          html += \`
            <div class="review-item">
              <div class="review-label">\${label}</div>
              <div class="review-value">\${formatValue(value, label)}</div>
            </div>
          \`;
        });
  
        html += '</div>';
      });
      html += '</div>';
      return html;
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
                  const formSchema = JSON.parse('${escapedFormJson}');
                  const existingData = JSON.parse('${escapedSubmissionData}');
                  const allComponents = [];
                  if (formSchema.display === 'wizard' && Array.isArray(formSchema.components)) {
                    formSchema.components.forEach(page => {
                      if (page.components) {
                        allComponents.push(...page.components);
                      }
                    });
  
                    formSchema.components.push({
                      title: 'Review Your Answers',
                      label: 'Review',
                      key: 'reviewPage',
                      type: 'panel',
                      components: [{
                        type: 'htmlelement',
                        tag: 'div',
                        content: '<div id="reviewContent"></div>',
                        className: 'reviewSummary',
                        key: 'reviewSummary'
                      }]
                    });
                  }
  
                  // Create form with translations
                  form = await Formio.createForm(formioEl, formSchema, {
                    noAlerts: true,
                    readOnly: false,
                    sanitize: true,
                    language: currentLanguage,
                    i18n: {
                      [currentLanguage]: buttonTranslations
                    },
                    buttonSettings: {
                      showCancel: true,
                      showPrevious: true,
                      showNext: true,
                      showSubmit: true
                    }
                  });

                  window.form = form;
                  formInstance = form;
                  //prefil the form with existing data
                   if (existingData && Object.keys(existingData).length > 0) {
                    form.submission = { data: existingData };
                    console.log('Form pre-filled with', Object.keys(existingData).length, 'fields');
                    }
                  console.log('Form created successfully');
                  
                  form.on('nextPage', function() {
                    if (form.page === form.pages.length - 1) {
                      const reviewContent = document.getElementById('reviewContent');
                      if (reviewContent) {
                        const data = form.submission.data;
                        reviewContent.innerHTML = generateReviewPage(data, allComponents);
                      }
                    }
                  });
  
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
                      const percentage = Math.round((pageNum / (TOTAL_PAGES + 1)) * 100);
                      
                      if (currentPage === form.pages.length - 1) {
                        progressText.textContent = 'Review';
                      } else {
                        progressText.textContent = \`Page \${pageNum} of \${TOTAL_PAGES}\`;
                      }
                      
                      progressPercentage.textContent = \`\${percentage}%\`;
                      progressBar.style.width = \`\${percentage}%\`;
                    }
                    
                    updateProgress(form.page);
                    
                    form.on('wizardPageSelected', function() {
                      updateProgress(form.page);
                    });
                    form.on('prevPage', function() {
                      updateProgress(form.page);
                    });
                    form.on('nextPage', function() {
                      updateProgress(form.page);
                    });
                    form.on('change', function() {
                      updateProgress(form.page);
                    });
                  }
  
                  form.on('submit', function(submission) {
                    console.log('Form submitted');
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
  
                  postMessage({ type: 'FORM_READY' });
                  console.log('Form ready and displayed');
                  
                } catch (error) {
                  console.error('Form initialization error:', error);
                  loadingEl.innerHTML = '<div style="color: red; padding: 20px; text-align: center;">Error: ' + error.message + '</div>';
                  postMessage({ type: 'FORM_ERROR', error: error.message });
                }
              }
  
              function waitForFormio() {
                console.log('Waiting for page to load...');
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
        {/* <Text className="mt-3 text-gray-600 font-medium">{loadingStep || "Loading..."}</Text> */}
        {!isOnline && (
          // 
          <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            {/* <Text className="text-sm text-yellow-800 text-center">
              You are currently offline. Some features may be unavailable until you reconnect.
            </Text> */}
          </View>
        )}
      </View>
    );
  }

  // if (!parsedForm) {
  //   return <NotFound title="Form error" description="Form JSON is invalid." />;
  // }

  if (!submission) {
    return <NotFound title="Submission not found" description="Please try again" />;
  }

  // CRITICAL FIX: Don't render WebView if formHtml is null
  if (!formHtml) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#00227c" />
        <Text className="mt-3 text-gray-600 font-medium">{t("FormElementPage.loading_form")}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation title={t("FormElementPage.title")} showLeft showRight />
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: formHtml, baseUrl: `${process.env.EXPO_PUBLIC_API_URL}/api/uploads` }}
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
        startInLoadingState={true}
        onError={(syntheticEvent) => {
          console.warn("WebView error:", syntheticEvent.nativeEvent);
          setFormLoading(false);
        }}
        onHttpError={(syntheticEvent) => {
          console.warn("WebView HTTP error:", syntheticEvent.nativeEvent);
        }}
        onLoadEnd={() => {
          console.log("WebView loaded");
          setFormLoading(false);
        }}
      />
      {formLoading && (
        <View className="absolute inset-0 items-center justify-center bg-white bg-opacity-95">
          <ActivityIndicator size="large" color="#00227c" />
          <Text className="mt-3 text-gray-600 font-medium">{t("FormElementPage.loading_form")}</Text>
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

export default EditSubmissionScreen;