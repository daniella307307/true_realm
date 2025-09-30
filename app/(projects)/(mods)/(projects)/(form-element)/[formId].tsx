import { SafeAreaView, View, ActivityIndicator, Text } from "react-native";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, router } from "expo-router";
import { useGetFormById } from "~/services/formElements";
import { NotFound } from "~/components/ui/not-found";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { checkNetworkConnection } from "~/utils/networkHelpers"; 
import { RealmContext } from "~/providers/RealContextProvider";
import { createSurveySubmission } from "~/services/survey-submission";
import { SurveySubmission } from "~/models/surveys/survey-submission";
import { BSON } from "realm";
import { useAuth } from "~/lib/hooks/useAuth";
import type { FormField, SyncType } from "~/types";
import Toast from "react-native-toast-message";

const { useRealm } = RealmContext;

function cleanObject(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      cleaned[key] = null; // replace undefined with null
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export const saveFormSubmissionLocally = async (
  realm: any,
  formData: Record<string, any>,
  regularForm: any,
  user: any,
  fields: FormField[] = [],
  timeSpent: number = 0
) => {
  try {
    const submissionId = getNextAvailableId(realm);

    // Ensure no undefined values
    const completeFormData = cleanObject({
      ...formData,
      id: submissionId,
      user_id: user?.id ?? user?.json?.id ?? null,
      table_name: regularForm?.table_name ?? null,
      project_module_id: regularForm?.project_module_id || 0,
      source_module_id: regularForm?.source_module_id || 0,
      project_id: regularForm?.project_id || 0,
      survey_id: regularForm?.id || 0,
      post_data: regularForm?.post_data ?? null,
      time_spent_filling_the_form: timeSpent, // Use actual time spent
      form_status: "completed",
      province: formData.province ?? null,
      district: formData.district ?? null,
      sector: formData.sector ?? null,
      cell: formData.cell ?? null,
      village: formData.village ?? null,
      created_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    });

    const submission = realm.write(() => {
      return realm.create("SurveySubmission", {
        id: submissionId,
        answers: cleanObject(formData), // store raw form answers
        form_data: completeFormData,    // store enriched metadata + form
        location: cleanObject({
          province: formData.province ?? null,
          district: formData.district ?? null,
          sector: formData.sector ?? null,
          cell: formData.cell ?? null,
          village: formData.village ?? null,
        }),
        sync_data: cleanObject({
          synced_at: null,
          sync_type: null,
          sync_status: false,
          created_by_user_id: user?.id ?? user?.json?.id ?? null,
        }),
      });
    });

    console.log("Form submission saved locally with ID:", submissionId);
    return submission;
  } catch (error) {
    console.error("Error saving form submission locally:", error);
    throw error;
  }
};

// Helper function to get next available integer ID
function getNextAvailableId(realm: any): number {
  try {
    const surveySubmissions = realm.objects(SurveySubmission);
    if (surveySubmissions.length > 0) {
      const ids = surveySubmissions.map((i: any) => {
        const id = i.form_data?.id || i.id || 0;
        return typeof id === 'number' ? id : parseInt(String(id), 10) || 0;
      });
      const maxId = Math.max(...ids);
      return maxId + 1;
    }
    return 1;
  } catch (error) {
    console.log("Error getting next ID, using default:", error);
    return 1;
  }
}

const ProjectFormElementScreen = () => {
  const params = useLocalSearchParams<{
    formId: string;
    project_module_id: string;
    source_module_id: string;
    project_id: string;
  }>();

  // Memorize parsed parameters to prevent unnecessary re-renders
  const parsedParams = useMemo(() => {
    const { formId, project_module_id, source_module_id, project_id } = params;
    return {
      pid: formId ? parseInt(formId, 10) : NaN,
      pmid: project_module_id ? parseInt(project_module_id, 10) : NaN,
      smid: source_module_id ? parseInt(source_module_id, 10) : NaN,
      projId: project_id ? parseInt(project_id, 10) : NaN,
    };
  }, [params]);

  // Hooks with stable dependencies
  const { form: regularForm, isLoading } = useGetFormById(
    parsedParams.pid,
    parsedParams.pmid,
    parsedParams.smid,
    parsedParams.projId
  );
  const { user } = useAuth({});
  const { t } = useTranslation();
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

  const realm = useRealm();

  // Timer to track time spent
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Date.now() - formStartTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [formStartTime]);

  // Network-aware asset loading
  const loadLocalAssets = useCallback(async () => {
    try {
      // Check network connectivity using your utility
      const isConnected = await checkNetworkConnection();
      
      if (isConnected) {
        // Use CDN assets when online
        setLocalAssets({
          js: "https://cdn.form.io/formiojs/formio.full.min.js",
          css: "https://cdn.form.io/formiojs/formio.full.min.css",
          bootstrap: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
        });
        setIsOnline(true);
        console.log("Using CDN assets (online)");
      } else {
        // Use local assets when offline
        // Note: You'll need to add these files to your assets folder
        setLocalAssets({
          js: "~/assets/formio/formio.full.min.js",
          css: "~/assets/formio/formio.full.min.css", 
          bootstrap: "~/assets/formio/bootstrap.min.css",
        });
        setIsOnline(false);
        console.log("Using local assets (offline)");
        
        // Show offline notice
        Toast.show({
          type: "info",
          text1: "Offline Mode",
          text2: "Using cached form resources",
          position: "top",
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.warn("Error checking connectivity, defaulting to CDN:", error);
      // Default fallback to CDN
      setLocalAssets({
        js: "https://cdn.form.io/formiojs/formio.full.min.js",
        css: "https://cdn.form.io/formiojs/formio.full.min.css",
        bootstrap: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
      });
      setIsOnline(true);
    }
  }, []);

  // Load assets once with proper cleanup
  useEffect(() => {
    let isMounted = true;

    const initializeAssets = async () => {
      if (isMounted) {
        await loadLocalAssets();
      }
    };

    initializeAssets();

    return () => {
      isMounted = false;
    };
  }, [loadLocalAssets]);

  // Monitor network changes
  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        const isConnected = await checkNetworkConnection();
        setIsOnline(isConnected);
      } catch (error) {
        console.warn("Error checking network status:", error);
      }
    };

    // Check connectivity every 30 seconds
    const interval = setInterval(checkConnectivity, 30000);

    return () => clearInterval(interval);
  }, []);

  // Memoize parsed form to prevent re-parsing on every render
  const parsedForm = useMemo(() => {
    if (!regularForm?.json2) return null;

    try {
      return typeof regularForm.json2 === "string"
        ? JSON.parse(regularForm.json2)
        : regularForm.json2;
    } catch (err) {
      console.error("Failed to parse form JSON:", err);
      return null;
    }
  }, [regularForm?.json2]);

  // Memoize form fields
  const fields = useMemo(() => parsedForm?.components || [], [parsedForm]);

  // Format time display
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

  // Stable form submission handler
  const handleFormSubmission = useCallback(async (formData: any) => {
    if (isSubmitting) return; // Prevent double submission

    setIsSubmitting(true);
    const finalTimeSpent = Date.now() - formStartTime;
    
    try {
      console.log("Form submission data:", formData);
      console.log("Time spent filling form:", formatTime(finalTimeSpent));

      await saveFormSubmissionLocally(realm, formData, regularForm, user, fields, finalTimeSpent);

      Toast.show({
        type: "success",
        text1: t("Alerts.success.title") || "Success",
        text2: `${t("Alerts.success.form_saved_locally") || "Form saved locally"} (${formatTime(finalTimeSpent)})`,
        position: "top",
        visibilityTime: 3000,
      });

      // Navigate back or to history
      router.push("/(history)/realmDbViewer");

    } catch (error) {
      console.error("Error handling form submission:", error);

      Toast.show({
        type: "error",
        text1: t("Alerts.error.title") || "Error",
        text2: t("Alerts.error.save_failed.local") || "Failed to save form",
        position: "top",
        visibilityTime: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [realm, regularForm, user, fields, t, isSubmitting, formStartTime, formatTime]);

  // Stable WebView message handler
  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log("WebView Message:", message.type);

      switch (message.type) {
        case "FORM_READY":
          console.log("Form is ready");
          setLoading(false);
          setFormStartTime(Date.now()); // Reset timer when form is ready
          break;
        case "FORM_SUBMIT":
          console.log("Form submitted");
          handleFormSubmission(message.data);
          break;
        case "FORM_ERROR":
          console.error("Form error:", message.error);
          setLoading(false);
          Toast.show({
            type: "error",
            text1: t("Alerts.error.title") || "Error",
            text2: "Form loading error",
            position: "top",
            visibilityTime: 4000,
          });
          break;
        case "FORM_VALIDATION_ERROR":
          console.log("Form validation errors:", message.errors);
          break;
        case "FORM_CHANGE":
          // Form data changed - could be used for auto-save
          break;
        default:
          console.log("Unknown WebView message:", message);
      }
    } catch (err) {
      console.error("Failed to parse WebView message:", err);
    }
  }, [handleFormSubmission, t]);

  // Memoize HTML content to prevent unnecessary WebView reloads
  const formHtml = useMemo(() => {
    if (!localAssets || !parsedForm) return '';

    // Escape any potential XSS in form data
    const escapedFormJson = JSON.stringify(parsedForm).replace(/</g, '\\u003c');
    const escapedFormName = (regularForm?.name || "Form").replace(/'/g, "\\'");

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
            --secondary-color: #f8f9fa;
            --border-color: #e0e0e0;
            --text-color: #333;
            --success-color: #28a745;
            --danger-color: #dc3545;
            --warning-color: #ffc107;
            --info-color: #17a2b8;
          }

          body { 
            margin: 0; 
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: var(--text-color);
            line-height: 1.6;
          }

          .form-container {
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
            background: white;
            border-radius: 12px;
            position: relative;
            overflow: hidden;
          }

          .form-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--primary-color), var(--primary-light));
          }

          .form-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
          }

          .form-title {
            color: var(--primary-color);
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
          }

         

          .time-tracker {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
            color: var(--primary-color);
          }

          .connection-status {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 12px;
            font-weight: 500;
            text-transform: uppercase;
          }

          .online {
            background: rgba(40, 167, 69, 0.1);
            color: var(--success-color);
          }

          .offline {
            background: rgba(220, 53, 69, 0.1);
            color: var(--danger-color);
          }

          #formio { 
            min-height: 60vh;
          }

          /* Custom FormIO styling */
          .formio-form {
            background: transparent;
          }

          .formio-component-submit .btn-primary {
            background: var(--primary-color);
            border: none;
            border-radius: 8px;
            padding: 12px 30px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            width: 100%;
            box-shadow: 0 4px 15px rgba(162, 58, 145, 0.3);
          }

          .formio-component-submit .btn-primary:hover {
            background: linear-gradient(135deg, var(--primary-dark), var(--primary-color));
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(162, 58, 145, 0.4);
          }

          .form-control {
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            padding: 10px 15px;
            transition: border-color 0.3s ease, box-shadow 0.3s ease;
          }

          .form-control:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(162, 58, 145, 0.1);
          }

          .form-group label {
            font-weight: 600;
            color: var(--text-color);
            margin-bottom: 8px;
            display: block;
          }

          .alert {
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
          }

          .alert-danger {
            background: linear-gradient(135deg, rgba(220, 53, 69, 0.1), rgba(220, 53, 69, 0.05));
            border: 1px solid rgba(220, 53, 69, 0.2);
            color: var(--danger-color);
          }

          .loading {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 300px;
            text-align: center;
          }

          .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .loading-text {
            font-size: 16px;
            color: #666;
            font-weight: 500;
          }

          /* Radio and checkbox styling */
          .radio input[type="radio"],
          .checkbox input[type="checkbox"] {
            margin-right: 8px;
            accent-color: var(--primary-color);
            background-color: var(--primary-color);
          }

          /* Select styling */
          select.form-control {
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 8px center;
            background-repeat: no-repeat;
            background-size: 16px 16px;
            padding-right: 40px;
          }

          /* Responsive design */
          @media (max-width: 768px) {
            .form-container {
              margin: 10px;
              padding: 15px;
            }
            
            .form-stats {
              flex-direction: column;
              gap: 10px;
              text-align: center;
            }
            
            .form-title {
              font-size: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="form-container">
          <div class="form-header">
            <div class="form-title">${escapedFormName}</div>
            <div class="form-stats">
              <div class="time-tracker">
                <i class="fas fa-clock"></i>
                <span id="timeDisplay">0s</span>
              </div>
             
            </div>
          </div>
          
          <div id="loading" class="loading">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading form...</div>
          </div>
          
          <div id="formio" style="display: none;"></div>
        </div>
        
        <script src="${localAssets.js}"></script>
        <script>
          Object.defineProperty(document, 'cookie', {
            get: function() { return ''; },
            set: function() { return true; },
          });

          (function() {
            let formInitialized = false;
            let startTime = Date.now();
            const loadingEl = document.getElementById('loading');
            const formioEl = document.getElementById('formio');
            const timeDisplayEl = document.getElementById('timeDisplay');
            
            // Update time display every second
            setInterval(() => {
              const elapsed = Date.now() - startTime;
              const seconds = Math.floor(elapsed / 1000);
              const minutes = Math.floor(seconds / 60);
              const hours = Math.floor(minutes / 60);
              
              let display;
              if (hours > 0) {
                display = hours + 'h ' + (minutes % 60) + 'm ' + (seconds % 60) + 's';
              } else if (minutes > 0) {
                display = minutes + 'm ' + (seconds % 60) + 's';
              } else {
                display = seconds + 's';
              }
              
              if (timeDisplayEl) {
                timeDisplayEl.textContent = display;
              }
            }, 1000);
            
            function showError(message) {
              loadingEl.innerHTML = '<div style="color: var(--danger-color); text-align: center;"><i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i><br><strong>Error:</strong> ' + message + '</div>';
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'FORM_ERROR',
                  error: message
                }));
              }
            }
            
            function postMessage(data) {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify(data));
              } else {
                console.log('ReactNativeWebView not available:', data);
              }
            }

            async function initializeForm() {
              if (formInitialized) return;
              formInitialized = true;

              try {
                // Check if Formio is loaded
                if (typeof Formio === 'undefined') {
                  throw new Error('Formio library not loaded');
                }

                const formSchema = ${escapedFormJson};
                
                if (!formSchema || !formSchema.components) {
                  throw new Error('Invalid form schema');
                }

                const form = await Formio.createForm(formioEl, formSchema, {
                  noAlerts: true,
                  language: '${t("language", "en")}',
                  readOnly: false,
                  sanitize: true,
                  template: 'bootstrap'
                });

                // Hide loading, show form
                loadingEl.style.display = 'none';
                formioEl.style.display = 'block';

                // Set up event listeners
                form.on('submit', function(submission) {
                  const timeSpent = Date.now() - startTime;
                  postMessage({
                    type: 'FORM_SUBMIT',
                    data: submission.data,
                    formName: '${escapedFormName}',
                    timeSpent: timeSpent,
                    timestamp: new Date().toISOString()
                  });
                });

                form.on('change', function(changed) {
                  postMessage({
                    type: 'FORM_CHANGE',
                    data: changed.data,
                    component: changed.component ? changed.component.key : null,
                    timestamp: new Date().toISOString()
                  });
                });

                form.on('error', function(errors) {
                  postMessage({
                    type: 'FORM_VALIDATION_ERROR',
                    errors: Array.isArray(errors) ? errors : [errors],
                    timestamp: new Date().toISOString()
                  });
                });

                // Notify React Native that form is ready
                startTime = Date.now(); // Reset start time
                postMessage({
                  type: 'FORM_READY',
                  formName: '${escapedFormName}',
                  timestamp: new Date().toISOString()
                });

              } catch (error) {
                console.error('Form initialization error:', error);
                showError(error.message || 'Unknown error occurred');
              }
            }

            // Initialize when DOM is ready
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
  }, [localAssets, parsedForm, t, regularForm?.name, isOnline]);

  // Early returns after all hooks
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
      <HeaderNavigation 
        title={t("FormElementPage.title")} 
        showLeft 
        showRight 
      />
      <WebView
        originWhitelist={["*"]}
        source={{ html: formHtml }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleWebViewMessage}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={false}
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState={false}
        cacheEnabled={true} // Enable caching for offline support
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
          setLoading(false);
          
          // Show error toast if it's a network-related error
          if (nativeEvent.description?.includes('net::') || !isOnline) {
            Toast.show({
              type: "error",
              text1: "Connection Error",
              text2: "Unable to load form resources. Please check your connection.",
              position: "top",
              visibilityTime: 4000,
            });
          }
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView HTTP error: ', nativeEvent);
          setLoading(false);
          
          if (nativeEvent.statusCode >= 400) {
            Toast.show({
              type: "error",
              text1: "Loading Error",
              text2: `Failed to load form resources (${nativeEvent.statusCode})`,
              position: "top",
              visibilityTime: 4000,
            });
          }
        }}
        onLoadStart={() => {
          console.log('WebView load started');
        }}
        onLoadEnd={() => {
          console.log('WebView load ended');
        }}
      />
      {loading && (
        <View className="absolute inset-0 items-center justify-center bg-white bg-opacity-95">
          <ActivityIndicator size="large" color="#A23A91" />
          <Text className="mt-3 text-gray-600 font-medium">Loading form...</Text>
          <Text className="mt-2 text-sm text-gray-500">
            Time: {formatTime(timeSpent)}
          </Text>
          <View className="flex-row items-center mt-2 space-x-2">
            <View className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <Text className="text-xs text-gray-500">
              {isOnline ? 'Loading from server...' : 'Loading from cache...'}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ProjectFormElementScreen;


