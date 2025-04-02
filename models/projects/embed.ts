// Define an embedded object for Project data
export class ProjectData extends Realm.Object<ProjectData> {
    id!: number;
    name!: string;
    description!: string;
    status!: number;
    has_modules!: number;

    static schema: Realm.ObjectSchema = {
        name: "ProjectData",
        embedded: true, // This marks it as an embedded object
        properties: {
            id: "int",
            name: "string",
            description: "string",
            status: "int",
            has_modules: "int",
        },
    };
}

// Define an embedded object for Module data
export class ModuleData extends Realm.Object<ModuleData> {
    id!: number;
    project_id!: number;
    module_name!: string;
    module_description!: string;
    expected_duration?: string;
    module_status!: number;
    source_module_id!: number;
    kin?: string;
    kin_title?: string;
    kin_descriptions?: string;
    order_list!: number;
    created_at?: Date;
    updated_at?: Date;

    static schema: Realm.ObjectSchema = {
        name: "ModuleData",
        embedded: true,
        properties: {
            id: "int",
            project_id: "int",
            module_name: "string",
            module_description: "string",
            expected_duration: "string?",
            module_status: "int",
            source_module_id: "int",
            kin: "string?",
            kin_title: "string?",
            kin_descriptions: "string?",
            order_list: "int",
            created_at: "date?",
            updated_at: "date?",
        },
    };
}
