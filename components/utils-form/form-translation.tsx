function translateFormComponent(component: any, translations: any, currentLang: string): any {
  if (!component || !translations) return component;

  const translatedComponent = { ...component };

  // Translate basic text fields
  if (translations.label && translations.label[currentLang]) {
    translatedComponent.label = translations.label[currentLang];
  }
  
  if (translations.placeholder && translations.placeholder[currentLang]) {
    translatedComponent.placeholder = translations.placeholder[currentLang];
  }
  
  if (translations.description && translations.description[currentLang]) {
    translatedComponent.description = translations.description[currentLang];
  }
  
  if (translations.tooltip && translations.tooltip[currentLang]) {
    translatedComponent.tooltip = translations.tooltip[currentLang];
  }

  // Translate validation messages
  if (component.validate && translations.errorLabel) {
    translatedComponent.validate = {
      ...component.validate,
      customMessage: translations.errorLabel[currentLang] || component.validate.customMessage
    };
  }

  // Translate options for select, radio, checkbox components
  if (component.values && Array.isArray(component.values) && translations.values) {
    translatedComponent.values = component.values.map((value: any, index: number) => {
      const valueTranslation = translations.values[index];
      if (valueTranslation && valueTranslation[currentLang]) {
        return {
          ...value,
          label: valueTranslation[currentLang]
        };
      }
      return value;
    });
  }

  // Handle data object for select components
  if (component.data?.values && Array.isArray(component.data.values) && translations.data?.values) {
    translatedComponent.data = {
      ...component.data,
      values: component.data.values.map((value: any, index: number) => {
        const valueTranslation = translations.data.values[index];
        if (valueTranslation && valueTranslation[currentLang]) {
          return {
            ...value,
            label: valueTranslation[currentLang]
          };
        }
        return value;
      })
    };
  }

  // Translate HTML content
  if (component.type === 'htmlelement' && translations.content && translations.content[currentLang]) {
    translatedComponent.content = translations.content[currentLang];
  }

  // Translate button text
  if (component.type === 'button' && translations.label && translations.label[currentLang]) {
    translatedComponent.label = translations.label[currentLang];
  }

  // Recursively translate nested components
  if (component.components && Array.isArray(component.components)) {
    translatedComponent.components = component.components.map((child: any) => {
      const childTranslations = translations.components?.find(
        (t: any) => t.key === child.key
      );
      return translateFormComponent(child, childTranslations, currentLang);
    });
  }

  // Translate columns in column components
  if (component.columns && Array.isArray(component.columns)) {
    translatedComponent.columns = component.columns.map((column: any, colIndex: number) => ({
      ...column,
      components: column.components?.map((child: any) => {
        const childTranslations = translations.columns?.[colIndex]?.components?.find(
          (t: any) => t.key === child.key
        );
        return translateFormComponent(child, childTranslations, currentLang);
      })
    }));
  }

  return translatedComponent;
}

/**
 * Main function to translate entire form schema
 */
export function translateFormSchema(
  formSchema: any, 
  translations: any, 
  targetLanguage: string
): any {
  if (!formSchema || !translations) {
    console.warn('Missing form schema or translations');
    return formSchema;
  }

  const translatedSchema = { ...formSchema };

  // Translate form title
  if (translations.title && translations.title[targetLanguage]) {
    translatedSchema.title = translations.title[targetLanguage];
  }

  // Translate wizard page titles (if wizard form)
  if (formSchema.display === 'wizard' && Array.isArray(formSchema.components)) {
    translatedSchema.components = formSchema.components.map((page: any, pageIndex: number) => {
      const pageTranslations = translations.pages?.[pageIndex];
      const translatedPage = { ...page };

      if (pageTranslations?.title && pageTranslations.title[targetLanguage]) {
        translatedPage.title = pageTranslations.title[targetLanguage];
        translatedPage.label = pageTranslations.title[targetLanguage];
      }

      // Translate components within the page
      if (page.components && Array.isArray(page.components)) {
        translatedPage.components = page.components.map((component: any) => {
          const componentTranslations = pageTranslations?.components?.find(
            (t: any) => t.key === component.key
          );
          return translateFormComponent(component, componentTranslations, targetLanguage);
        });
      }

      return translatedPage;
    });
  } else if (Array.isArray(formSchema.components)) {
    // Regular form (not wizard)
    translatedSchema.components = formSchema.components.map((component: any) => {
      const componentTranslations = translations.components?.find(
        (t: any) => t.key === component.key
      );
      return translateFormComponent(component, componentTranslations, targetLanguage);
    });
  }

  return translatedSchema;
}