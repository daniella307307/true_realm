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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    // CRITICAL FIX: Check all required conditions
    if (!parsedForm || !submission || !assetsReady) {
      console.log('Cannot generate HTML - missing requirements', {
        hasParsedForm: !!parsedForm,
        hasSubmission: !!submission,
        assetsReady
      });
      return null; // Return null instead of empty string
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

            if (existingData && Object.keys(existingData).length > 0) {
              form.submission = {
                data: existingData
              };
              console.log('Form pre-filled with existing data');
              
              setTimeout(() => {
                const inputs = document.querySelectorAll('.form-control, .form-check-input, .form-select');
                inputs.forEach(input => {
                  if (input.value && input.value !== '') {

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
          waitForFormio();
        }
      })();
    </script>
  </body>
</html>
`;
    } catch (err) {
      console.error('Error generating form HTML:', err);
      return null;
    }
  }, [parsedForm, submission, regularForm?.name, assetsReady]);

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

  if (!parsedForm) {
    return <NotFound title="Form error" description="Form JSON is invalid." />;
  }

  if (!submission) {
    return <NotFound title="Submission not found" description="Please try again" />;
  }

  // CRITICAL FIX: Don't render WebView if formHtml is null
  if (!formHtml) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#00227c" />
        <Text className="mt-3 text-gray-600 font-medium">Preparing form...</Text>
      </View>
    );
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
        onConsoleMessage={(event) => {
          console.log('[WebView Console]', event.nativeEvent.message);
        }}
        onError={(syntheticEvent) => {
          console.warn("WebView error:", syntheticEvent.nativeEvent);
          setFormLoading(false);
        }}
        onHttpError={(syntheticEvent) => {
          console.warn("WebView HTTP error:", syntheticEvent.nativeEvent);
        }}
        onLoadEnd={() => {
          console.log("WebView loaded");
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