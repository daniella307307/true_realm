
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import enTranslation from "~/lib/locales/en.json";
import chTranslation from "~/lib/locales/ch.json";
import spTranslation from "~/lib/locales/sp.json";

const resources = {
  "pt-BR": { translation: spTranslation },
  "en-US": { translation: enTranslation },
  "zh-CN": { translation: chTranslation },
};

const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem("language");

  if (!savedLanguage) {
    savedLanguage = Localization.locale;
  }
  console.log('The savedLanguage: ', savedLanguage);

  i18n.use(initReactI18next).init({
    compatibilityJSON: "v4",
    resources,
    lng: savedLanguage,
    fallbackLng: "pt-BR",
    interpolation: {
      escapeValue: false,
    },
  });
};

initI18n();

export default i18n;