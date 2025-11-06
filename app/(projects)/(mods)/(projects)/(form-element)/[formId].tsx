import { SafeAreaView, View, ActivityIndicator, Text } from "react-native";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, router } from "expo-router";
import { useGetFormById } from "~/services/formElements";
import { NotFound } from "~/components/ui/not-found";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { translateFormSchema } from "~/components/utils-form/form-translation";
import { checkNetworkConnection } from "~/utils/networkHelpers";
import { useAuth } from "~/lib/hooks/useAuth";
import Toast from "react-native-toast-message";
import { useSQLite } from "~/providers/RealContextProvider";
import * as FileSystem from "expo-file-system";
import { saveSurveySubmissionToAPI } from "~/services/survey-submission";
import { baseInstance } from "~/utils/axios";

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

function ProjectFormElementScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{
    formId: string;
    project_module_id?: string;
    source_module_id?: string;
    project_id?: string;
  }>();

  const parsedParams = useMemo(() => {
    const { formId, project_module_id, source_module_id, project_id } = params;
    return {
      pid: formId || '',
      pmid: project_module_id ? parseInt(String(project_module_id), 10) : undefined,
      smid: source_module_id ? parseInt(String(source_module_id), 10) : undefined,
      projId: project_id ? parseInt(String(project_id), 10) : undefined,
    };
  }, [params]);

  const { form: regularForm, isLoading } = useGetFormById(parsedParams.pid);
  
  const { user } = useAuth({});
  const { t,i18n } = useTranslation();
  const { create } = useSQLite();
  const [loading, setLoading] = useState(true);
  const [assetsReady, setAssetsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStartTime] = useState<number>(Date.now());
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [loadingStep, setLoadingStep] = useState("Initializing...");
  const [assetError, setAssetError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const networkCheckMountedRef = useRef(true);
  const currentLang = i18n.language;
  const lastNetworkCheckRef = useRef(0);
  const assetsLoadedRef = useRef(false);
  const networkStatusInitialized = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Date.now() - formStartTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [formStartTime]);

  // Initial network check - runs once on mount
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

  // Periodic network checking effect - only runs after initial check
  useEffect(() => {
    if (!networkStatusInitialized.current) {
      return;
    }

    networkCheckMountedRef.current = true;
    let intervalId: number | null = null;

    const checkConnectivity = async () => {
      if (!networkCheckMountedRef.current) return;
      
      const now = Date.now();
      if (now - lastNetworkCheckRef.current < 30000) {
        return;
      }
      
      lastNetworkCheckRef.current = now;
      
      try {
        const isConnected = await checkNetworkConnection();
        
        if (networkCheckMountedRef.current) {
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
        }
      } catch (error) {
        console.warn("Error checking network status:", error);
      }
    };
    
    intervalId = setInterval(() => {
      if (networkCheckMountedRef.current) {
        checkConnectivity();
      }
    }, 30000);

    return () => {
      networkCheckMountedRef.current = false;
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
        console.log("Assets already loaded, skipping");
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

        // Check if cached files exist
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

        // If files don't exist and we're offline, we can't proceed
        if (!isOnline) {
          console.error("Offline and no cached assets available");
          if (isMounted) {
            setAssetError("Form assets not available offline. Please connect to the internet to download required files.");
            setLoadingStep("");
          }
          return;
        }

        setLoadingStep("Downloading assets...");
        console.log("Downloading FormIO assets from CDN...");
        
        // Download assets from CDN
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

        // Check if all downloads succeeded
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
      if(regularForm.translations){
        console.log(`translating form to ${currentLang}...`);
        translatedForm = translateFormSchema(baseForm, regularForm?.translations, currentLang);
      }
      
      console.log('Form parsed successfully, converting to wizard...');
      const wizardForm = convertToWizardForm(translatedForm, 5);
      console.log('Wizard conversion complete');
      
      return wizardForm;
    } catch (err) {
      console.error("Failed to parse form JSON:", err);
      return null;
    }
  }, [regularForm?.json, regularForm?.translations, currentLang]);

  const fields = useMemo(() => {
    if (!parsedForm?.components) return [];
    
    try {
      if (parsedForm.display === 'wizard') {
        return parsedForm.components.flatMap((page: any) => 
          Array.isArray(page.components) ? page.components : []
        );
      }
      
      return Array.isArray(parsedForm.components) ? parsedForm.components : [];
    } catch (err) {
      console.error('Error extracting fields:', err);
      return [];
    }
  }, [parsedForm]);

  const formatTime = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

/**
 * Upload files to the backend /api/uploads endpoint
 */
