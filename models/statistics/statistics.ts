import { Realm } from "@realm/react";

export class Statistics extends Realm.Object {
    id!: number;
    izucode!: string;
    villages_id!: number;
    position!: number;
    izu_statistics!: { [key: string]: number | null };

    static schema = {
        name: "Statistics",
        properties: {
            id: "int",
            izucode: "string",
            villages_id: "int",
            position: "int",
            izu_statistics: "mixed{}"
        }
    }
}
