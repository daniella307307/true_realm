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
    current_page: number;
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

export interface IZUs {
    id: number;
    name: string;
    user_code: string;
    villages_id: number;
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
    created_at?: string;
    updated_at?: string;
}

export interface IForm {
    success?: boolean;
    id?: number;
    name: string;
    title?: string;
    path?: string;
    description: string;
    data: IFormElement[];
}

export interface IComment {
    id: number;
    user_id: number;
    post_id: number;
    comment: string;
    created_at: string;
    updated_at: string;
    user: IUsers;
}

export interface ILikes {
    id: number;
    user_id: number;
    post_id: number;
    created_at: string;
    updated_at: string;
}

export interface IPost {
    id: number;
    user_id: number;
    status: number;
    title: string;
    body: string;
    flagged: number;
    created_at: string;
    updated_at: string;
    user: IUsers;
    comments: IComment[];
    likes: ILikes[];
}

export interface User {
    id: number;
    user_code: string;
    existing_code: string;
    nationalID: string;
    name: string;
    gender: string;
    dob: string;
    date_enrollment: string;
    email: string;
    telephone: string;
    picture: string;
    position: number;
    userstatus: number;
    cm_id: number | null;
    villages_id: number;
    sectorscontrol: null;
    highdegree: string;
    otherdegree: string | null;
    highestgrade: string;
    otherhighestgradenote: string | null;
    ifaffiliatedwithsm: string;
    underwhatcapacity: string;
    othercapacity: string | null;
    ifaffiliatedwithsmasIZU: string;
    ifaffiliatedwithorg: string;
    otherorganizationaffilia: string | null;
    communityorgrole: string;
    currentroles: string | null;
    hoursforabunzi: number | null;
    hoursforchw: number | null;
    hoursforizu: number | null;
    hoursfornwcr: number | null;
    hoursfornycr: number | null;
    hoursforvillagelead: number | null;
    othergovernmentaffiliass: string | null;
    hoursforotherrole: number | null;
    workedsetting: string | null;
    settingnames: string | null;
    yearsecd: number | null;
    yearschildcare: number | null;
    yearsnursary: number | null;
    yearsprimary: number | null;
    yearssunday: number | null;
    yearscbhs: number | null;
    capacityasizu: string;
    whatorganization: string | null;
    settingnamesaee: string | null;
    ifreceivetrainingaee: string | null;
    whentrainingaee: string | null;
    numberofhoursaee: number | null;
    howlongwithorgaee: string | null;
    howdeliverprogramaee: string | null;
    hoursperweekhomevisitaee: number | null;
    hoursperweekcommunitygroupaee: number | null;
    hoursperweekotheraee: number | null;
    othernameprogramaee: string | null;
    communitygroupsessionperweekaee: number | null;
    homevisitperweekaee: number | null;
    timespendperweekaee: number | null;
    settingnamesami: string | null;
    ifreceivetrainingami: string | null;
    whentrainingami: string | null;
    numberofhoursami: number | null;
    howlongwithorgami: string | null;
    howdeliverprogramami: string | null;
    hoursperweekhomevisitami: number | null;
    homevisitperweekami: number | null;
    hoursperweekcommunitygroupami: number | null;
    communitygroupsessionperweekami: number | null;
    othernameprogramami: string | null;
    hoursperweekotherami: number | null;
    timespendperweekami: number | null;
    settingnamesavega: string | null;
    ifreceivetrainingavega: string | null;
    whentrainingavega: string | null;
    numberofhoursavega: number | null;
    howlongwithorgavega: string | null;
    howdeliverprogramavega: string | null;
    hoursperweekhomevisitavega: number | null;
    homevisitperweekavega: number | null;
    hoursperweekcommunitygroupavega: number | null;
    communitygroupsessionperweekavega: number | null;
    othernameprogramavega: string | null;
    hoursperweekotheravega: number | null;
    timespendperweekavega: number | null;
    settingnamesfxb: string | null;
    ifreceivetrainingfxb: string | null;
    whentrainingfxb: string | null;
    numberofhoursfxb: number | null;
    howlongwithorgfxb: string | null;
    howdeliverprogramfxb: string | null;
    hoursperweekhomevisitfxb: number | null;
    homevisitperweekfxb: number | null;
    hoursperweekcommunitygroupfxb: number | null;
    communitygroupsessionperweekfxb: number | null;
    othernameprogramfxb: string | null;
    hoursperweekotherfxb: number | null;
    timespendperweekfxb: number | null;
    settingnamesgikuriro: string | null;
    ifreceivetraininggikuriro: string | null;
    whentraininggikuriro: string | null;
    numberofhoursgikuriro: number | null;
    howlongwithorggikuriro: string | null;
    howdeliverprogramgikuriro: string | null;
    hoursperweekhomevisitgikuriro: number | null;
    homevisitperweekgikuriro: number | null;
    hoursperweekcommunitygroupgikuriro: number | null;
    communitygroupsessionperweekgikuriro: number | null;
    othernameprogramgikuriro: string | null;
    hoursperweekothergikuriro: number | null;
    timespendperweekgikuriro: number | null;
    settingnamesipa: string | null;
    ifreceivetrainingipa: string | null;
    whentrainingipa: string | null;
    numberofhoursipa: number | null;
    howlongwithorgipa: string | null;
    howdeliverprogramipa: string | null;
    hoursperweekhomevisitipa: number | null;
    homevisitperweekipa: number | null;
    hoursperweekcommunitygroupipa: number | null;
    communitygroupsessionperweekipa: number | null;
    othernameprogramipa: string | null;
    hoursperweekotheripa: number | null;
    timespendperweekipa: number | null;
    settingnamesloda: string | null;
    ifreceivetrainingloda: string | null;
    whentrainingloda: string | null;
    numberofhoursloda: number | null;
    howlongwithorgloda: string | null;
    howdeliverprogramloda: string | null;
    hoursperweekhomevisitloda: number | null;
    homevisitperweekloda: number | null;
    hoursperweekcommunitygrouploda: number | null;
    communitygroupsessionperweekloda: number | null;
    othernameprogramloda: string | null;
    hoursperweekotherloda: number | null;
    timespendperweekloda: number | null;
    settingnamesminisante: string | null;
    ifreceivetrainingminisante: string | null;
    whentrainingminisante: string | null;
    numberofhoursminisante: number | null;
    howlongwithorgminisante: string | null;
    howdeliverprogramminisante: string | null;
    hoursperweekhomevisitminisante: number | null;
    homevisitperweekminisante: number | null;
    hoursperweekcommunitygroupminisante: number | null;
    communitygroupsessionperweekminisante: number | null;
    othernameprogramminisante: string | null;
    hoursperweekotherminisante: number | null;
    timespendperweekminisante: number | null;
    settingnamesncda: string | null;
    ifreceivetrainingncda: string | null;
    whentrainingncda: string | null;
    numberofhoursncda: number | null;
    howlongwithorgncda: string | null;
    howdeliverprogramncda: string | null;
    hoursperweekhomevisitncda: number | null;
    homevisitperweekncda: number | null;
    hoursperweekcommunitygroupncda: number | null;
    communitygroupsessionperweekncda: number | null;
    othernameprogramncda: string | null;
    hoursperweekotherncda: number | null;
    timespendperweekncda: number | null;
    settingnamesorora: string | null;
    ifreceivetrainingorora: string | null;
    whentrainingorora: string | null;
    numberofhoursorora: number | null;
    howlongwithorgorora: string | null;
    howdeliverprogramorora: string | null;
    hoursperweekhomevisitorora: number | null;
    homevisitperweekorora: number | null;
    hoursperweekcommunitygrouporora: number | null;
    communitygroupsessionperweekorora: number | null;
    othernameprogramorora: string | null;
    hoursperweekotherorora: number | null;
    timespendperweekorora: number | null;
    settingnamesrab: string | null;
    ifreceivetrainingrab: string | null;
    whentrainingrab: string | null;
    numberofhoursrab: number | null;
    howlongwithorgrab: string | null;
    howdeliverprogramrab: string | null;
    hoursperweekhomevisitrab: number | null;
    homevisitperweekrab: number | null;
    hoursperweekcommunitygrouprab: number | null;
    communitygroupsessionperweekrab: number | null;
    othernameprogramrab: string | null;
    hoursperweekotherrab: number | null;
    timespendperweekrab: number | null;
    settingnamesuburezi: string | null;
    ifreceivetraininguburezi: string | null;
    whentraininguburezi: string | null;
    numberofhoursuburezi: number | null;
    howlongwithorguburezi: string | null;
    howdeliverprogramuburezi: string | null;
    hoursperweekhomevisituburezi: number | null;
    homevisitperweekuburezi: number | null;
    hoursperweekcommunitygroupuburezi: number | null;
    communitygroupsessionperweekuburezi: number | null;
    othernameprogramuburezi: string | null;
    hoursperweekotheruburezi: number | null;
    timespendperweekuburezi: number | null;
    settingnamesworld: string | null;
    ifreceivetrainingworld: string | null;
    whentrainingworld: string | null;
    numberofhoursworld: number | null;
    howlongwithorgworld: string | null;
    howdeliverprogramworld: string | null;
    hoursperweekhomevisitworld: number | null;
    homevisitperweekworld: number | null;
    hoursperweekcommunitygroupworld: number | null;
    communitygroupsessionperweekworld: number | null;
    othernameprogramworld: string | null;
    hoursperweekotherworld: number | null;
    timespendperweekworld: number | null;
    settingnamesusaid: string | null;
    ifreceivetrainingusaid: string | null;
    whentrainingusaid: string | null;
    numberofhoursusaid: number | null;
    howlongwithorgusaid: string | null;
    howdeliverprogramusaid: string | null;
    hoursperweekhomevisitusaid: number | null;
    homevisitperweekusaid: number | null;
    hoursperweekcommunitygroupusaid: number | null;
    communitygroupsessionperweekusaid: number | null;
    othernameprogramusaid: string | null;
    hoursperweekotherusaid: number | null;
    timespendperweekusaid: number | null;
    otherorganization: string | null;
    settingnamesothers: string | null;
    ifreceivetrainingothers: string | null;
    whentrainingothers: string | null;
    numberofhoursothers: number | null;
    howlongwithorgothers: string | null;
    howdeliverprogramothers: string | null;
    hoursperweekhomevisitothers: number | null;
    homevisitperweekothers: number | null;
    hoursperweekcommunitygroupothers: number | null;
    communitygroupsessionperweekothers: number | null;
    othernameprogramothers: string | null;
    hoursperweekotherothers: number | null;
    timespendperweekothers: number | null;
    incentives: string;
    transportincentiveoffen: string | null;
    howmuchtransportincentive: number | null;
    timeincentiveoffen: string | null;
    howmuchtimeincentive: number | null;
    otherincentive: string | null;
    shirtsize: string;
    shoesize: string;
    weekdaysavailability: string;
    saturdaysavailability: string;
    sundaysavailability: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    last_seen: string | null;
}


export interface IProject {
    id: number;
    name: string;
    duration: string;
    progress: string;
    description: string;
    status: number;
    beneficiary: string;
    projectlead: string;
    has_modules: number;
    created_at: string;
    updated_at: string;
    project_modules: [];
}

export interface IModule {
    id: number;
    project_id: number;
    module_name: string;
    module_description: string;
    expected_duration: string;
    module_status: number;
    source_module_id: number;
    kin: string;
    kin_title: string;
    kin_descriptions: string;
    order_list: number;
    created_at: string;
    updated_at: string;
}

export interface FormField {
    key: string;
    type: string;
    input: boolean;
    label: string;
    title: {
        en: string;
        kn: string;
        default: string;
    };
    tableView: boolean;
    data?: {
        values: Array<{
            label: string;
            value: string;
        }>;
    };
    values?: Array<{
        label: string;
        value: string;
        title?: {
            en: string;
            kn: string;
            default: string;
        };
    }>;
    conditional?: {
        eq: string;
        show: boolean;
        when: string;
    };
    dependsOn?: string;
    visibleIf?: string;
}
export interface IExistingForm {
    id: number;
    name: string;
    slug: string;
    json: string;
    json2: string;
    survey_status: number;
    module_id: number;
    is_primary: number;
    prev_id: string;
    created_at: string;
    updated_at: string;
    order_list: number;
    project_module_id: number;
}

export interface IFamilies {
    id: number;
    hh_id: string;
    hh_head_fullname: string;
    village_name: string;
    cohort: string;
}