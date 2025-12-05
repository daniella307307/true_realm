import { SafeAreaView, View, ActivityIndicator, Text, Alert } from "react-native";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, router } from "expo-router";
import { useGetFormById } from "~/services/formElements";
import { NotFound } from "~/components/ui/not-found";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { parseTranslations, translateFormSchema } from "~/components/utils-form/form-translation";
import { checkNetworkConnection } from "~/utils/networkHelpers";
import { useAuth } from "~/lib/hooks/useAuth";
import Toast from "react-native-toast-message";
import { useSQLite } from "~/providers/RealContextProvider";
import * as FileSystem from "expo-file-system";
import { saveSurveySubmissionToAPI } from "~/services/survey-submission";
import { MediaPickerButton } from "~/components/ui/MediaPickerButton";
import { useMediaPicker, MediaResult } from "~/lib/hooks/useMediaPicker";
import { saveDraft, loadDraft, deleteDraft, createDebouncedSave } from "~/services/draft-submissions";
import { baseInstance } from "~/utils/axios";
function convertToWizardForm(formSchema: any, questionsPerPage: number = 5, t: any): any {
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
        title: `Page ${pageNumber}  ${t("ReviewPage.of")} ${totalPages}`,
        label: `Page ${pageNumber}  ${t("ReviewPage.of")} ${totalPages}`,
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
  const { t, i18n } = useTranslation();
  const { create, update, getAll, delete: deleteRecord } = useSQLite();
  const [loading, setLoading] = useState(true);
  const [assetsReady, setAssetsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStartTime] = useState<number>(Date.now());
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [loadingStep, setLoadingStep] = useState("Initializing...");
  const [assetError, setAssetError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaResult[]>([]);
  const { takePhoto, pickImage, pickVideo, requestCameraPermission, requestMediaLibraryPermission, pickDocument, pickMedia } = useMediaPicker();
  const isSubmittingRef = useRef(false);
  const networkCheckMountedRef = useRef(true);
  const currentLang = i18n.language;
  const normalizedLang = currentLang.split('-')[0].toLowerCase();
  const lastNetworkCheckRef = useRef(0);
  const assetsLoadedRef = useRef(false);
  const networkStatusInitialized = useRef(false);
  const webViewRef = useRef<WebView>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const debouncedSaveRef = useRef<Function | null>(null);


  useEffect(() => {
    if (!create || !update || !getAll) return;

    const saveFunc = async (
      formData: any,
      currentPage: number,
      totalPages: number
    ) => {
      if (!autoSaveEnabled || !user?.id || !parsedParams.pid) return;

      try {
        await saveDraft(
          create,
          update,
          getAll,
          parsedParams.pid,
          String(user.id),
          formData,
          currentPage,
          totalPages,
          regularForm?.name
        );
        setLastSavedTime(new Date());
        console.log('Auto-saved at:', new Date().toLocaleTimeString());
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    };

    debouncedSaveRef.current = createDebouncedSave(saveFunc, 2000);
  }, [create, update, getAll, autoSaveEnabled, user?.id, parsedParams.pid]);
  // Load draft on mount
  useEffect(() => {
    if (!getAll || !user?.id || !parsedParams.pid || draftLoaded) return;

    const checkForDraft = async () => {
      try {
        const draft = await loadDraft(
          getAll,
          parsedParams.pid,
          String(user.id)
        );

        if (draft) {
          setHasDraft(true);
          Alert.alert(
            t("FormElementPage.draft_found_title") || "Draft Found",
            t("FormElementPage.draft_found_message") ||
            "Would you like to continue from where you left off?",
            [
              {
                text: t("FormElementPage.start_new") || "Start Fresh",
                style: "destructive",
                onPress: async () => {
                  await deleteDraft(
                    (table: string, id: string) => {
                      return deleteRecord(table, id);
                    },
                    parsedParams.pid,
                    String(user.id)
                  );
                  setHasDraft(false);
                  setDraftLoaded(true);
                },
              },
              {
                text: t("FormElementPage.continue_draft") || "Continue",
                onPress: () => {
                  if (webViewRef.current && draft.draft_data) {
                    webViewRef.current.postMessage(
                      JSON.stringify({
                        type: 'LOAD_DRAFT',
                        data: draft.draft_data,
                        page: draft.last_page || 0,
                      })
                    );
                  }
                  setDraftLoaded(true);

                  Toast.show({
                    type: 'info',
                    text1: t("FormElementPage.draft_loaded") || "Draft Loaded",
                    text2: t("FormElementPage.draft_loaded_message") ||
                      "Continuing from your last save",
                    position: 'top',
                    visibilityTime: 3000,
                  });
                },
              },
            ],
            { cancelable: false }
          );
        } else {
          setDraftLoaded(true);
        }
      } catch (error) {
        console.error('Error checking for draft:', error);
        setDraftLoaded(true);
      }
    };

    checkForDraft();
  }, [getAll, user?.id, parsedParams.pid, draftLoaded]);

  async function uploadFileToServer(
    fileUri: string,
    fileName: string,
    mimeType: string,
    fieldKey: string
  ): Promise<string | null> {
    try {
      console.log('=== UPLOADING TO SERVER ===');
      console.log('File:', fileName);
      console.log('Field:', fieldKey);

      const formId = parsedParams.pid; // Your form ID

      // Create FormData
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: fileName,
      } as any);

      // Build URL with query parameters
      const uploadUrl = `${process.env.EXPO_PUBLIC_API_URL}/api/uploads?formId=${formId}&fieldName=${fieldKey}`;

      console.log('Upload URL:', uploadUrl);

      const response = await baseInstance.post(uploadUrl, formData, { timeout: 60000 });

      console.log('Response status:', response.status);

      if (!response.status || response.status < 200 || response.status >= 300) {
        const errorText = await response.data();
        console.error('Upload failed:', errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.data();
      console.log('Upload result:', result);

      // The server should return the public URL
      if (result.url) {
        console.log('✓ File uploaded successfully:', result.url);
        return result.url;
      } else {
        throw new Error('No URL in server response');
      }

    } catch (error) {
      console.error('Upload error:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: error instanceof Error ? error.message : 'Unknown error',
        position: 'top',
      });
      return null;
    }
  }
  const handleMediaUpload = useCallback(async (fieldKey, allowMultiple = false) => {
    try {
      console.log("=== MEDIA UPLOAD START (URL MODE) ===");

      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

      const [mediaPermission, cameraPermission] = await Promise.all([
        requestMediaLibraryPermission(),
        requestCameraPermission()
      ]);

      Alert.alert(
        'Select Media',
        'Choose how to add your files',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              try {
                if (!cameraPermission) {
                  Toast.show({
                    type: 'error',
                    text1: 'Permission Required',
                    text2: 'Camera access needed',
                    position: 'top',
                  });
                  return;
                }

                const photo = await takePhoto();
                if (photo && webViewRef.current) {
                  // Check size
                  if (photo.size && photo.size > MAX_FILE_SIZE) {
                    Toast.show({
                      type: 'error',
                      text1: 'File Too Large',
                      text2: 'Maximum size is 10MB',
                      position: 'top',
                    });
                    return;
                  }

                  // Upload to YOUR server first
                  const uploadedUrl = await uploadFileToServer(
                    photo.uri,
                    photo.name || `photo_${Date.now()}.jpg`,
                    photo.mimeType || 'image/jpeg',
                    fieldKey
                  );

                  if (uploadedUrl) {
                    // Send the URL to Form.io
                    const message = {
                      type: 'MEDIA_SELECTED',
                      fieldKey: fieldKey,
                      media: [{
                        name: photo.name || `photo_${Date.now()}.jpg`,
                        size: photo.size || 0,
                        type: photo.mimeType || 'image/jpeg',
                        url: uploadedUrl, // This is the public URL from your server
                        storage: 'url'
                      }]
                    };

                    console.log("Sending photo URL to Form.io:", uploadedUrl);
                    webViewRef.current.postMessage(JSON.stringify(message));

                    Toast.show({
                      type: 'success',
                      text1: 'Success',
                      text2: 'Photo uploaded',
                      position: 'top',
                    });
                  }
                }
              } catch (error) {
                console.error("Error taking photo:", error);
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Failed to upload photo',
                  position: 'top',
                });
              }
            },
          },
          {
            text: 'Documents',
            onPress: async () => {
              try {
                const documents = await pickDocument({
                  allowMultiple: allowMultiple,
                  type: '*/*'
                });

                if (documents && documents.length > 0 && webViewRef.current) {
                  try {
                    // Upload all documents to your server
                    const uploadedDocs = await Promise.all(
                      documents.map(async (doc) => {
                        try {
                          if (doc.size && doc.size > MAX_FILE_SIZE) {
                            console.warn(`Document ${doc.name} too large`);
                            return null;
                          }

                          const uploadedUrl = await uploadFileToServer(
                            doc.uri,
                            doc.name || `document_${Date.now()}.pdf`,
                            doc.mimeType || 'application/pdf',
                            fieldKey
                          );

                          if (uploadedUrl) {
                            return {
                              name: doc.name || `document_${Date.now()}.pdf`,
                              size: doc.size || 0,
                              type: doc.mimeType || 'application/pdf',
                              url: uploadedUrl,
                              storage: 'url'
                            };
                          }
                          return null;
                        } catch (error) {
                          console.error("Error processing doc:", error);
                          return null;
                        }
                      })
                    );

                    const validDocs = uploadedDocs.filter(d => d !== null);

                    if (validDocs.length === 0) {
                      Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: 'Failed to upload documents',
                        position: 'top',
                      });
                      return;
                    }

                    const message = {
                      type: 'MEDIA_SELECTED',
                      fieldKey: fieldKey,
                      media: validDocs
                    };

                    console.log("Sending document URLs to Form.io:", validDocs);
                    webViewRef.current.postMessage(JSON.stringify(message));

                    Toast.show({
                      type: 'success',
                      text1: 'Success',
                      text2: `${validDocs.length} document(s) uploaded`,
                      position: 'top',
                    });
                  } catch (error) {
                    console.error("Error uploading documents:", error);
                    Toast.show({
                      type: 'error',
                      text1: 'Error',
                      text2: 'Failed to upload documents',
                      position: 'top',
                    });
                  }
                }
              } catch (error) {
                console.error("Error picking documents:", error);
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error in handleMediaUpload:', error);
    }
  }, [takePhoto, pickDocument, requestMediaLibraryPermission, requestCameraPermission]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Date.now() - formStartTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [formStartTime]);

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
        setLoadingStep(t(`FormElementPage.loading_form`));

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

        setLoadingStep(t(`FormElementPage.loading_form`));
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
          translatedForm = translateFormSchema(baseForm, parseTranslations, currentLang);
          console.log("translatedForm:", translatedForm);
        } else {
          console.log('Failed to parse translations');
        }
      }

      console.log('Form parsed successfully, converting to wizard...');
      const wizardForm = convertToWizardForm(translatedForm, 5, t);
      console.log('Wizard conversion complete', wizardForm);

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




  const processFormDataForSubmission = async (formData: any): Promise<any> => {
    const processedData: any = {};

    for (const [key, value] of Object.entries(formData)) {
      if (key === 'language' || key === 'submit') {
        processedData[key] = value;
        continue;
      }

      if (isFileValue(value)) {
        processedData[key] = await processFileValue(value);
      } else if (Array.isArray(value)) {
        processedData[key] = await Promise.all(
          value.map(async (item) => {
            if (isFileValue(item)) {
              return await processFileValue(item);
            }
            return item;
          })
        );
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        processedData[key] = await processFormDataForSubmission(value);
      } else {
        processedData[key] = value;
      }
    }

    return processedData;
  };

  const isFileValue = (value: any): boolean => {
    if (!value || typeof value !== 'object') return false;
    if (value.storage && value.name && value.url) return true;
    if (value.uri || value.url || value.path) {
      return true;
    }
    if (value.data && typeof value.data === 'string' && value.data.startsWith('data:')) {
      return true;
    }
    return false;
  };

  const processFileValue = async (fileValue: any): Promise<any> => {
    try {
      if (fileValue.uri && fileValue.name && fileValue.type) {
        return {
          uri: fileValue.uri,
          url: fileValue.url || fileValue.uri,
          path: fileValue.path || fileValue.uri,
          name: fileValue.name || fileValue.fileName || 'file',
          type: fileValue.type || fileValue.mimeType || 'application/octet-stream',
          size: fileValue.size || 0,
          originalData: fileValue.originalData || null
        };
      }

      if (fileValue.storage && fileValue.name && fileValue.url) {
        return {
          uri: fileValue.url,
          url: fileValue.url,
          path: fileValue.url,
          name: fileValue.name,
          type: fileValue.type || 'application/octet-stream',
          size: fileValue.size || 0,
          storage: fileValue.storage,
          originalData: fileValue.originalData || null
        };
      }

      if (fileValue.data && typeof fileValue.data === 'string') {
        const base64Data = fileValue.data;
        const matches = base64Data.match(/^data:([^;]+);base64,/);
        const mimeType = matches ? matches[1] : 'application/octet-stream';

        return {
          uri: base64Data,
          url: base64Data,
          path: base64Data,
          name: fileValue.name || fileValue.fileName || 'file',
          type: mimeType,
          size: fileValue.size || 0,
          isBase64: true,
          originalData: base64Data
        };
      }

      return {
        uri: fileValue.uri || fileValue.url || fileValue.path || '',
        url: fileValue.url || fileValue.uri || fileValue.path || '',
        path: fileValue.path || fileValue.uri || fileValue.url || '',
        name: fileValue.name || fileValue.fileName || 'file',
        type: fileValue.type || fileValue.mimeType || 'application/octet-stream',
        size: fileValue.size || 0,
        originalData: fileValue
      };
    } catch (error) {
      console.error('Error processing file value:', error);
      return fileValue;
    }
  };

  const handleFormSubmission = useCallback(
    async (formData: any) => {
      console.log("handleFormSubmission called");

      if (isSubmittingRef.current) {
        console.warn("Already submitting, ignoring duplicate");
        return;
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);

      const finalTimeSpent = Date.now() - formStartTime;
      const userId = user?.id || user?.json?.id;

      try {
        const processedData = await processFormDataForSubmission(formData);

        const completeFormData = {
          ...processedData,
          time_spent_filling_the_form: Math.floor(finalTimeSpent / 1000),
          survey_id: regularForm?.id,
          table_name: regularForm?.table_name,
          project_module_id: parsedParams.pmid,
          source_module_id: parsedParams.smid,
          project_id: parsedParams.projId,
          user_id: userId,
        };

        let formId = regularForm?.id;

        await saveSurveySubmissionToAPI(
          create,
          completeFormData,
          `/submissions/${formId}/submit`,
          t,
          fields,
          userId
        );

        console.log("Submission successful");

      } catch (error) {
        console.error("Submission error:", error);

        Toast.show({
          type: "error",
          text1: t("Alerts.error.title") || "Error",
          text2: t("Alerts.error.submission.unexpected") || "Failed to save form",
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
        const messageData = event.nativeEvent.data;
        const message = typeof messageData === 'string'
          ? JSON.parse(messageData)
          : messageData;

        console.log("WebView message:", message.type);

        switch (message.type) {
          case "FORM_READY":
            console.log("Form is ready and displayed");
            setLoading(false);
            break;

          case "FORM_SUBMIT":
            // Delete draft on successful submission
            if (user?.id && parsedParams.pid) {
              deleteDraft(
                (table: string, id: string) => {
                  return deleteRecord(table, id);
                },
                parsedParams.pid,
                String(user.id)
              ).catch(err => console.error('Error deleting draft:', err));
            }
            handleFormSubmission(message.data);
            break;

          case "FORM_CHANGE":
            // Auto-save on form change
            if (debouncedSaveRef.current && autoSaveEnabled) {
              const totalPages = parsedForm?.display === 'wizard'
                ? parsedForm.components?.length || 1
                : 1;

              debouncedSaveRef.current(
                message.data,
                message.currentPage || 0,
                totalPages
              );
            }
            break;

          case "PAGE_CHANGE":
            // Save immediately on page change
            if (autoSaveEnabled && user?.id && parsedParams.pid) {
              const totalPages = parsedForm?.display === 'wizard'
                ? parsedForm.components?.length || 1
                : 1;

              saveDraft(
                create,
                update,
                getAll,
                parsedParams.pid,
                String(user.id),
                message.data,
                message.currentPage || 0,
                totalPages,
                regularForm?.name
              ).catch(err => console.error('Error saving draft:', err));
            }
            break;

          case "REQUEST_MEDIA":
            console.log("Media upload requested for field:",
              message.fieldKey, "Allow multiple:", message.allowMultiple);
            handleMediaUpload(message.fieldKey, message.allowMultiple);
            break;

          default:
            console.log("Unknown message:", message.type);
        }
      } catch (err) {
        console.error("Failed to parse WebView message:", err);
      }
    },
    [handleFormSubmission, handleMediaUpload, autoSaveEnabled,
      user?.id, parsedParams.pid, parsedForm]
  );

  // Optional: Add auto-save indicator in UI
  const renderAutoSaveIndicator = () => {
    if (!autoSaveEnabled) return null;

    return (
      <View className="absolute top-2 right-2 bg-white/90 px-3 py-1 rounded-full 
                    flex-row items-center shadow-sm">
        <View className={`w-2 h-2 rounded-full mr-2 ${lastSavedTime ? 'bg-green-500' : 'bg-gray-300'
          }`} />
        <Text className="text-xs text-gray-600">
          {lastSavedTime
            ? `Saved ${formatTimeSince(lastSavedTime)}`
            : 'Auto-save enabled'
          }
        </Text>
      </View>
    );
  };

  // Helper function for time formatting
  const formatTimeSince = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const formHtml = useMemo(() => {
    if (!parsedForm || !assetsReady) {
      console.log('Cannot generate HTML - form not ready or assets not ready');
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
        ? parsedForm.components.length : 1;

      const jsPath = `${FileSystem.cacheDirectory}formio.full.min.js`;
      const cssPath = `${FileSystem.cacheDirectory}formio.full.min.css`;
      const bootstrapPath = `${FileSystem.cacheDirectory}bootstrap.min.css`;

      const reviewTranslations = {
        reviewTitle: t("ReviewPage.title") || "Review Your Answers",
        reviewSubtitle: t("ReviewPage.description") || "Please review your answers carefully before submitting.",
        pageOf: t("ReviewPage.pageOf") || "Page {page} of {total}",
        page: t("ReviewPage.page") || "Page",
        notProvided: t("ReviewPage.notProvided") || "Not provided",
        yes: t("ReviewPage.yes") || "Yes",
        no: t("ReviewPage.no") || "No"
      };

      const btnTranslations = {
        en: { submit: 'Submit', cancel: 'Cancel', previous: 'Previous', next: 'Next' },
        es: { submit: 'Enviar', cancel: 'Cancelar', previous: 'Anterior', next: 'Siguiente' },
        fr: { submit: 'Soumettre', cancel: 'Annuler', previous: 'Précédent', next: 'Suivant' },
        rw: { submit: "Ohereza", cancel: "Reka", previous: "Subira Inyuma", next: "Komeza" }
      };

      const currentBtnTranslations = btnTranslations[normalizedLang] || btnTranslations['en'];
      const escapedReviewTranslations = JSON.stringify(reviewTranslations).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
      const escapedBtnTranslations = JSON.stringify(currentBtnTranslations).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Form</title>
  <link href="${cssPath}" rel="stylesheet" onerror="this.href='https://cdn.form.io/formiojs/formio.full.min.css'">
  <link href="${bootstrapPath}" rel="stylesheet" onerror="this.href='https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
  <style>
    :root { --primary-color: #00227c; --primary-light: #1d4097ff; --primary-dark: #001a5e; }
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
    .form-container { margin: 20px auto; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .form-title { color: var(--primary-color); font-size: 24px; font-weight: 600; text-align: center; margin-bottom: 10px; }
    .custom-progress-container { margin: 15px 0 25px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
    .custom-progress-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 14px; color: #666; }
    .custom-progress-text { font-weight: 600; color: var(--primary-color); }
    .custom-progress-bar-container { width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; }
    .custom-progress-bar { height: 100%; background: linear-gradient(90deg, var(--primary-color), var(--primary-light)); border-radius: 4px; transition: width 0.3s ease; }
    .pagination { display: none !important; }
    .btn-wizard-nav-cancel, .btn-wizard-nav-previous, .btn-wizard-nav-next, .btn-wizard-nav-submit { border-radius: 8px; padding: 10px 24px; font-weight: 600; border: none; margin: .7em 0px; }
    .btn-wizard-nav-next, .btn-wizard-nav-submit { background: var(--primary-color) !important; color: white !important; }
    .btn-wizard-nav-next:hover, .btn-wizard-nav-submit:hover { background: var(--primary-dark) !important; }
    .btn-wizard-nav-previous { background: #6c757d !important; color: white !important; }
    .btn-wizard-nav-cancel { background: #a19e9eff !important; color: white !important; }
    .form-control:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(162, 58, 145, 0.1); }
    .loading { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 300px; font-size: 18px; color: var(--primary-color); }
    .loading-spinner { width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .review-container { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .review-header { background: var(--primary-color); color: white; padding: 15px 20px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
    .review-header h3 { margin: 0; font-size: 20px; font-weight: 600; }
    .review-section { background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .review-section-title { color: var(--primary-color); font-size: 16px; font-weight: 600; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e9ecef; }
    .review-item { padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
    .review-item:last-child { border-bottom: none; }
    .review-label { font-weight: 600; color: #495057; margin-bottom: 5px; font-size: 14px; }
    .review-value { color: #212529; font-size: 15px; line-height: 1.5; word-wrap: break-word; }
    .review-empty { color: #6c757d; font-style: italic; }
  </style>
  <script>
    console.log('=== FORMIO MEDIA HANDLER - CORRECTED VERSION ===');
    let formInstance = null;
    
    window.initFormInstance = function(form) {
      formInstance = form;
      console.log('✓ Form instance initialized');
    };
    

    function prepareFileForFormio(item) {
      console.log(' Preparing file:', item.name, 'Storage:', item.storage);
      
      let fileUrl = item.url;
      
      if (item.storage === 'base64') {
        let base64Data = fileUrl;
        
        // Extract base64 if it's already a data URI
        if (base64Data.startsWith('data:')) {
          const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            base64Data = matches[2];
            console.log('  ↳ Extracted base64 from existing data URI');
          }
        }
        
        // CRITICAL: Remove ALL whitespace
        base64Data = base64Data.replace(/\\s/g, '');
        
        // Reconstruct with proper format
        fileUrl = \`data:\${item.type};base64,\${base64Data}\`;
        
        // Validate
        if (!fileUrl.match(/^data:[^;]+;base64,[A-Za-z0-9+/]+=*$/)) {
          console.error(' Invalid Base64 format:', item.name);
          console.error('   Preview:', fileUrl.substring(0, 100));
          return null;
        }
        
        console.log('  Base64 validated');
        console.log('  Length:', fileUrl.length);
      }
      
      return {
        name: item.name || 'file',
        originalName: item.name,
        size: item.size || 0,
        type: item.type || 'application/octet-stream',
        url: fileUrl,
        storage: item.storage || 'base64',
        data: fileUrl
      };
    }
    
    document.addEventListener('click', function(e) {
      const target = e.target;
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
        if (fileInput) componentElement = fileInput.closest('.formio-component-file');
      } else if (target.closest('.formio-component-file')) {
        componentElement = target.closest('.formio-component-file');
        fileInput = componentElement.querySelector('input[type="file"]');
      }
      
      if (fileInput && componentElement) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        let fieldKey = fileInput.name || fileInput.id || fileInput.getAttribute('data-key');
        
        if (!fieldKey && componentElement) {
          fieldKey = componentElement.getAttribute('ref') || 
                     componentElement.getAttribute('data-component-key') ||
                     componentElement.id;
        }
        
        if (!fieldKey && formInstance) {
          const allComponents = formInstance.components || [];
          for (let comp of allComponents) {
            if (comp.element === componentElement || componentElement.contains(comp.element)) {
              fieldKey = comp.component.key;
              break;
            }
          }
        }
        
        const allowMultiple = fileInput.hasAttribute('multiple');
        
        if (fieldKey && window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'REQUEST_MEDIA',
            fieldKey: fieldKey,
            allowMultiple: allowMultiple
          }));
        }
        
        return false;
      }
    }, true);
    function handleMediaMessage(event) {
      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (message.type === 'MEDIA_SELECTED') {
          console.log('===  MEDIA UPLOAD START ===');
          console.log('Field:', message.fieldKey, '| Count:', message.media?.length);
          
          if (!formInstance) {
            console.error(' Form instance not available');
            return;
          }
          
          // Find component with fallback methods
          let component = formInstance.getComponent(message.fieldKey);
          
          if (!component) {
            try {
              const allComponents = formInstance.getAllComponents();
              component = allComponents.find(c => 
                c.component.key === message.fieldKey || c.key === message.fieldKey
              );
            } catch (err) {
              console.error('Error searching components:', err);
            }
          }
          
          if (!component) {
            console.error(' Component not found:', message.fieldKey);
            return;
          }
          
          console.log('✓ Component found:', component.component.key);
          
          if (message.media && message.media.length > 0) {
            // Prepare files with validation
            const formioFiles = message.media
              .map(prepareFileForFormio)
              .filter(f => f !== null);
            
            if (formioFiles.length === 0) {
              console.error(' No valid files after preparation');
              return;
            }
            
            console.log(\` Prepared \${formioFiles.length} valid file(s)\`);
            
            try {
              // CRITICAL: Always use array format
              const currentValue = component.getValue();
              let newValue;
              
              if (component.component.multiple) {
                const existing = Array.isArray(currentValue) ? currentValue : [];
                newValue = existing.concat(formioFiles);
              } else {
                newValue = formioFiles;
              }
              
              // Set value and trigger updates
              component.setValue(newValue);
              
              if (component.updateValue) component.updateValue();
              if (component.triggerChange) component.triggerChange();
              
              setTimeout(() => {
                if (component.redraw) component.redraw();
              }, 100);
              
              if (formInstance.triggerChange) formInstance.triggerChange();
              
              // Verify
              const verifyValue = component.getValue();
              console.log('✓ Verification - Files set:', Array.isArray(verifyValue) ? verifyValue.length : 'N/A');
              console.log('=== MEDIA UPLOAD SUCCESS ===');
              
            } catch (setError) {
              console.error('===  SET VALUE ERROR ===');
              console.error('Error:', setError.message);
              console.error('Stack:', setError.stack);
            }
          }
        }
      } catch (err) {
        console.error('===  MESSAGE HANDLER ERROR ===');
        console.error('Error:', err.message);
        console.error('Stack:', err.stack);
      }
    }
    
    // Draft loading handler
    function handleDraftMessage(event) {
      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (message.type === 'LOAD_DRAFT' && formInstance) {
          if (message.data) {
            formInstance.submission = { data: message.data };
          }
          if (message.page && formInstance.setPage) {
            formInstance.setPage(message.page);
          }
          if (formInstance.redraw) {
            formInstance.redraw();
          }
        }
      } catch (err) {
        console.error('Draft load error:', err);
      }
    }
    
    // Auto-save change emission
    let changeTimeout = null;
    let lastEmittedData = null;
    
    function emitFormChange(currentData, currentPage) {
      clearTimeout(changeTimeout);
      changeTimeout = setTimeout(() => {
        const dataString = JSON.stringify(currentData);
        if (dataString !== lastEmittedData) {
          lastEmittedData = dataString;
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'FORM_CHANGE',
              data: currentData,
              currentPage: currentPage || 0
            }));
          }
        }
      }, 500);
    }
    
    // Register handlers
    document.addEventListener('message', handleMediaMessage);
    window.addEventListener('message', handleMediaMessage);
    document.addEventListener('message', handleDraftMessage);
    window.addEventListener('message', handleDraftMessage);
    window.handleMediaMessage = handleMediaMessage;
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
      <div>${t('FormElementPage.loading_form')}</div>
    </div>
    <div id="formio" style="display: none;"></div>
  </div>
  <script>
    Object.defineProperty(document, 'cookie', {
      get: () => '',
      set: () => true
    });
    
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('cookie') || message.includes('Cookie')) return;
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
          }
        } catch (err) {
          console.error('Post message error:', err);
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
    
  function renderComponentValue(value, component) {
  if (value === null || value === undefined || value === "") {
    return '<span class="review-empty">' + reviewTranslations.notProvided + '</span>';
  }

  function renderFileList(files) {
    let html = "<div>";
    files.forEach(file => {
      const name = file.name || "File";
      const url = file.url || file.uri;
      const isImage = file.type && file.type.startsWith("image");

      if (isImage) {
        html += \`<img src="\${url}" alt="\${name}" class="review-image" style="max-width: 200px; margin: 5px; border-radius: 4px;" />\`;
      } else {
        html += \`<div class="review-file" style="padding: 8px; background: #f8f9fa; border-radius: 4px; margin: 5px 0;"><i class="fas fa-file"></i> \${name}</div>\`;
      }
    });
    html += "</div>";
    return html;
  }

  // ✅ Handle CHECKBOX component type FIRST (before array check)
  if (component.type === 'checkbox') {
    const isChecked = value === true || value === 'true' || value === 1 || value === '1';
    return isChecked
      ? \`<span style="color: #28a745;">\${reviewTranslations.yes}</span>\`
      : \`<span style="color: #dc3545;">\${reviewTranslations.no}</span>\`;
  }

  // ✅ Handle SELECTBOXES component type (multiple checkboxes)
  if (component.type === 'selectboxes' && typeof value === 'object' && !Array.isArray(value)) {
    let html = '<div style="padding-left: 10px;">';
    const values = component.values || [];
    
    for (let key in value) {
      if (value.hasOwnProperty(key)) {
        const option = values.find(v => v.value === key);
        const label = option ? option.label : key;
        const isChecked = value[key] === true || value[key] === 'true';
        
        if (isChecked) {
          html += \`<div style="margin: 5px 0;">
            <ul style="list-style: disc; padding: 0; margin: 0 10px;">
              <li>\${label}</li>
            </ul>
          </div>\`;
        }
      }
    }
    
    html += '</div>';
    return html || '<span class="review-empty">' + reviewTranslations.notProvided + '</span>';
  }

  // Arrays (rest of your existing code...)
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '<span class="review-empty">' + reviewTranslations.notProvided + '</span>';
    }

    if (value[0] && (value[0].url || value[0].uri)) {
      return renderFileList(value);
    }

    if (typeof value[0] === "object") {
      let html = "<div>";
      value.forEach((row, rowIndex) => {
        html += \`
          <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 6px;">
            <div style="font-weight: 600; margin-bottom: 8px;">
              \${(component.label || component.key)} - \${rowIndex + 1}
            </div>
        \`;

        const subComponents =
          component.components ||
          component.columns ||
          component.rows ||
          [];

        subComponents.forEach(sub => {
          const subKey = sub.key;
          const subLabel = sub.label || subKey;
          const subValue = row[subKey];

          html += \`
            <div class="review-item">
              <div class="review-label">\${subLabel}</div>
              <div class="review-value">
                \${renderComponentValue(subValue, sub)}
              </div>
            </div>
          \`;
        });

        html += "</div>";
      });

      html += "</div>";
      return html;
    }

    return \`<ul class="review-list" style="padding-left: 20px;">\${value.map(v => \`<li>\${String(v)}</li>\`).join("")}</ul>\`;
  }

  // Object handling
  if (typeof value === "object") {
    if (value.url || value.uri) {
      return renderFileList([value]);
    }

    let html = "<div>";
    (component.components || []).forEach(sub => {
      const subKey = sub.key;
      const subLabel = sub.label || subKey;
      const subValue = value[subKey];

      html += \`
        <div class="review-item">
          <div class="review-label">\${subLabel}</div>
          <div class="review-value">
            \${renderComponentValue(subValue, sub)}
          </div>
        </div>
      \`;
    });

    html += "</div>";
    return html;
  }

  // Boolean
  if (typeof value === "boolean") {
    return value
      ? \`\${reviewTranslations.yes}\`
      : \`\${reviewTranslations.no}\`;
  }

  // Select dropdown
  if (component.type === 'select' && component.data && component.data.values) {
    const option = component.data.values.find(opt => opt.value === value);
    if (option) {
      return String(option.label);
    }
  }

  // Radio buttons
  if (component.type === 'radio' && component.values) {
    const option = component.values.find(opt => opt.value === value);
    if (option) {
      return String(option.label);
    }
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }

  return String(value);
}    
  function generateReviewPage(formData, components) {
  let html = '<div class="review-container">';
  html += '<div class="review-header">';
  html += '<h3><i class="fas fa-clipboard-check"></i> ' + reviewTranslations.reviewTitle + '</h3>';
  html += '</div>';
  html += '<p style="margin-bottom: 20px; color: #6c757d;">' + reviewTranslations.reviewSubtitle + '</p>';
  
  // Group components by page
  const pages = {};
  const questionsPerPage = 5;
  
  components.forEach(function(comp, index) {
    // Skip buttons and HTML elements
    if (comp.type === 'button' || comp.type === 'htmlelement' || comp.type === 'content') {
      return;
    }
    
    const pageNum = Math.floor(index / questionsPerPage) + 1;
    if (!pages[pageNum]) {
      pages[pageNum] = [];
    }
    pages[pageNum].push(comp);
  });

  // Render each page section
  Object.keys(pages).forEach(function(pageNum) {
    const pageText = reviewTranslations.pageOf
      .replace('{page}', pageNum)
      .replace('{total}', Object.keys(pages).length);
    
    html += '<div class="review-section">';
    html += '<div class="review-section-title">';
    html += '<i class="fas fa-list-ul"></i> ' + pageText;
    html += '</div>';

    pages[pageNum].forEach(function(comp) {
      const label = comp.label || comp.key;
      const value = formData[comp.key];
      
      // Only show if there's a value
      if (value !== undefined && value !== null && value !== '') {
        html += '<div class="review-item">';
        html += '<div class="review-label">' + label + '</div>';
        html += '<div class="review-value">' + renderComponentValue(value, comp) + '</div>';
        html += '</div>';
      }
    });

    html += '</div>';
  });
  
  html += '</div>';
  return html;
}


      async function initializeForm() {
        if (formInitialized) return;
        
        if (typeof Formio === 'undefined' || !window.Formio || !window.Formio.createForm) {
          initAttempts++;
          if (initAttempts < MAX_INIT_ATTEMPTS) {
            setTimeout(initializeForm, RETRY_DELAY);
            return;
          } else {
            loadingEl.innerHTML = '<div style="color: red;">FormIO failed to load</div>';
            postMessage({ type: 'FORM_ERROR', error: 'FormIO library failed to load' });
            return;
          }
        }
        
        formInitialized = true;
        
        try {
          const formSchema = JSON.parse('${escapedFormJson}');
          function extractComponents(components, parentPath = []) {
    if (!Array.isArray(components)) return;
    
    components.forEach(comp => {
      if (!comp || typeof comp !== 'object') return;
      
      // Skip buttons and HTML elements
      if (comp.type === 'button' || comp.type === 'htmlelement' || comp.type === 'content') {
        return;
      }
      
      // Store the full component with all its properties
      allComponents.push({
        ...comp,
        _parentPath: [...parentPath]
      });
      
      // Recursively extract nested components
      if (comp.components && Array.isArray(comp.components)) {
        extractComponents(comp.components, [...parentPath, comp.key]);
      }
      
      // Handle columns (for columns component)
      if (comp.columns && Array.isArray(comp.columns)) {
        comp.columns.forEach((col, idx) => {
          if (col.components) {
            extractComponents(col.components, [...parentPath, comp.key, \`col\${idx}\`]);
          }
        });
      }
      
      // Handle rows (for datagrid, editgrid)
      if (comp.rows && Array.isArray(comp.rows)) {
        comp.rows.forEach((row, idx) => {
          if (Array.isArray(row)) {
            row.forEach(cell => {
              if (cell.components) {
                extractComponents(cell.components, [...parentPath, comp.key, \`row\${idx}\`]);
              }
            });
          }
        });
      }
    });
  }
          const allComponents = [];
           if (formSchema.display === 'wizard' && Array.isArray(formSchema.components)) {
    // Extract from all wizard pages
    formSchema.components.forEach(page => {
      if (page.components) {
        extractComponents(page.components, [page.key || 'page']);
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

          form = await Formio.createForm(formioEl, formSchema, {
            noAlerts: true,
            readOnly: false,
            sanitize: true,
            language: currentLanguage,
            i18n: { [currentLanguage]: buttonTranslations },
            buttonSettings: {
              showCancel: true,
              showPrevious: true,
              showNext: true,
              showSubmit: true
            }
          });
          
          window.form = form;
          window.initFormInstance(form);
          formInstance = form;
          
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
              
              progressText.textContent = currentPage === form.pages.length - 1 
                ? 'Review' 
                : \`Page \${pageNum} of \${TOTAL_PAGES}\`;
              
              progressPercentage.textContent = percentage + '%';
              progressBar.style.width = percentage + '%';
            }
            
            updateProgress(form.page);
            
            form.on('wizardPageSelected', (page) => {
  const data = form.submission?.data || {};
  
  // If selected page is the review page
  if (page.page === form.pages.length - 1) {
    setTimeout(() => {
      const reviewContent = document.getElementById('reviewContent');
      if (reviewContent && allComponents.length > 0) {
        console.log('Generating review page (direct nav) with data:', data);
        const reviewHtml = generateReviewPage(data, allComponents);
        reviewContent.innerHTML = reviewHtml;
      }
    }, 100);
  }
  
  updateProgress(form.page);
});
           form.on('prevPage', () => {
  const data = form.submission?.data || {};
  postMessage({ type: 'PAGE_CHANGE', data, currentPage: form.page });
  updateProgress(form.page);
});
            form.on('nextPage', () => {
  const data = form.submission?.data || {};
  postMessage({ type: 'PAGE_CHANGE', data, currentPage: form.page });
  
  // Check if we're navigating TO the review page (last page)
  if (form.page === form.pages.length - 1) {
    setTimeout(() => {
      const reviewContent = document.getElementById('reviewContent');
      if (reviewContent && allComponents.length > 0) {
        console.log('Generating review page with data:', data);
        const reviewHtml = generateReviewPage(data, allComponents);
        reviewContent.innerHTML = reviewHtml;
      }
    }, 100);
  }
  updateProgress(form.page);
});
            form.on('change', () => {
              const data = form.submission?.data || {};
              emitFormChange(data, form.page || 0);
              updateProgress(form.page);
            });
          }

          form.on('submit', submission => {
            postMessage({ type: 'FORM_SUBMIT', data: submission.data });
          });

          form.on('error', errors => {
            postMessage({ type: 'FORM_ERROR', error: JSON.stringify(errors) });
          });

          postMessage({ type: 'FORM_READY' });
          console.log('Form initialized and ready');
          
        } catch (error) {
          console.error('Form init error:', error);
          loadingEl.innerHTML = '<div style="color: red;">Error: ' + error.message + '</div>';
          postMessage({ type: 'FORM_ERROR', error: error.message });
        }
      }

      function waitForFormio() {
        if (typeof window.Formio !== 'undefined' && window.Formio && window.Formio.createForm) {
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
</html>`;
    } catch (err) {
      console.error('Error generating form HTML:', err);
      return "";
    }
  }, [parsedForm, regularForm?.name, assetsReady, t, normalizedLang]);

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
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: formHtml, baseUrl: `${process.env.EXPO_PUBLIC_API_URL}/api/uploads` }}
        javaScriptEnabled={true}
        onMessage={handleWebViewMessage}
        cacheEnabled={true}
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        incognito={true}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        injectedJavaScript={`console.log("webview javascript injected"); window.isReactNativeWebView=true;true;`}
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