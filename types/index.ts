import { z } from "zod";

export interface IUsers {
    id: number;
    name: string;
    email: string;
    picture: string;
    position: number;
    villages_id: number;
    email_verified_at: Date;
    password: string;
    remember_token: string;
    created_at: Date;
    updated_at: Date;
    last_seen: Date;
}


export const loginSchema = z.object({
    email: z
        .string()
        .email("Invalid email address")
        .nonempty("Email is required"),
    password: z
        .string()
        .nonempty("Password is required")
        .min(
            5,
            "Password must be at least 5 characters"
        )
        .regex(
            /[0-9]/,
            "Password must include a digit"
        ),
});

export type ILoginDetails = z.infer<typeof loginSchema>;

export interface ILoginResponse {
    token: string;
    name: string;
    role: string;
}

export type IResponseError = {
    data?: null;
    error: string;
    message: string;
    status: string;
    timestamp: string;
    errorCode?: string;
};

export type IResponse<T> = {
    data: T;
    message: string;
    status: string;
    timestamp: string;
};

export interface IDeviceInfo {
    userAgent: string;
    location: {
        lat: number;
        lon: number;
    } | null;
    deviceType: string;
}

export interface IFamilies {
    id: string;
    name: string;
    cohort: number;
    location?: string;
}

export interface ICategories {
    id: number;
    name: string;
    description: string;
    path: string;
    is_active: number;
    created_at: string;
    updated_at?: string;
}

export interface IForms {
    id: number;
    name: string;
    description: string;
    category_id: number;
    created_at: string;
    updated_at?: string;
    category: ICategories;
    version: [];
}

export interface IFormElement {
    id: number;
    form_id: number;
    key: string;
    type: string;
    label: string;
    element_properties: {
        label: string;
        labelPosition: string;
        placeholder?: string;
        description?: string;
        tooltip?: string;
        prefix?: string;
        suffix?: string;
        widget?: {
            type: string;
        };
        inputMask?: string;
        displayMask?: string;
        applyMaskOn?: string;
        allowMultipleMasks?: boolean;
        customClass?: string;
        tabindex?: string;
        autocomplete?: string;
        hidden?: boolean;
        hideLabel?: boolean;
        showWordCount?: boolean;
        showCharCount?: boolean;
        mask?: boolean;
        autofocus?: boolean;
        spellcheck?: boolean;
        disabled?: boolean;
        tableView?: boolean;
        modalEdit?: boolean;
        multiple?: boolean;
        persistent?: boolean;
        inputFormat?: string;
        protected?: boolean;
        dbIndex?: boolean;
        case?: string;
        truncateMultipleSpaces?: boolean;
        encrypted?: boolean;
        redrawOn?: string;
        clearOnHide?: boolean;
        customDefaultValue?: string;
        calculateValue?: string;
        calculateServer?: boolean;
        allowCalculateOverride?: boolean;
        validateOn?: string;
        validate: {
            required?: boolean;
            pattern?: string;
            customMessage?: string;
            custom?: string;
            customPrivate?: boolean;
            json?: string;
            minLength?: number;
            maxLength?: number;
            strictDateValidation?: boolean;
            multiple?: boolean;
            unique?: boolean;
            min?: number;
            max?: number;
            step?: string;
            integer?: boolean;
            onlyAvailableItems?: boolean;
        };
        unique?: boolean;
        validateWhenHidden?: boolean;
        errorLabel?: string;
        errors?: string;
        tags?: string[];
        properties?: string[];
        conditional?: {
            show?: string;
            when?: string;
            eq?: string;
            json?: string;
        };
        customConditional?: string;
        logic?: string[];
        attributes?: string[];
        overlay?: {
            style?: string;
            page?: string;
            left?: string;
            top?: string;
            width?: string;
            height?: string;
        };
        rows?: number;
        wysiwyg?: boolean;
        dataGridLabel?: boolean;
        input?: boolean;
        refreshOn?: string;
        addons?: string[];
        inputType?: string;
        fixedSize?: boolean;
        defaultValue?: any;
        values?: Array<{
            label: string;
            value: string;
            shortcut?: string;
        }>;
        dataSrc?: string;
        valueProperty?: string;
        template?: string;
        authenticate?: boolean;
        ignoreCache?: boolean;
        fieldSet?: boolean;
    };
    created_at: string;
    updated_at: string;
}

export interface IForm {
    success: boolean;
    name: string;
    title: string;
    path: string;
    description: string;
    data: IFormElement[];
}