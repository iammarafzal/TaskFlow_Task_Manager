import { EntitySchema } from 'typeorm';

export default new EntitySchema({
    name: "User",
    tableName: "users",
    columns: {
        id: {
            primary: true,
            type: "uuid",
            generated: "uuid"
        },
        email: {
            type: "varchar",
            unique: true,
            nullable: false
        },
        password: {
            type: "varchar",
            nullable: false
        },
        createdAt: {
            type: "timestamp with time zone",
            createDate: true
        }
    },
    relations: {
        tasks: {
            type: "one-to-many",
            target: "Task",
            inverseSide: "user",
            cascade: true,
            onDelete: "CASCADE"
        }
    },
    indices: [
        {
            name: "IDX_USERS_EMAIL",
            unique: true,
            columns: ["email"]
        }
    ]
});