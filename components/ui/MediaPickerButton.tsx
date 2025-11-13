import React from 'react';
import { TouchableOpacity, Text, View, Image, Alert } from 'react-native';
import { useMediaPicker } from '~/lib/hooks/useMediaPicker';

export const MediaPickerButton = ({ onMediaSelected }: { 
  onMediaSelected: (media: any[]) => void 
}) => {
  const { pickMedia, pickImage, pickVideo, takePhoto } = useMediaPicker();

  const showMediaOptions = () => {
    Alert.alert(
      'Select Media',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const photo = await takePhoto();
            if (photo) onMediaSelected([photo]);
          },
        },
        {
          text: 'Choose Photo',
          onPress: async () => {
            const images = await pickImage({ allowsMultipleSelection: true });
            if (images) onMediaSelected(images);
          },
        },
        {
          text: 'Choose Video',
          onPress: async () => {
            const video = await pickVideo();
            if (video) onMediaSelected([video]);
          },
        },
        {
          text: 'Choose Any Media',
          onPress: async () => {
            const media = await pickMedia({ allowsMultipleSelection: true });
            if (media) onMediaSelected(media);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <TouchableOpacity
      onPress={showMediaOptions}
      className="bg-blue-500 px-4 py-3 rounded-lg"
    >
      <Text className="text-white font-semibold text-center">
        📷 Select Media
      </Text>
    </TouchableOpacity>
  );
};