import { SafeAreaView, View, ActivityIndicator, Text } from "react-native";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, router } from "expo-router";
import { useGetFormById } from "~/services/formElements";
import { NotFound } from "~/components/ui/not-found";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { checkNetworkConnection } from "~/utils/networkHelpers";
import { useAuth } from "~/lib/hooks/useAuth";
import Toast from "react-native-toast-message";
import { useSQLite } from "~/providers/RealContextProvider";
import { Asset } from "expo-asset";
import { saveSurveySubmissionToAPI } from "~/services/survey-submission";

const formioAssets = {
  js: require("~/assets/formio/formio.full.min.js"),
  css: require("~/assets/formio/formio.full.min.css"),
  bootstrap: require("~/assets/formio/bootstrap.min.css"),
};

// Helper function to convert flat form to wizard with pagination
function convertToWizardForm(formSchema: any, questionsPerPage: number = 5): any {
  if (!formSchema || !formSchema.components) {
    return formSchema;
  }

  if (formSchema.display === 'wizard') {
    return formSchema;
  }

  const components = formSchema.components;
  
  const questionComponents = components.filter((comp: any) => {
    const excludedTypes = ['button', 'htmlelement', 'content'];
    const isSubmitButton = comp.type === 'button' && (comp.action === 'submit' || comp.key === 'submit');
    return !excludedTypes.includes(comp.type) && !isSubmitButton;
  });

  if (questionComponents.length === 0) {
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

  return {
    ...formSchema,
    display: 'wizard',
    components: pages,
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
      pid: formId ? parseInt(formId, 10) : NaN,
      pmid: project_module_id ? parseInt(project_module_id, 10) : undefined,
      smid: source_module_id ? parseInt(source_module_id, 10) : undefined,
      projId: project_id ? parseInt(project_id, 10) : undefined,
    };
  }, [params]);

  const { form: regularForm, isLoading } = useGetFormById(parsedParams.pid);
  
  const { user } = useAuth({});
  const { t } = useTranslation();
  const { create, update, getAll } = useSQLite();
  const [loading, setLoading] = useState(true);
  const [localAssets, setLocalAssets] = useState<{
    js: string;
    css: string;
    bootstrap: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStartTime, setFormStartTime] = useState<number>(Date.now());
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
  
  const assetsLoadedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Date.now() - formStartTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [formStartTime]);

  useEffect(() => {
    let isMounted = true;

    const loadAssets = async () => {
      // Prevent multiple loads
      if (assetsLoadedRef.current) {
        console.log("Assets already loaded, skipping...");
        return;
      }

      try {
        console.log("Starting asset load...");
        
        const [jsAsset, cssAsset, bootstrapAsset] = await Asset.loadAsync([
          formioAssets.js,
          formioAssets.css,
          formioAssets.bootstrap,
        ]);
        
        console.log("Assets loaded successfully");

        if (isMounted) {
          setLocalAssets({
            js: jsAsset[0].localUri || jsAsset[0].uri,
            css: cssAsset[0].localUri || cssAsset[0].uri,
            bootstrap: bootstrapAsset[0].localUri || bootstrapAsset[0].uri,
          });
          
          assetsLoadedRef.current = true;
          console.log("Local assets set successfully");
        }
      } catch (assetError) {
        console.error("Asset loading failed:", assetError);
        
        if (isMounted) {
          // Fallback to CDN
          setLocalAssets({
            js: "https://cdn.form.io/formiojs/formio.full.min.js",
            css: "https://cdn.form.io/formiojs/formio.full.min.css",
            bootstrap: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
          });
          
          assetsLoadedRef.current = true;
        }
      }
    };

    loadAssets();

    return () => {
      isMounted = false;
    };
  }, []); 
  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        const isConnected = await checkNetworkConnection();
        if (isConnected !== isOnline) {
          setIsOnline(isConnected);
          console.log("Network status changed:", isConnected ? "Online" : "Offline");
          
          // Just show a toast, don't reload assets
          Toast.show({
            type: isConnected ? "success" : "info",
            text1: isConnected ? "Back Online" : "Offline Mode",
            text2: isConnected ? "Connected to network" : "Using cached resources",
            position: "top",
            visibilityTime: 2000,
          });
        }
      } catch (error) {
        console.warn("Error checking network status:", error);
      }
    };

    const interval = setInterval(checkConnectivity, 30000);
    return () => clearInterval(interval);
  }, [isOnline]); // ✅ Only depends on isOnline

  const parsedForm = useMemo(() => {
    if (!regularForm?.json2) return null;

    try {
      const baseForm = typeof regularForm.json2 === "string"
        ? JSON.parse(regularForm.json2)
        : regularForm.json2;
      
      return convertToWizardForm(baseForm, 5);
    } catch (err) {
      console.error("Failed to parse form JSON:", err);
      return null;
    }
  }, [regularForm?.json2]);

  const fields = useMemo(() => {
    if (!parsedForm?.components) return [];
    
    if (parsedForm.display === 'wizard') {
      return parsedForm.components.flatMap((page: any) => page.components || []);
    }
    
    return parsedForm.components || [];
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

  const handleFormSubmission = useCallback(
    async (formData: any) => {
      console.log("handleFormSubmission called with data:", formData);
      
      if (isSubmitting) {
        console.warn("Already submitting, ignoring duplicate submission");
        return;
      }

      setIsSubmitting(true);
      const finalTimeSpent = Date.now() - formStartTime;
      const userId = user?.id || user?.json?.id;

      try {
        console.log("Time spent filling form:", formatTime(finalTimeSpent));
        console.log("User ID:", userId);
        console.log("Form ID:", regularForm?.id);

        const completeFormData = {
          ...formData,
          time_spent_filling_the_form: Math.floor(finalTimeSpent / 1000),
          survey_id: regularForm?.id,
          table_name: regularForm?.table_name,
          project_module_id: parsedParams.pmid,
          source_module_id: parsedParams.smid,
          project_id: parsedParams.projId,
          user_id: userId,
        };

        console.log("Complete submission data:", JSON.stringify(completeFormData, null, 2));
        
        await saveSurveySubmissionToAPI(
          create, 
          completeFormData, 
          "/sendVisitData", 
          t, 
          fields, 
          userId 
        );

        console.log("Submission completed successfully");

      } catch (error) {
        console.error("Error handling form submission:", error);
        console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');

        Toast.show({
          type: "error",
          text1: t("Alerts.error.title") || "Error",
          text2: t("Alerts.error.submission.unexpected") || "Failed to save form",
          position: "top",
          visibilityTime: 4000,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      regularForm, 
      user, 
      fields, 
      t, 
      isSubmitting, 
      formStartTime, 
      formatTime, 
      create,
      parsedParams
    ]
  );

  const handleWebViewMessage = useCallback(
    (event: any) => {
      try {
        const message = JSON.parse(event.nativeEvent.data);
        console.log("WebView Message received:", message.type);

        switch (message.type) {
          case "FORM_READY":
            console.log("Form is ready and loaded");
            setLoading(false);
            setFormStartTime(Date.now());
            break;
            
          case "FORM_SUBMIT":
            console.log("Form submitted from WebView");
            console.log("Submission data:", message.data);
            handleFormSubmission(message.data);
            break;
            
          case "FORM_ERROR":
            console.error("Form error:", message.error);
            setLoading(false);
            Toast.show({
              type: "error",
              text1: t("Alerts.error.title") || "Error",
              text2: message.error || "Form loading error",
              position: "top",
              visibilityTime: 4000,
            });
            break;
            
          case "FORM_VALIDATION_ERROR":
            console.log("Form validation errors:", message.errors);
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
            console.log("Debug from WebView:", message.message);
            break;
            
          default:
            console.log("Unknown WebView message:", message);
        }
      } catch (err) {
        console.error("Failed to parse WebView message:", err);
        console.error("Raw message:", event.nativeEvent.data);
      }
    },
    [handleFormSubmission, t]
  );

  const formHtml = useMemo(() => {
    if (!localAssets || !parsedForm) return "";

    const escapedFormJson = JSON.stringify(parsedForm).replace(/</g, "\\u003c");
    const escapedFormName = (regularForm?.name || "Form").replace(/'/g, "\\'");
    const totalPages = parsedForm.display === 'wizard' ? parsedForm.components.length : 1;

    return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <title>Form</title>
        <link href="${localAssets.bootstrap}" rel="stylesheet">
        <link href="${localAssets.css}" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
          :root {
            --primary-color: #A23A91;
            --primary-light: #c864b5;
            --primary-dark: #7d2c6d;
          }
          body { 
            margin: 0; 
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
          }
          .form-container {
            max-width: 800px;
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
            margin: 0 5px;
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
            justify-content: center;
            align-items: center;
            height: 300px;
            font-size: 18px;
            color: var(--primary-color);
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
          <div id="loading" class="loading">Loading form...</div>
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
        <script src="${localAssets.js}"></script>
        <script>
          (function() {
            const loadingEl = document.getElementById('loading');
            const formioEl = document.getElementById('formio');
            const TOTAL_PAGES = ${totalPages};
            
            function postMessage(data) {
              try {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify(data));
                  console.log('Posted message to React Native:', data.type);
                } else {
                  console.warn('ReactNativeWebView not available');
                }
              } catch (err) {
                console.error('Error posting message:', err);
              }
            }

            async function initializeForm() {
              try {
                console.log('🚀 Initializing form...');
                
                if (typeof Formio === 'undefined') {
                  throw new Error('Formio library not loaded');
                }

                const formSchema = ${escapedFormJson};
                
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
                    
                    console.log(\`Page \${pageNum}/\${TOTAL_PAGES} (\${percentage}%)\`);
                  }
                  
                  updateProgress(0);
                  
                  form.on('wizardPageSelected', function(page) {
                    console.log('Wizard page changed to:', page);
                    updateProgress(page);
                  });
                }

                form.on('submit', function(submission) {
                  console.log('Form submit event triggered');
                  console.log('Submission data:', submission);
                  
                  postMessage({ 
                    type: 'FORM_SUBMIT', 
                    data: submission.data 
                  });
                });

                form.on('submitButton', function() {
                  console.log('Submit button clicked');
                });

                form.on('submitDone', function(submission) {
                  console.log('Submit done:', submission);
                });

                form.on('error', function(errors) {
                  console.error('Form error:', errors);
                  postMessage({ 
                    type: 'FORM_ERROR', 
                    error: JSON.stringify(errors)
                  });
                });

                form.on('change', function(changed) {
                  if (changed?.changed) {
                    console.log('Form changed:', changed.changed.component?.key);
                  }
                });

                postMessage({ type: 'FORM_READY' });
                console.log('Form initialization complete');
                
              } catch (error) {
                console.error('Form initialization error:', error);
                loadingEl.innerHTML = '<div style="color: red; padding: 20px;">Error: ' + error.message + '</div>';
                postMessage({ type: 'FORM_ERROR', error: error.message });
              }
            }

            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', initializeForm);
            } else {
              initializeForm();
            }
          })();
        </script>
      </body>
    </html>
    `;
  }, [localAssets, parsedForm, regularForm?.name]);

  if (isLoading || !localAssets) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#A23A91" />
        <Text className="mt-3 text-gray-600 font-medium">Loading...</Text>
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
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        mixedContentMode="always"
        onError={(syntheticEvent) => {
          console.warn("WebView error:", syntheticEvent.nativeEvent);
          setLoading(false);
        }}
        onHttpError={(syntheticEvent) => {
          console.warn("WebView HTTP error:", syntheticEvent.nativeEvent);
        }}
        onLoadEnd={() => {
          console.log("WebView finished loading");
        }}
      />
      {loading && (
        <View className="absolute inset-0 items-center justify-center bg-white bg-opacity-95">
          <ActivityIndicator size="large" color="#A23A91" />
          <Text className="mt-3 text-gray-600 font-medium">Loading form...</Text>
          <Text className="mt-2 text-sm text-gray-500">
            {isOnline ? "Loading from server..." : "Loading from cache..."}
          </Text>
        </View>
      )}
      {isSubmitting && (
        <View className="absolute inset-0 items-center justify-center bg-black bg-opacity-50">
          <View className="bg-white p-6 rounded-lg items-center">
            <ActivityIndicator size="large" color="#A23A91" />
            <Text className="mt-3 text-gray-700 font-medium">Saving submission...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default ProjectFormElementScreen;