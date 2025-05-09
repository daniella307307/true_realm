import { Realm } from "@realm/react";

export class Performance extends Realm.Object {
    id!: number;
    family_id!: string;
    user_id!: number;
    module_id!: string;
    form_id!: string;
    date_recorded!: string;
    type!: string;
    cohort!: string;
    json!: string;
    timestamp!: string;
    answer!: string;
    
    form_data?: { [key: string]: string | number | boolean | null };
    location?: { [key: string]: string | number | boolean | null };
    sync_data?: { [key: string]: string | number | boolean | null };

    static schema = {
        name: "Performance",
        primaryKey: "id",
        properties: {
            id: "int",
            family_id: "string",
            user_id: "int",
            module_id: "string",
            form_id: "string",
            date_recorded: "string",
            type: "string",
            cohort: "string",
            json: "string",
            timestamp: "string",
            answer: "string",
            
            form_data: "mixed{}",
            location: "mixed{}",
            sync_data: "mixed{}"
        }
    }
} 