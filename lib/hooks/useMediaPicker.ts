import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Platform } from 'react-native';

export interface MediaResult {
  uri: string;
  type: string;
  name: string;
  size?: number;
  width?: number;
  height?: number;
  mimeType?: string;
}

export const useMediaPicker = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Request camera roll permissions
  const requestMediaLibraryPermission = async (): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photos in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync() }
          ]
        );
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting media library permission:', error);
      return false;
    }
  };

  // Request camera permissions
  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      const granted = status === 'granted';
      
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your camera in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => ImagePicker.requestCameraPermissionsAsync() }
          ]
        );
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  };

  // Pick image from gallery
  const pickImage = async (options?: {
    allowsMultipleSelection?: boolean;
    quality?: number;
  }): Promise<MediaResult[] | null> => {
    const hasAccess = await requestMediaLibraryPermission();
    if (!hasAccess) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: options?.allowsMultipleSelection || false,
        quality: options?.quality || 0.8,
        allowsEditing: false,
      });

      if (result.canceled) return null;

      return result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `image_${Date.now()}.jpg`,
        size: asset.fileSize,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType || 'image/jpeg',
      }));
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
      return null;
    }
  };

  // Pick video from gallery
  const pickVideo = async (): Promise<MediaResult | null> => {
    const hasAccess = await requestMediaLibraryPermission();
    if (!hasAccess) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return null;

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        type: asset.mimeType || 'video/mp4',
        name: asset.fileName || `video_${Date.now()}.mp4`,
        size: asset.fileSize,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType || 'video/mp4',
      };
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
      return null;
    }
  };

  // Pick any media (image or video)
  const pickMedia = async (options?: {
    allowsMultipleSelection?: boolean;
  }): Promise<MediaResult[] | null> => {
    const hasAccess = await requestMediaLibraryPermission();
    if (!hasAccess) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: options?.allowsMultipleSelection || false,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return null;

      return result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `media_${Date.now()}`,
        size: asset.fileSize,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType,
      }));
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media');
      return null;
    }
  };

  // Take photo with camera
  const takePhoto = async (): Promise<MediaResult | null> => {
    const hasAccess = await requestCameraPermission();
    if (!hasAccess) return null;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return null;

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        size: asset.fileSize,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType || 'image/jpeg',
      };
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
      return null;
    }
  };

  // Pick document
  const pickDocument = async (options?: {
    allowMultiple?: boolean;
    type?: string | string[];
  }): Promise<MediaResult[] | null> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: options?.type || '*/*',
        multiple: options?.allowMultiple || false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return null;

      // Handle both single and multiple file selection
      const assets = result.assets || [result as any];
      
      return assets.map(asset => ({
        uri: asset.uri,
        type: asset.mimeType || 'application/octet-stream',
        name: asset.name || `document_${Date.now()}`,
        size: asset.size,
        mimeType: asset.mimeType || 'application/octet-stream',
      }));
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
      return null;
    }
  };

  // Get albums from media library
  const getAlbums = async () => {
    const hasAccess = await requestMediaLibraryPermission();
    if (!hasAccess) return [];

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return [];

      const albums = await MediaLibrary.getAlbumsAsync();
      return albums;
    } catch (error) {
      console.error('Error getting albums:', error);
      return [];
    }
  };

  return {
    hasPermission,
    requestMediaLibraryPermission,
    requestCameraPermission,
    pickImage,
    pickVideo,
    pickMedia,
    takePhoto,
    pickDocument,
    getAlbums,
  };
};