import { Realm } from "@realm/react";

export class FollowUps extends Realm.Object {
    id!: number;
    followup_date!: string;
    status!: string;
    comment!: string;
    form_data!: { [key: string]: string | number | boolean | null };
    sync_data!: { [key: string]: string | number | boolean | null };

    user!: { [key: string]: string | number | boolean | null };
    survey!: { [key: string]: string | number | boolean | null };
    survey_result!: { [key: string]: string | number | boolean | null };

    created_at!: string;
    updated_at!: string;

    // Helper method to get the user ID consistently
    getUserId(): number | null {
        // First check form_data
        if (this.form_data && this.form_data.user_id !== undefined) {
            return typeof this.form_data.user_id === 'string' 
                ? parseInt(this.form_data.user_id, 10) 
                : this.form_data.user_id as number;
        }
        // Then check user object
        if (this.user && this.user.id !== undefined) {
            return typeof this.user.id === 'string'
                ? parseInt(this.user.id, 10)
                : this.user.id as number;
        }
        return null;
    }

    static schema = {
        name: "FollowUps",
        primaryKey: "id",
        properties: {
            id: "int",
            followup_date: "string?",
            status: "string?",
            comment: "string?",
            form_data: "mixed{}",
            sync_data: "mixed{}",
            user: "mixed{}",
            survey: "mixed{}",
            survey_result: "mixed{}",
            created_at: "string?",
            updated_at: "string?",
        }
    }
} 