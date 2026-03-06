'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, PropsWithChildren } from 'react';
import enTranslations from '../locales/en.json';
import esTranslations from '../locales/es.json';
import hiTranslations from '../locales/hi.json';

type Language = 'en' | 'es' | 'hi';

interface LocaleContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
  translations: Record<string, any>;
  setTranslations: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const translationsData = {
    en: enTranslations,
    es: esTranslations,
    hi: hiTranslations,
};

const getNestedTranslation = (translations: Record<string, any>, key: string): any => {
  return key.split('.').reduce((obj, k) => (obj ? obj[k] : undefined), translations);
};

export const LocaleProvider = ({ children }: PropsWithChildren) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<Record<string, any>>(translationsData.en);

  useEffect(() => {
    setTranslations(translationsData[language] || translationsData.en);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };
  
  const t = useCallback((key: string, options?: { [key: string]: string | number }): string => {
    let translation = getNestedTranslation(translations, key);

    if (translation === undefined || (typeof translation === 'object' && translation !== null)) {
      console.warn(`Translation key not found or is a namespace: ${key}`);
      return key;
    }
    
    let result = String(translation);

    if (options) {
      Object.keys(options).forEach(optionKey => {
        const regex = new RegExp(`{{${optionKey}}}`, 'g');
        result = result.replace(regex, String(options[optionKey]));
      });
    }

    return result;
  }, [translations]);

  return (
    <LocaleContext.Provider value={{ language, setLanguage, t, translations, setTranslations }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = (): LocaleContextType => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
