import i18n from "~/utils/i18n";

/**
 * Gets the localized title from a title object based on the current locale
 */
export const getLocalizedTitle = (
  title: { en: string; kn: string; default: string },
  locale = i18n.language
): string => {
  // Convert locale to the language code used in your title object
  const language = locale.startsWith("rw") ? "kn" : "en";
  return title[language as keyof typeof title] || title.default;
};

/**
 * Formats time in seconds to a MM:SS display
 */
export const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}; 