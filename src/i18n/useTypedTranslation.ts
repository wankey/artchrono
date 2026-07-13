// src/i18n/useTypedTranslation.ts
import { useTranslation as useTranslationOriginal } from "react-i18next";
import type { TFunction } from "i18next";

export function useT() {
  const { t, i18n } = useTranslationOriginal();
  return { t: t as TFunction, i18n };
}
