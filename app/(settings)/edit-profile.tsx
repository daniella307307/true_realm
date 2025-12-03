import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { TabBarIcon } from '~/components/ui/tabbar-icon';
import { COLORS } from '~/constants/colors';
import { useAuth } from '~/lib/hooks/useAuth';
import * as ImagePicker from 'expo-image-picker';

interface LocalUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  user_code: string;
  date_enrollment: string;
  incentives: string | null;
  village: number | null;
  picture?: string | null;
}

const EditProfileScreen = () => {
  const router = useRouter();
  const { user: authUser } = useAuth({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<LocalUser | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  useEffect(() => {
    const loadUserData = () => {
      try {
        if (authUser) {
          const userData = authUser as unknown as LocalUser;
          setUser(userData);
          setFirstName(userData.firstName || '');
          setLastName(userData.lastName || '');
          setEmail(userData.email || '');
          setPhone(userData.telephone || '');
          setProfileImage(userData.picture || null);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [authUser]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required.');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Email is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setSaving(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedUser = {
        ...user,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        telephone: phone.trim(),
        picture: profileImage,
      };
      
      setUser(updatedUser as LocalUser);
      
      Alert.alert('Success', 'Profile updated successfully!', [{ text: 'OK', onPress: () => router.back() }]);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const removeImage = () => {
    Alert.alert('Remove Photo', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', onPress: () => setProfileImage(null) }
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ backgroundColor: COLORS.background.light }} className="flex-1">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary.blue[500]} />
          <Text style={{ color: COLORS.text.secondary }} className="mt-4">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor: COLORS.background.light }} className="flex-1">
      <View style={{ backgroundColor: COLORS.neutral.white }} className="px-4 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <TabBarIcon name="arrow-left" family="MaterialCommunityIcons" color={COLORS.text.primary} size={24} />
          </TouchableOpacity>
          
          <Text style={{ color: COLORS.text.primary }} className="text-lg font-semibold">Edit Profile</Text>
          
          <TouchableOpacity onPress={handleSave} disabled={saving} className="p-2">
            {saving ? <ActivityIndicator size="small" color={COLORS.primary.blue[500]} /> : <Text style={{ color: COLORS.primary.blue[500] }} className="font-semibold">Save</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 p-4">
        <View className="items-center mb-8">
          <View className="relative">
            <View style={{ borderWidth: 4, borderColor: COLORS.primary.blue[500] }} className="w-32 h-32 rounded-full overflow-hidden">
              {profileImage ? (
                <Image source={{ uri: profileImage }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View style={{ backgroundColor: COLORS.primary.blue[500] }} className="w-full h-full flex items-center justify-center">
                  <Text className="text-4xl font-bold text-white">{firstName?.charAt(0) || 'U'}</Text>
                </View>
              )}
            </View>
            
            <TouchableOpacity onPress={() => {
              Alert.alert('Change Photo', 'Choose an option', [
                { text: 'Take Photo', onPress: takePhoto },
                { text: 'Choose from Gallery', onPress: pickImage },
                { text: 'Remove Photo', onPress: removeImage },
                { text: 'Cancel', style: 'cancel' }
              ]);
            }} style={{ backgroundColor: COLORS.primary.blue[500] }} className="absolute bottom-0 right-0 w-12 h-12 rounded-full items-center justify-center shadow-lg">
              <TabBarIcon name="camera" family="MaterialCommunityIcons" color={COLORS.neutral.white} size={20} />
            </TouchableOpacity>
          </View>
          
          <Text style={{ color: COLORS.text.secondary }} className="mt-4 text-center">Tap camera icon to change photo</Text>
        </View>

        <View className="mb-6">
          <Text style={{ color: COLORS.text.primary }} className="text-lg font-bold mb-4">Personal Information</Text>
          
          <View style={{ backgroundColor: COLORS.neutral.white, borderRadius: 16, shadowColor: COLORS.neutral.gray[800], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 }} className="overflow-hidden">
            <View className="px-5 py-4">
              <Text style={{ color: COLORS.text.secondary }} className="text-sm font-medium mb-2">First Name</Text>
              <TextInput value={firstName} onChangeText={setFirstName} placeholder="Enter first name" style={{ color: COLORS.text.primary }} className="text-base py-2" placeholderTextColor={COLORS.text.tertiary} autoCapitalize="words" />
            </View>
            
            <View style={{ backgroundColor: COLORS.neutral.gray[100] }} className="h-px mx-5" />
            
            <View className="px-5 py-4">
              <Text style={{ color: COLORS.text.secondary }} className="text-sm font-medium mb-2">Last Name</Text>
              <TextInput value={lastName} onChangeText={setLastName} placeholder="Enter last name" style={{ color: COLORS.text.primary }} className="text-base py-2" placeholderTextColor={COLORS.text.tertiary} autoCapitalize="words" />
            </View>
            
            <View style={{ backgroundColor: COLORS.neutral.gray[100] }} className="h-px mx-5" />
            
            <View className="px-5 py-4">
              <Text style={{ color: COLORS.text.secondary }} className="text-sm font-medium mb-2">Email Address</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="Enter email" style={{ color: COLORS.text.primary }} className="text-base py-2" placeholderTextColor={COLORS.text.tertiary} keyboardType="email-address" autoCapitalize="none" />
            </View>
            
            <View style={{ backgroundColor: COLORS.neutral.gray[100] }} className="h-px mx-5" />
            
            <View className="px-5 py-4">
              <Text style={{ color: COLORS.text.secondary }} className="text-sm font-medium mb-2">Phone Number</Text>
              <TextInput value={phone} onChangeText={setPhone} placeholder="Enter phone" style={{ color: COLORS.text.primary }} className="text-base py-2" placeholderTextColor={COLORS.text.tertiary} keyboardType="phone-pad" />
              <Text style={{ color: COLORS.text.tertiary }} className="text-xs mt-1">Optional</Text>
            </View>
          </View>
        </View>

        {user?.user_code && (
          <View className="mb-6">
            <Text style={{ color: COLORS.text.primary }} className="text-lg font-bold mb-4">Account Information</Text>
            
            <View style={{ backgroundColor: COLORS.primary.blue[50], borderWidth: 1, borderColor: COLORS.primary.blue[100], borderRadius: 16 }} className="p-5">
              <Text style={{ color: COLORS.text.secondary }} className="text-sm font-medium mb-2">User ID</Text>
              <Text style={{ color: COLORS.primary.blue[700] }} className="font-semibold text-lg">{user.user_code}</Text>
              <Text style={{ color: COLORS.text.tertiary }} className="text-sm mt-1">Unique identifier</Text>
            </View>
          </View>
        )}

        {user?.date_enrollment && (
          <View className="mb-6">
            <View style={{ backgroundColor: COLORS.primary.orange[50], borderWidth: 1, borderColor: COLORS.primary.orange[100], borderRadius: 16 }} className="p-5">
              <Text style={{ color: COLORS.text.secondary }} className="text-sm font-medium mb-2">Membership Date</Text>
              <Text style={{ color: COLORS.primary.orange[700] }} className="font-semibold text-lg">
                {new Date(user.date_enrollment).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
              <Text style={{ color: COLORS.text.tertiary }} className="text-sm mt-1">Thank you for being a valued member</Text>
            </View>
          </View>
        )}

        <View className="mb-8 space-y-4">
          <TouchableOpacity onPress={handleSave} disabled={saving} style={{ backgroundColor: COLORS.primary.blue[500], opacity: saving ? 0.7 : 1 }} className="py-4 rounded-xl items-center m-2">
            {saving ? <ActivityIndicator color={COLORS.neutral.white} /> : <Text className="text-white font-semibold text-base">Save Changes</Text>}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: COLORS.neutral.white, borderWidth: 1, borderColor: COLORS.neutral.gray[300] }} className="py-4 rounded-xl items-center m-2">
            <Text style={{ color: COLORS.text.primary }} className="font-semibold text-base">Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditProfileScreen;