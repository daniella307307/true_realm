
export function translateFormSchema(formSchema: any, translations: any, lang: string): any {
  if (!formSchema || !translations) return formSchema;

  const translated = { ...formSchema };

  // Normalize language code (convert "rw-RW" to "rw", "en-US" to "en", etc.)
  const normalizedLang = lang.split('-')[0].toLowerCase();
  
  console.log('Translating with language:', lang, '-> normalized:', normalizedLang);

  // Title
  if (translations.title?.[normalizedLang]) {
    translated.title = translations.title[normalizedLang];
    console.log('Translated title:', translated.title);
  }

  // Description
  if (translations.description?.[normalizedLang]) {
    translated.description = translations.description[normalizedLang];
    console.log('Translated description:', translated.description);
  }

  // Wizard pages
  if (translated.display === "wizard") {
    translated.components = translated.components.map((page: any, i: number) => {
      const pageT = translations.pages?.[i] || {};
      const newPage = { ...page };

      // Translate page title
      if (pageT.title?.[normalizedLang]) {
        newPage.title = newPage.label = pageT.title[normalizedLang];
      }

      // Translate page components
      newPage.components = page.components.map((cmp: any) => {
        // Use the component key to find translations
        const cmpT = translations.components?.[cmp.key] || {};
        return translateFormComponent(cmp, cmpT, normalizedLang);
      });

      return newPage;
    });

    return translated;
  }

  // Non-wizard form
  translated.components = translated.components.map((cmp: any) => {
    // Use the component key to find translations
    const cmpT = translations.components?.[cmp.key] || {};
    console.log('Translating component:', cmp.key, 'with translations:', cmpT);
    return translateFormComponent(cmp, cmpT, normalizedLang);
  });

  return translated;
}

// Default button translations
const DEFAULT_BUTTON_TRANSLATIONS: { [key: string]: { [key: string]: string } } = {
  en: {
    submit: 'Submit',
    next: 'Next',
    previous: 'Previous',
    cancel: 'Cancel',
    save: 'Save',
    reset: 'Reset',
  },
  rw: {
    submit: 'Ohereza',
    next: 'Ibikurikira',
    previous: 'Ibanziriza',
    cancel: 'Hagarika',
    save: 'Bika',
    reset: 'Subira',
  },
  fr: {
    submit: 'Soumettre',
    next: 'Suivant',
    previous: 'Précédent',
    cancel: 'Annuler',
    save: 'Enregistrer',
    reset: 'Réinitialiser',
  }
};

function getDefaultButtonLabel(component: any, lang: string): string | null {
  const normalizedLang = lang.split('-')[0].toLowerCase();
  
  // Try to get default translation for this language
  const langDefaults = DEFAULT_BUTTON_TRANSLATIONS[normalizedLang];
  if (!langDefaults) return null;
  
  // Check button action
  if (component.action && langDefaults[component.action]) {
    return langDefaults[component.action];
  }
  
  // Check button key
  if (component.key) {
    const keyLower = component.key.toLowerCase();
    if (langDefaults[keyLower]) {
      return langDefaults[keyLower];
    }
    
    // Check if key contains action words
    for (const [action, label] of Object.entries(langDefaults)) {
      if (keyLower.includes(action)) {
        return label;
      }
    }
  }
  
  // Default to submit if nothing else matches
  return langDefaults.submit;
}

