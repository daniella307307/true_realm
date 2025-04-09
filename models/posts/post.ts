import { Realm } from "@realm/react";

export class Post extends Realm.Object<Post> {
    id!: number;
    user_id!: number;
    status!: number;
    title!: string;
    body!: string;
    flagged!: number;
    created_at!: string;
    updated_at!: string;
    user!: string;
    comments!: string;
    likes!: string;

    static schema = {
        name: 'Post',
        properties: {
            id: 'int',
            user_id: 'int',
            status: 'int',
            title: 'string',
            body: 'string',
            flagged: 'int',
            created_at: 'string',
            updated_at: 'string?',
            user: 'string',
            comments: 'string',
            likes: 'string',
        },
        primaryKey: 'id',
    };
} 