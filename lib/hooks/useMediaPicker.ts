import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { Alert, Linking, Platform } from "react-native";

export interface MediaResult {
  uri: string;          
  type: string;          
  name: string;          
  size?: number;
  width?: number;
  height?: number;
  mimeType?: string;     
}

export interface UploadOptions {
  formId?: string;
  fieldName: string;
  baseUrl?: string;
  onProgress?: (progress: number) => void;
}

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  url: string;
  storage: 'url';
  _id: string;
}

async function ensureFileUriUsable(uri: string): Promise<string> {
  if (!uri) throw new Error("Empty uri");
  if (uri.startsWith("file://")) return uri;
  const fileName = uri.split("/").pop() || `file_${Date.now()}`;
  const dest = `${FileSystem.cacheDirectory}${fileName}`;

  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch (err) {
    console.warn("FileSystem.copyAsync failed, falling back to fetch+write:", err);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      return await new Promise<string>((resolve, reject) => {
        reader.onerror = () => reject(new Error("Failed to read blob"));
        reader.onload = async () => {
          try {
            const arrayBuffer = reader.result as ArrayBuffer;
            let binary = "";
            const bytes = new Uint8Array(arrayBuffer);
            const chunkSize = 0x8000;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              const sub = bytes.subarray(i, i + chunkSize);
              binary += String.fromCharCode.apply(null, Array.from(sub) as any);
            }
            const base64 = btoa(binary);
            await FileSystem.writeAsStringAsync(dest, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            resolve(dest);
          } catch (e) {
            reject(e);
          }
        };
        reader.readAsArrayBuffer(blob);
      });
    } catch (err2) {
      console.warn("Fetch fallback failed:", err2);
      return uri;
    }
  }
}

const generateFallbackName = (mimeType?: string, prefix = "file") => {
  const ext = mimeType ? mimeType.split("/")[1] : undefined;
  return `${prefix}_${Date.now()}.${ext || "bin"}`;
};

