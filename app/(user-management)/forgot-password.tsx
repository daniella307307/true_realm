import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useForm, FieldValues, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Logo from "~/components/Logo";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import CustomInput from "~/components/ui/input";
import { router } from "expo-router";
import HeaderNavigation from "~/components/ui/header";
import Toast from "react-native-toast-message";
import { AxiosError } from "axios";
import { IResponseError } from "~/types";
import { requestPasswordReset } from "~/services/user";
import { useMutation } from "@tanstack/react-query";
import { useVideoPlayer, VideoView } from "expo-video";

const VideoPlayer = () => {
  const videoUrl =
    "https://continuous.sugiramuryango.org.rw/public/videos/1733815813_Language%20Development.mp4";
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [player, setPlayer] = useState<ReturnType<
    typeof useVideoPlayer
  > | null>(null);

  const videoPlayer = useVideoPlayer(videoUrl, (playerInstance) => {
    playerInstance.loop = true;
  });

  React.useEffect(() => {
    if (videoPlayer) {
      setPlayer(videoPlayer);
      setIsLoading(false);
    }
  }, [videoPlayer]);

  const togglePlayPause = () => {
    if (isPlaying) {
      player?.pause();
    } else {
      player?.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <View className="w-full h-40 bg-gray-200 rounded-lg items-center justify-center mb-6 overflow-hidden">
      {isLoading && (
        <View className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <Text className="text-gray-600">Loading video...</Text>
        </View>
      )}
      {player && (
        <VideoView
          player={player}
          className="w-full h-full"
          allowsFullscreen
          allowsPictureInPicture
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#000",
          }}
        />
      )}
      <TouchableOpacity
        onPress={togglePlayPause}
        className="absolute top-4 right-4 bg-white/80 px-4 py-2 rounded-full z-20"
      >
        <Text className="font-semibold">{isPlaying ? "Pause" : "Play"}</Text>
      </TouchableOpacity>
    </View>
  );
};

const schema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .nonempty("Email is required"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotScreen() {
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });
  const [isLoading, setIsLoading] = useState(false);

  const resetPasswordMutation = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: (data, variables) => {
      Toast.show({
        type: "success",
        text1: t("Success"),
        text2: t("ForgotPassword.successMessage", "Password reset email sent"),
      });
      router.push({
        pathname: "/password-verification-sent",
        params: { email: variables },
      });
    },
    onError: (error: AxiosError<IResponseError>) => {
      Toast.show({
        type: "error",
        text1: t("Error"),
        text2:
          error.response?.data?.message || t("ForgotPassword.genericError"),
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await resetPasswordMutation.mutateAsync(data.email);
    } catch (error) {
      console.error("Forgot Password Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={false}
        title={t("Login.forgotPassword")}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-between items-center flex-col px-8">
            <View className="w-full flex-col items-center justify-start gap-y-8">
              <Logo />
              <VideoPlayer />
              <View>
                <Text className="mb-2 text-base text-center font-semibold text-[#050F2B]">
                  {t("ForgotPassword.title")}
                </Text>
                <Text className="text-[#6E7191] text-xs text-center">
                  {t("ForgotPassword.description")}
                </Text>
              </View>

              <View className="w-full">
                <View className="mb-4">
                  <Text className="mb-2 text-xs font-medium text-[#050F2B]">
                    {t("ForgotPassword.email")}
                  </Text>
                  <CustomInput
                    control={control}
                    name="email"
                    placeholder={t("ForgotPassword.emailPlaceholder")}
                    keyboardType="email-address"
                    accessibilityLabel={t("ForgotPassword.email")}
                  />
                </View>

                <View>
                  <Button
                    variant="default"
                    size="default"
                    onPress={handleSubmit(onSubmit)}
                    isLoading={isLoading}
                    disabled={!isValid || isLoading}
                  >
                    <Text className="text-white font-semibold">
                      {t("ForgotPassword.send")}
                    </Text>
                  </Button>
                </View>
              </View>
            </View>
            <TouchableOpacity className="pb-20">
              <View className="text-center flex-row justify-center items-center">
                <View className="w-1/2">
                  <Text className="text-gray-500 whitespace-nowrap line-clamp-1">
                    {t("ForgotPassword.rememberPassword")}
                  </Text>
                </View>
                <Pressable onPress={() => router.push("/login")}>
                  <Text className="text-primary font-semibold ml-1">
                    {t("ForgotPassword.backToLogin")}
                  </Text>
                </Pressable>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
