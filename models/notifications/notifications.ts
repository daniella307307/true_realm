import { Realm } from "@realm/react";

export class Notifications extends Realm.Object {
    id!: number;
    followup_date!: string;
    status!: string;
    comment!: string;
    form_data!: { [key: string]: string | number | boolean | null };

    user!: { [key: string]: string | number | boolean | null };
    survey!: { [key: string]: string | number | boolean | null };
    survey_result!: { [key: string]: string | number | boolean | null };

    created_at!: string;
    updated_at!: string;

    static schema = {
        name: "Notifications",
        primaryKey: "id",
        properties: {
            id: "int",
            followup_date: "string?",
            status: "string?",
            comment: "string?",
            form_data: "mixed{}",
            user: "mixed{}",
            survey: "mixed{}",
            survey_result: "mixed{}",
            created_at: "string?",
            updated_at: "string?",
        }
    }
} 