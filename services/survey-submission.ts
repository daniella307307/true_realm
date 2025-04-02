import { SurveySubmission } from "~/models/surveys/survey-submission";
import { FormField } from "~/types";
import { Realm } from "@realm/react";

export const createSurveySubmission = (
    formData: Record<string, any>,
    fields: FormField[],
) => {
    const answers = Object.fromEntries(
        fields
            .filter(field => field.key !== 'submit')
            .map(field => {
                const value = formData[field.key];

                // Handle different field types
                switch (field.type) {
                    case 'switch':
                        return [field.key, value ? true : false];
                    case 'number':
                        return [field.key, Number(value)];
                    case 'date':
                    case 'datetime':
                        return [field.key, value ? new Date(value).toISOString() : null];
                    default:
                        return [field.key, value ?? null];
                }
            })
    );

    return {
        _id: new Realm.BSON.ObjectId(),
        submittedAt: new Date(),
        timeSpentFormatted: formData.timeSpentFormatted,
        answers,
        userId: formData.userId,
        metadata: {
            language: formData.language || 'en-US',
        },

        table_name: formData.table_name,
        project_module_id: formData.project_module_id,
        source_module_id: formData.source_module_id,
        project_id: formData.project_id,
        survey_id: formData.survey_id,
        post_data: formData.post_data,
        province: formData.province,
        district: formData.district,
        sector: formData.sector,
        cell: formData.cell,
        village: formData.village,
        izucode: formData.izucode,
        family: formData.family,
    };
};

export const saveSurveySubmission = async (
    realm: Realm,
    formData: Record<string, any>,
    fields: FormField[]
) => {
    try {
        realm.write(() => {
            console.log("The data to be saved: ", formData);
            // Check if the formData is empty
            if (Object.keys(formData).length === 0) {
                throw new Error("Form data is empty");
            }
            // Check if the fields are empty
            if (fields.length === 0) {
                throw new Error("Fields are empty");
            }
            // Check if the realm is in a write transaction
            if (!realm.isInTransaction) {
                throw new Error("Realm is not in a write transaction");
            }
            // Check if the realm is closed
            if (realm.isClosed) {
                throw new Error("Realm is closed");
            }
            realm.create(SurveySubmission, createSurveySubmission(formData, fields));
        });
        console.log('Survey submission saved okay! Print the submitted version below');
        console.log(realm.objects(SurveySubmission));
    } catch (error) {
        console.error('Error saving survey submission:', error);
        throw error;
    }
};