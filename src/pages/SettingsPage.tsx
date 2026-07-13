// src/pages/SettingsPage.tsx
import { useT } from "@/i18n/useTypedTranslation";

const SUPPORTED = ["zh-CN", "en"] as const;

export default function SettingsPage() {
  const { t, i18n } = useT();

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">{t("settings.title")}</h1>
      <section>
        <h2 className="text-lg font-medium">{t("settings.language.label")}</h2>
        <p className="text-sm text-gray-500 mb-3">
          {t("settings.language.description")}
        </p>
        <div className="flex gap-2">
          {SUPPORTED.map((lng) => (
            <button
              key={lng}
              onClick={() => i18n.changeLanguage(lng)}
              className={
                i18n.language === lng
                  ? "px-4 py-2 bg-teal-600 text-white rounded"
                  : "px-4 py-2 bg-gray-100 rounded"
              }
            >
              {t(`settings.language.${lng}`)}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