export const useMediaPicker = (baseInstance?: any) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  const requestMediaLibraryPermission = async (): Promise<boolean> => {
    try {
      const pickerPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const mediaPerm = await MediaLibrary.requestPermissionsAsync();
      const granted =
        pickerPerm.status === "granted" ||
        (pickerPerm as any).granted ||
        mediaPerm.status === "granted" ||
        (mediaPerm as any).granted;

      setHasPermission(granted);

      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Please grant permission to access your photos in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: openSettings },
          ]
        );
      }

      return granted;
    } catch (error) {
      console.error("Error requesting media library permission:", error);
      Alert.alert("Error", "Failed to request media library permission");
      return false;
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      const granted =
        camPerm.status === "granted" || (camPerm as any).granted;
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Please grant permission to access your camera in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: openSettings },
          ]
        );
      }
      return granted;
    } catch (error) {
      console.error("Error requesting camera permission:", error);
      Alert.alert("Error", "Failed to request camera permission");
      return false;
    }
  };

  const normalizeAsset = async (asset: any, fallbackPrefix = "file"): Promise<MediaResult> => {
    const mime = asset.mimeType || asset.type || asset.mime || (asset.uri && asset.uri.includes(".mp4") ? "video/mp4" : "image/jpeg");
    const name = asset.fileName || asset.name || generateFallbackName(mime, fallbackPrefix);
    const size = asset.fileSize || asset.size || undefined;
    const width = asset.width || undefined;
    const height = asset.height || undefined;

    const uri = await ensureFileUriUsable(asset.uri || asset.uriString || asset.uri);

    return {
      uri,
      type: mime,
      mimeType: mime,
      name,
      size,
      width,
      height,
    };
  };

  /**
   * Upload a single file to the backend
   */
  const uploadFile = async (
    file: MediaResult,
    options: UploadOptions
  ): Promise<UploadedFile> => {
    if (!baseInstance) {
      throw new Error("baseInstance is required for file upload");
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const uploadUrl = `uploads`;
      
      console.log('Uploading file to:', uploadUrl);
      console.log('File details:', { name: file.name, type: file.type, size: file.size });

      // Create FormData
      const formData = new FormData();
      
      // Add form metadata
      if (options.formId) {
        formData.append('formId', options.formId);
      }
      formData.append('fieldName', options.fieldName);
      
      // Prepare file for upload
      const fileToUpload: any = {
        uri: file.uri,
        type: file.type || file.mimeType || 'application/octet-stream',
        name: file.name,
      };

      // On React Native, we need to handle file:// URIs specially
      if (Platform.OS !== 'web' && file.uri.startsWith('file://')) {
        // For React Native, FormData accepts objects with uri, type, name
        formData.append('files', fileToUpload);
      } else {
        // For web or other platforms
        formData.append('files', fileToUpload as any);
      }

      // Make upload request with progress tracking
      const response = await baseInstance.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: any) => {
          const progress = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
          if (options.onProgress) {
            options.onProgress(progress);
          }
        },
      });

      if (!response.status || response.status < 200 || response.status >= 300) {
        const errorText = response.data?.message || 'Unknown error';
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = response.data;
      console.log('Upload response:', result);

      // Handle successful response
      if (result.success && result.data) {
        let uploadedFile;
        
        // Handle single file response
        if (!Array.isArray(result.data)) {
          uploadedFile = result.data;
        }
        // Handle multiple files (take first one)
        else if (result.data.length > 0) {
          uploadedFile = result.data[0];
        }

        if (uploadedFile) {
          return {
            name: uploadedFile.name,
            type: uploadedFile.type,
            size: uploadedFile.size,
            url: uploadedFile.url,
            storage: 'url',
            _id: uploadedFile._id,
          };
        }
      }

      throw new Error('Invalid upload response format');
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Upload multiple files to the backend
   */
  const uploadFiles = async (
    files: MediaResult[],
    options: UploadOptions
  ): Promise<UploadedFile[]> => {
    if (!baseInstance) {
      throw new Error("baseInstance is required for file upload");
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const uploadUrl = `uploads`;
      
      console.log('Uploading multiple files to:', uploadUrl);
      console.log('Files count:', files.length);

      // Create FormData
      const formData = new FormData();
      
      // Add form metadata
      if (options.formId) {
        formData.append('formId', options.formId);
      }
      formData.append('fieldName', options.fieldName);
      
      // Add all files
      files.forEach((file, index) => {
        const fileToUpload: any = {
          uri: file.uri,
          type: file.type || file.mimeType || 'application/octet-stream',
          name: file.name,
        };

        formData.append('files', fileToUpload as any);
      });

      // Make upload request with progress tracking
      const response = await baseInstance.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: any) => {
          const progress = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
          if (options.onProgress) {
            options.onProgress(progress);
          }
        },
      });

      if (!response.status || response.status < 200 || response.status >= 300) {
        const errorText = response.data?.message || 'Unknown error';
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = response.data;
      console.log('Upload response:', result);

      // Handle successful response
      if (result.success && result.data) {
        const uploadedFiles = Array.isArray(result.data) ? result.data : [result.data];
        
        return uploadedFiles.map((file: any) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          url: file.url,
          storage: 'url',
          _id: file._id,
        }));
      }

      throw new Error('Invalid upload response format');
    } catch (error) {
      console.error("Error uploading files:", error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const pickImage = async (options?: {
    allowsMultipleSelection?: boolean;
    quality?: number;
  }): Promise<MediaResult[] | null> => {
    try {
      const hasAccess = await requestMediaLibraryPermission();
      if (!hasAccess) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: options?.allowsMultipleSelection || false,
        quality: options?.quality ?? 0.8,
        allowsEditing: false,
      });

      if (result.canceled) return null;

      const assets = result.assets || [];
      const mapped = await Promise.all(assets.map((a) => normalizeAsset(a, "image")));
      return mapped;
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", `Failed to pick image: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  };

  const pickVideo = async (): Promise<MediaResult | null> => {
    try {
      const hasAccess = await requestMediaLibraryPermission();
      if (!hasAccess) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return null;

      const asset = result.assets?.[0];
      if (!asset) return null;
      const normalized = await normalizeAsset(asset, "video");
      return normalized;
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert("Error", `Failed to pick video: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  };

  const pickMedia = async (options?: {
    allowsMultipleSelection?: boolean;
  }): Promise<MediaResult[] | null> => {
    try {
      const hasAccess = await requestMediaLibraryPermission();
      if (!hasAccess) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: options?.allowsMultipleSelection || false,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return null;

      const assets = result.assets || [];
      const mapped = await Promise.all(assets.map((a) => normalizeAsset(a, "media")));
      return mapped;
    } catch (error) {
      console.error("Error picking media:", error);
      Alert.alert("Error", `Failed to pick media: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  };

  const takePhoto = async (): Promise<MediaResult | null> => {
    try {
      const hasAccess = await requestCameraPermission();
      if (!hasAccess) return null;

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return null;

      const asset = result.assets?.[0];
      if (!asset) return null;
      const normalized = await normalizeAsset(asset, "photo");
      return normalized;
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", `Failed to take photo: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  };

  const pickDocument = async (options?: {
    allowMultiple?: boolean;
    type?: string | string[];
  }): Promise<MediaResult[] | null> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: options?.type || "*/*",
        multiple: options?.allowMultiple || false,
        copyToCacheDirectory: true,
      });

      if ((result as any).canceled) return null;
      const assets = (result as any).assets || (Array.isArray(result) ? result : result ? [result] : []);
      if (!assets || assets.length === 0) return null;

      const mapped = await Promise.all(
        assets.map(async (asset: any) => {
          const uri = asset.uri || asset.file || asset.uriString;
          const mime = asset.mimeType || asset.type || "application/octet-stream";
          const name = asset.name || generateFallbackName(mime, "document");
          const size = asset.size || asset.fileSize || undefined;
          const fixedUri = await ensureFileUriUsable(uri);
          return {
            uri: fixedUri,
            type: mime,
            mimeType: mime,
            name,
            size,
          } as MediaResult;
        })
      );

      return mapped;
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", `Failed to pick document: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  };

  const getAlbums = async () => {
    try {
      const hasAccess = await requestMediaLibraryPermission();
      if (!hasAccess) return [];
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") return [];
      const albums = await MediaLibrary.getAlbumsAsync();
      return albums;
    } catch (error) {
      console.error("Error getting albums:", error);
      Alert.alert("Error", `Failed to get albums: ${error instanceof Error ? error.message : "Unknown error"}`);
      return [];
    }
  };

  return {
    hasPermission,
    isUploading,
    uploadProgress,
    requestMediaLibraryPermission,
    requestCameraPermission,
    pickImage,
    pickVideo,
    pickMedia,
    takePhoto,
    pickDocument,
    getAlbums,
    uploadFile,
    uploadFiles,
  };
};

export default useMediaPicker;


