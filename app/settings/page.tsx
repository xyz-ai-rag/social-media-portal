"use client";

import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import i18n from "@/i18n";

interface LanguageOption {
  code: string;
  name: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  english: "en",
  japanese: "ja",
  korean: "ko",
  chinese: "zh",
  french: "fr",
  german: "de",
  spanish: "es",
  italian: "it",
  portuguese: "pt",
  russian: "ru",
  arabic: "ar",
  hindi: "hi",
};

export default function SettingsPage() {
  const { clientDetails } = useAuth();
  const { t } = useTranslation();
  const [lang, setLang] = useState(i18n.language);
  const [languageOptions, setLanguageOptions] = useState<LanguageOption[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLang = e.target.value;
    i18n.changeLanguage(selectedLang);
    setLang(selectedLang);
  };

  useEffect(() => {
    const rawLanguages: string[] =
      clientDetails?.businesses?.flatMap((biz: any) =>
        Array.isArray(biz.additional_languages)
          ? biz.additional_languages
              .map((lang: string) =>
                lang?.replace(/[{}"]/g, "").trim().toLowerCase()
              )
              .filter(Boolean)
          : []
      ) ?? [];

    const uniqueSet = new Set(rawLanguages);

    const finalLanguages: LanguageOption[] =
      uniqueSet.size > 0
        ? Array.from(uniqueSet).map((name) => ({
            code: LANGUAGE_MAP[name] || name.slice(0, 2),
            name: name.charAt(0).toUpperCase() + name.slice(1),
          }))
        : [{ code: "en", name: "English" }];

    setLanguageOptions(finalLanguages);
  }, [clientDetails]);

  return (
    <div>
      <h1 className="text-[34px] font-bold text-[#5D5FEF]">
        {t("setting.settings")}
      </h1>
      <div className="flex items-center gap-4">
        <h2 className="text-base font-medium text-gray-800">
          {t("setting.language")}
        </h2>
        <select value={lang} onChange={handleChange}>
          {languageOptions.map(({ code, name }) => (
            <option key={code} value={code}>
              {t(`setting.languageType.${name.toLowerCase()}`)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