const uploadFilesToBackend = async (fileValue: any, fieldName: string): Promise<any> => {
  try {
    const uploadUrl = `uploads`;
    
    console.log('Uploading file to:', uploadUrl);
    console.log('File value:', JSON.stringify(fileValue, null, 2));

    // Create FormData
    const formData = new FormData();
    
    // Add form metadata
    formData.append('formId', regularForm?.id || '');
    formData.append('fieldName', fieldName);
    
    
    let fileToUpload: any = null;
    
    // Case 1: FormIO base64 format
    if (fileValue.storage === 'base64' && fileValue.data) {
      // Convert base64 to blob
      const base64Data = fileValue.data.includes(',') 
        ? fileValue.data.split(',')[1] 
        : fileValue.data;
      
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: fileValue.type || 'application/octet-stream' });
      
      fileToUpload = {
        uri: URL.createObjectURL(blob),
        type: fileValue.type || 'application/octet-stream',
        name: fileValue.name || fileValue.originalName || 'file',
      };
    }
    // Case 2: File with URI
    else if (fileValue.uri || fileValue.url) {
      fileToUpload = {
        uri: fileValue.uri || fileValue.url,
        type: fileValue.type || fileValue.mimeType || 'application/octet-stream',
        name: fileValue.name || fileValue.fileName || 'file',
      };
    }
    // Case 3: Already has proper structure
    else if (fileValue.name && fileValue.type) {
      fileToUpload = fileValue;
    }

    if (!fileToUpload) {
      console.warn('Could not process file for upload:', fileValue);
      return fileValue; // Return original if we can't process it
    }

    // Append file to FormData
    formData.append('files', fileToUpload as any);

    // Make upload request
    const response = await baseInstance.post(uploadUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.status || response.status < 200 || response.status >= 300) {
      const errorText = await response.data.message || 'Unknown error';
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.data;
    console.log('Upload response:', result);

    // Return the file object with backend URL
    if (result.success && result.data) {
      // Handle single file response
      if (!Array.isArray(result.data)) {
        return {
          name: result.data.name,
          type: result.data.type,
          size: result.data.size,
          url: result.data.url,
          storage: 'url',
          _id: result.data._id,
        };
      }
      // Handle multiple files (take first one)
      else if (result.data.length > 0) {
        const file = result.data[0];
        return {
          name: file.name,
          type: file.type,
          size: file.size,
          url: file.url,
          storage: 'url',
          _id: file._id,
        };
      }
    }

    throw new Error('Invalid upload response format');
    
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

const processFormDataForSubmission = async (formData: any, parentKey: string = ''): Promise<any> => {
  const processedData: any = {};

  for (const [key, value] of Object.entries(formData)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    
    // Skip internal fields
    if (key === 'language' || key === 'submit') {
      processedData[key] = value;
      continue;
    }

    // Handle file objects - upload to backend
    if (isFileValue(value)) {
      try {
        console.log(`Uploading file for field: ${fullKey}`);
        const uploadedFile = await uploadFilesToBackend(value, fullKey);
        processedData[key] = uploadedFile;
      } catch (error) {
        console.error(`Failed to upload file for ${fullKey}:`, error);
        throw new Error(`File upload failed for ${key}: ${error.message}`);
      }
    }
    // Handle arrays that might contain files
    else if (Array.isArray(value)) {
      const processedArray = await Promise.all(
        value.map(async (item, index) => {
          if (isFileValue(item)) {
            try {
              console.log(`Uploading file in array for field: ${fullKey}[${index}]`);
              return await uploadFilesToBackend(item, `${fullKey}[${index}]`);
            } catch (error) {
              console.error(`Failed to upload file in array for ${fullKey}[${index}]:`, error);
              throw error;
            }
          }
          return item;
        })
      );
      
      // Only include non-empty arrays
      const filteredArray = processedArray.filter(item => item !== null && item !== undefined);
      processedData[key] = filteredArray.length > 0 ? filteredArray : undefined;
    }
    // Handle nested objects
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      processedData[key] = await processFormDataForSubmission(value, fullKey);
    }
    // Handle primitive values - skip undefined/null
    else if (value !== undefined && value !== null) {
      processedData[key] = value;
    }
  }

  return processedData;
};

/**
 * Check if a value is a file object
 */
const isFileValue = (value: any): boolean => {
  if (!value || typeof value !== 'object') return false;
  
  // Check for FormIO file format
  if (value.storage && value.name && (value.url || value.data)) {
    return true;
  }
  
  // Check if it has file-like properties
  if (value.name && (value.url || value.uri || value.data || value.path)) {
    return true;
  }
  
  // Check for React Native file format
  if (value.uri || value.path) {
    const hasFileName = value.name || value.fileName;
    if (hasFileName) return true;
  }
  
  // Check for base64 format
  if (value.data && typeof value.data === 'string' && value.data.startsWith('data:')) {
    return true;
  }
  
  // Check if object has originalName
  if (value.originalName && (value.url || value.data)) {
    return true;
  }
  
  return false;
};

// Debugging function
const logFormDataForDebugging = (formData: any) => {
  console.log('=== FORM DATA DEBUG ===');
  for (const [key, value] of Object.entries(formData)) {
    if (Array.isArray(value)) {
      console.log(`${key} (array):`, value.length, 'items');
      value.forEach((item, idx) => {
        if (typeof item === 'object') {
          console.log(`  [${idx}]:`, JSON.stringify(item, null, 2));
        }
      });
    } else if (value && typeof value === 'object') {
      console.log(`${key} (object):`, JSON.stringify(value, null, 2));
    } else {
      console.log(`${key}:`, value);
    }
  }
  console.log('=== END DEBUG ===');
};

