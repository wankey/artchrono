// src/i18n/config.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import zhCN from "../../public/locales/zh-CN/translation.json";
import en from "../../public/locales/en/translation.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "zh-CN": { translation: zhCN },
      "en": { translation: en }
    },
    fallbackLng: "zh-CN",
    supportedLngs: ["zh-CN", "en"],
    detection: {
      order: ["navigator"],
      caches: []
    },
    interpolation: {
      prefix: "{",
      suffix: "}",
      escapeValue: false
    }
  });

export default i18n;