function translateFormComponent(component: any, translations: any, currentLang: string): any {
  if (!component) return component;

  // Always ensure translations object is defined
  translations = translations || {};

  const translatedComponent = { ...component };

  // Normalize language code
  const normalizedLang = currentLang.split('-')[0].toLowerCase();

  const safe = (obj: any, key: string) =>
    obj && obj[key] && obj[key][normalizedLang] ? obj[key][normalizedLang] : undefined;

  // Basic fields
  const translatedLabel = safe(translations, "label");
  const translatedPlaceholder = safe(translations, "placeholder");
  const translatedDescription = safe(translations, "description");
  const translatedTooltip = safe(translations, "tooltip");

  if (translatedLabel && translatedLabel.trim() !== '') {
    translatedComponent.label = translatedLabel;
    console.log('Translated label for', component.key, ':', translatedLabel);
  }
  if (translatedPlaceholder) translatedComponent.placeholder = translatedPlaceholder;
  if (translatedDescription) translatedComponent.description = translatedDescription;
  if (translatedTooltip) translatedComponent.tooltip = translatedTooltip;

  // Validation message
  if (component.validate && translations.errorLabel && translations.errorLabel[normalizedLang]) {
    translatedComponent.validate = {
      ...component.validate,
      customMessage: translations.errorLabel[normalizedLang]
    };
  }

  // Select / radio / checkbox values
  if (component.values && Array.isArray(component.values)) {
    translatedComponent.values = component.values.map((val: any, i: number) => {
      const t = translations.values?.[i]?.[normalizedLang];
      return { ...val, label: t || val.label };
    });
  }

  // Data.values (select)
  if (component.data?.values && Array.isArray(component.data.values)) {
    translatedComponent.data = {
      ...component.data,
      values: component.data.values.map((v: any, i: number) => {
        const t = translations.data?.values?.[i]?.[normalizedLang];
        return { ...v, label: t || v.label };
      })
    };
  }

  // HTML content
  if (component.type === "htmlelement" && safe(translations, "content")) {
    translatedComponent.content = safe(translations, "content");
  }

  // Buttons - Enhanced translation logic
  if (component.type === "button") {
    // Check if we have a translation and it's not empty
    if (translatedLabel && translatedLabel.trim() !== '') {
      translatedComponent.label = translatedLabel;
      console.log('Applied custom button translation for', component.key, ':', translatedLabel);
    } else {
      // Use default translation
      const defaultLabel = getDefaultButtonLabel(component, currentLang);
      if (defaultLabel) {
        translatedComponent.label = defaultLabel;
        console.log('Applied default button translation for', component.key, ':', defaultLabel);
      }
    }
  }

  // Nested components (containers, fieldsets, etc.)
  if (Array.isArray(component.components)) {
    translatedComponent.components = component.components.map((child: any) => {
      const childT = translations.components?.[child.key] || {};
      return translateFormComponent(child, childT, currentLang);
    });
  }

  // Columns
  if (Array.isArray(component.columns)) {
    translatedComponent.columns = component.columns.map((col: any, i: number) => ({
      ...col,
      components: col.components?.map((child: any) => {
        const childT = translations.columns?.[i]?.components?.[child.key] || {};
        return translateFormComponent(child, childT, currentLang);
      })
    }));
  }

  return translatedComponent;
}

// Helper function to parse translations if they come as a string
export function parseTranslations(translationsData: any): any {
  // If it's already an object, return it
  if (typeof translationsData === 'object' && translationsData !== null) {
    return translationsData;
  }
  
  if (typeof translationsData === 'string') {
    // Try standard JSON parse first
    try {
      return JSON.parse(translationsData);
    } catch (e) {
      // If that fails, parse MongoDB/Java toString format
      try {
        return parseMongoDBFormat(translationsData);
      } catch (e2) {
        console.error('Error parsing translations (both methods failed):', e2);
        return null;
      }
    }
  }
  
  return null;
}

// Parse MongoDB/Java toString format: {key=value, key2={nested=value}}
function parseMongoDBFormat(str: string): any {
  let index = 0;
  
  function skipWhitespace() {
    while (index < str.length && /\s/.test(str[index])) {
      index++;
    }
  }
  
  function parseValue(): any {
    skipWhitespace();
    
    if (str[index] === '{') {
      return parseObject();
    } else if (str[index] === '[') {
      return parseArray();
    } else {
      return parseString();
    }
  }
  
  function parseObject(): any {
    const obj: any = {};
    index++; // skip '{'
    skipWhitespace();
    
    while (index < str.length && str[index] !== '}') {
      skipWhitespace();
      
      // Parse key
      const key = parseKey();
      skipWhitespace();
      
      // Skip '='
      if (str[index] === '=') {
        index++;
      }
      
      // Parse value
      const value = parseValue();
      obj[key] = value;
      
      skipWhitespace();
      
      // Skip comma if present
      if (str[index] === ',') {
        index++;
      }
    }
    
    index++; // skip '}'
    return obj;
  }
  
  function parseArray(): any {
    const arr: any[] = [];
    index++; // skip '['
    skipWhitespace();
    
    while (index < str.length && str[index] !== ']') {
      arr.push(parseValue());
      skipWhitespace();
      
      if (str[index] === ',') {
        index++;
      }
    }
    
    index++; // skip ']'
    return arr;
  }
  
  function parseKey(): string {
    let key = '';
    while (index < str.length && str[index] !== '=' && str[index] !== ',' && str[index] !== '}') {
      key += str[index];
      index++;
    }
    return key.trim();
  }
  
  function parseString(): string {
    let value = '';
    let inString = false;
    
    while (index < str.length) {
      const char = str[index];
      
      // Handle the end of value
      if (!inString && (char === ',' || char === '}' || char === ']')) {
        break;
      }
      
      // Check for nested object or array
      if (!inString && (char === '{' || char === '[')) {
        break;
      }
      
      value += char;
      index++;
    }
    
    return value.trim();
  }
  
  return parseValue();
}