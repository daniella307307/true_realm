export function translateFormSchema(formSchema: any, translations: any, lang: string): any {
  if (!formSchema || !translations) return formSchema;

  const translated = { ...formSchema };

  // Title
  if (translations.title?.[lang]) {
    translated.title = translations.title[lang];
  }

  // Wizard pages
  if (translated.display === "wizard") {
    translated.components = translated.components.map((page: any, i: number) => {
      const pageT = translations.pages?.[i] || {};
      const newPage = { ...page };

      // Translate page title
      if (pageT.title?.[lang]) {
        newPage.title = newPage.label = pageT.title[lang];
      }

      // Translate page components
      newPage.components = page.components.map((cmp: any) => {
        const cmpT = pageT.components?.find((t: any) => t.key === cmp.key) || {};
        return translateFormComponent(cmp, cmpT, lang);
      });

      return newPage;
    });

    return translated;
  }

  // Non-wizard form
  translated.components = translated.components.map((cmp: any) => {
    const cmpT = translations.components?.find((t: any) => t.key === cmp.key) || {};
    return translateFormComponent(cmp, cmpT, lang);
  });

  return translated;
}

function translateFormComponent(component: any, translations: any, currentLang: string): any {
  if (!component) return component;

  // Always ensure translations object is defined
  translations = translations || {};

  const translatedComponent = { ...component };

  const safe = (obj: any, key: string) =>
    obj && obj[key] && obj[key][currentLang] ? obj[key][currentLang] : undefined;

  // Basic fields
  if (safe(translations, "label")) translatedComponent.label = safe(translations, "label");
  if (safe(translations, "placeholder")) translatedComponent.placeholder = safe(translations, "placeholder");
  if (safe(translations, "description")) translatedComponent.description = safe(translations, "description");
  if (safe(translations, "tooltip")) translatedComponent.tooltip = safe(translations, "tooltip");

  // Validation message
  if (component.validate && translations.errorLabel && translations.errorLabel[currentLang]) {
    translatedComponent.validate = {
      ...component.validate,
      customMessage: translations.errorLabel[currentLang]
    };
  }

  // Select / radio / checkbox values
  if (component.values && Array.isArray(component.values)) {
    translatedComponent.values = component.values.map((val: any, i: number) => {
      const t = translations.values?.[i]?.[currentLang];
      return { ...val, label: t || val.label };
    });
  }

  // Data.values (select)
  if (component.data?.values && Array.isArray(component.data.values)) {
    translatedComponent.data = {
      ...component.data,
      values: component.data.values.map((v: any, i: number) => {
        const t = translations.data?.values?.[i]?.[currentLang];
        return { ...v, label: t || v.label };
      })
    };
  }

  // HTML content
  if (component.type === "htmlelement" && safe(translations, "content")) {
    translatedComponent.content = safe(translations, "content");
  }

  // Buttons
  if (component.type === "button" && safe(translations, "label")) {
    translatedComponent.label = safe(translations, "label");
  }

  // Nested components
  if (Array.isArray(component.components)) {
    translatedComponent.components = component.components.map((child: any) => {
      const childT = translations.components?.find((t: any) => t.key === child.key) || {};
      return translateFormComponent(child, childT, currentLang);
    });
  }

  // Columns
  if (Array.isArray(component.columns)) {
    translatedComponent.columns = component.columns.map((col: any, i: number) => ({
      ...col,
      components: col.components?.map((child: any) => {
        const childT = translations.columns?.[i]?.components?.find((t: any) => t.key === child.key) || {};
        return translateFormComponent(child, childT, currentLang);
      })
    }));
  }

  return translatedComponent;
}