// Handle form submission
const handleFormSubmission = useCallback(
  async (formData: any) => {
    console.log("handleFormSubmission called");
    
    // Add debugging
    logFormDataForDebugging(formData);
    
    if (isSubmittingRef.current) {
      console.warn("Already submitting, ignoring duplicate");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    
    const finalTimeSpent = Date.now() - formStartTime;
    const userId = user?.id || user?.json?.id;

    try {
      // Check if we have a valid form ID
      const formId = regularForm?.id;
      
      if (!formId) {
        console.error('Form ID is missing!');
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title") || "Error",
          text2: "Form ID is missing. Cannot submit.",
          position: "top",
          visibilityTime: 4000,
        });
        return;
      }

      // Process form data and upload files
      console.log('Processing form data and uploading files...');
      const processedData = await processFormDataForSubmission(formData);
      
      console.log('=== PROCESSED DATA (after file uploads) ===');
      console.log(JSON.stringify(processedData, null, 2));
      console.log('=== END PROCESSED DATA ===');
      
      const completeFormData = {
        ...processedData,
        time_spent_filling_the_form: Math.floor(finalTimeSpent / 1000),
        survey_id: formId,
        table_name: regularForm?.table_name,
        project_module_id: parsedParams.pmid,
        source_module_id: parsedParams.smid,
        project_id: parsedParams.projId,
        user_id: userId,
      };
      
      const submissionUrl = `/submissions/${formId}/submit`;
      
      console.log('Submitting form to:', submissionUrl);

      await saveSurveySubmissionToAPI(
        create, 
        completeFormData, 
        submissionUrl,
        t, 
        fields, 
        userId 
      );

      console.log("Submission successful");
      
      Toast.show({
        type: "success",
        text1: t("Alerts.success.title") || "Success",
        text2: t("Alerts.success.submission") || "Form submitted successfully",
        position: "top",
        visibilityTime: 3000,
      });

    } catch (error) {
      console.error("Submission error:", error);

      Toast.show({
        type: "error",
        text1: t("Alerts.error.title") || "Error",
        text2: error.message || t("Alerts.error.submission.unexpected") || "Failed to save form",
        position: "top",
        visibilityTime: 4000,
      });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  },
  [
    regularForm?.id,
    regularForm?.table_name,
    user?.id,
    user?.json?.id,
    fields,
    t,
    formStartTime,
    create,
    parsedParams.pmid,
    parsedParams.smid,
    parsedParams.projId,
  ]
);

const handleWebViewMessage = useCallback(
    (event: any) => {
      try {
        const message = JSON.parse(event.nativeEvent.data);
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
      const escapedFormJson = formJsonString.replace(/</g, "\\u003c");
      const escapedFormName = (regularForm?.name || "Form").replace(/'/g, "\\'");
      const totalPages = parsedForm.display === 'wizard' && Array.isArray(parsedForm.components) 
        ? parsedForm.components.length 
        : 1;

      console.log('Generating form HTML with', totalPages, 'pages');

      // Use cached files if available
      const jsPath = `${FileSystem.cacheDirectory}formio.full.min.js`;
      const cssPath = `${FileSystem.cacheDirectory}formio.full.min.css`;
      const bootstrapPath = `${FileSystem.cacheDirectory}bootstrap.min.css`;
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const escapedBaseUrl = baseUrl.replace(/'/g, "\\'");
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
            background: #dc3545 !important;
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
        </style>
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
              
              Formio.setBaseUrl('${escapedBaseUrl}');
             
              
              try {
                const formSchema = ${escapedFormJson};
                
                const form = await Formio.createForm(formioEl, formSchema, {
                  noAlerts: true,
                  readOnly: false,
                  sanitize: true,
                  hooks : {
                  beforeSubmit: function(submission, next) {
                    postMessage({ type: 'DEBUG', message: 'beforeSubmit hook called' });
                    next();
                  },
                  buttonSettings: {
                    showCancel: false,
                    showPrevious: true,
                    showNext: true,
                    showSubmit: true
                  },
                  base: '',
                  project: ''
                });

                console.log('✅ Form created successfully');
                
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
                console.log('✅ Form ready and displayed');
                
              } catch (error) {
                console.error('❌ Form initialization error:', error);
                loadingEl.innerHTML = '<div style="color: red; padding: 20px; text-align: center;">Error: ' + error.message + '</div>';
                postMessage({ type: 'FORM_ERROR', error: error.message });
              }
            }

            function waitForFormio() {
              console.log('Waiting for page to load...');
              if (typeof window.Formio !== 'undefined' && window.Formio && window.Formio.createForm) {
                console.log('✅ Formio detected, initializing...');
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
        }}
      />
      {loading && (
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

export default ProjectFormElementScreen;