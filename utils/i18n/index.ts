import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import enTranslation from "~/lib/locales/en.json";
import kinTranslation from "~/lib/locales/rw.json";

const resources = {
  "en-US": { translation: enTranslation },
  "rw-RW": { translation: kinTranslation },
};

const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem("language");

  if (!savedLanguage) {
    savedLanguage = "rw-RW";
    await AsyncStorage.setItem("language", savedLanguage);
  }
  // console.log("The savedLanguage: ", savedLanguage);

  i18n.use(initReactI18next).init({
    compatibilityJSON: "v4",
    resources,
    lng: savedLanguage,
    fallbackLng: "rw-RW",
    interpolation: {
      escapeValue: false,
    },
  });
};

initI18n();

export default i18n;