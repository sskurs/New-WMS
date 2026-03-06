'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import Card, { CardContent, CardHeader, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import { Languages } from 'lucide-react';

// A recursive component to render nested JSON object for editing
const TranslationEditor = ({ data, path, onUpdate }: { data: any, path: string, onUpdate: (key: string, value: string) => void }) => {
    return (
        <div className="space-y-2">
            {Object.keys(data).map(key => {
                const currentPath = path ? `${path}.${key}` : key;
                if (typeof data[key] === 'object' && data[key] !== null) {
                    return (
                        <div key={currentPath} className="pl-4 border-l-2">
                            <p className="font-semibold text-sm text-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                            <div className="mt-2">
                                <TranslationEditor data={data[key]} path={currentPath} onUpdate={onUpdate} />
                            </div>
                        </div>
                    );
                }
                return (
                    <div key={currentPath} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <label htmlFor={currentPath} className="text-sm text-muted-foreground truncate" title={currentPath}>
                            {key.replace(/([A-Z])/g, ' $1')}
                        </label>
                        <Input
                            id={currentPath}
                            value={data[key]}
                            onChange={(e) => onUpdate(currentPath, e.target.value)}
                        />
                    </div>
                );
            })}
        </div>
    );
};

const LocalizationPage = () => {
    const { language, setLanguage, t, translations, setTranslations: setGlobalTranslations } = useLocale();
    const { addToast } = useToast();
    const [localTranslations, setLocalTranslations] = useState(translations);

    // Sync local state when global translations change (e.g., on language switch)
    useEffect(() => {
        setLocalTranslations(translations);
    }, [translations]);
    
    const updateNestedValue = (obj: any, path: string, value: string) => {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return { ...obj };
    };

    const handleUpdate = (key: string, value: string) => {
        const updatedTranslations = updateNestedValue(localTranslations, key, value);
        setLocalTranslations(updatedTranslations);
    };

    const handleSaveChanges = () => {
        // In a real app, this would be an API call to save the JSON file.
        // Here, we just update the global context state for the current session.
        setGlobalTranslations(localTranslations);
        addToast({ type: 'success', message: t('localizationPage.changesSaved') });
    };

    const tabClasses = (lang: string) => `px-3 py-2 font-medium text-sm cursor-pointer border-b-2 transition-all duration-200 ease-in-out whitespace-nowrap ${language === lang ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
                    <Languages className="w-8 h-8 text-primary" />
                    {t('localizationPage.title')}
                </h1>
                <p className="mt-2 text-muted-foreground">
                    {t('localizationPage.description')}
                </p>
            </div>
            
            <Card>
                <CardHeader>
                     <div className="border-b border-border">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <button type="button" onClick={() => setLanguage('en')} className={tabClasses('en')}>English</button>
                            <button type="button" onClick={() => setLanguage('es')} className={tabClasses('es')}>Español</button>
                        </nav>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {Object.keys(localTranslations).length > 0 ? (
                        <TranslationEditor data={localTranslations} path="" onUpdate={handleUpdate} />
                    ) : (
                         <div className="text-center py-10 text-muted-foreground">{t('common.loading')}</div>
                    )}
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <div className="relative group">
                        <Button onClick={handleSaveChanges} disabled>
                            {t('localizationPage.saveChanges')}
                        </Button>
                         <div className="absolute bottom-full mb-2 w-max px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            Saving is disabled in this demo.
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
};

export default LocalizationPage;