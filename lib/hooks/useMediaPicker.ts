import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Platform, Linking } from 'react-native';

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

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

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
            { text: 'Open Settings', onPress: openSettings }
          ]
        );
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting media library permission:', error);
      Alert.alert('Error', 'Failed to request media library permission');
      return false;
    }
  };

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
            { text: 'Open Settings', onPress: openSettings }
          ]
        );
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert('Error', 'Failed to request camera permission');
      return false;
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
      Alert.alert('Error', `Failed to pick image: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      Alert.alert('Error', `Failed to pick video: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      Alert.alert('Error', `Failed to pick media: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      Alert.alert('Error', `Failed to take photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

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

      if (result.canceled || !result.assets) return null;

      return result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.mimeType || 'application/octet-stream',
        name: asset.name || `document_${Date.now()}`,
        size: asset.size,
        mimeType: asset.mimeType || 'application/octet-stream',
      }));
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', `Failed to pick document: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  const getAlbums = async () => {
    try {
      const hasAccess = await requestMediaLibraryPermission();
      if (!hasAccess) return [];

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return [];

      const albums = await MediaLibrary.getAlbumsAsync();
      return albums;
    } catch (error) {
      console.error('Error getting albums:', error);
      Alert.alert('Error', `Failed to get albums: ${error instanceof Error ? error.message : 'Unknown error'}`);
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