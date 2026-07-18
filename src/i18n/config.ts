// src/i18n/config.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

// 注：曾用 i18next-browser-languagedetector 检测 navigator 语言；
// 在 CI / Playwright 环境下 navigator 默认 "en"，会把整站切到英文，
// 而 fallbackLng 不会生效（"en" 在 supportedLngs 内）。
// 产品定位是中文优先（"艺时纪"），此处显式锁定默认语言为 zh-CN。
// 用户仍可通过 SettingsPage 调用 i18n.changeLanguage() 切换。

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    fallbackLng: "zh-CN",
    supportedLngs: ["zh-CN"],
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json"
    },
    interpolation: {
      prefix: "{",
      suffix: "}",
      escapeValue: false
    }
  });

export default i18n;
