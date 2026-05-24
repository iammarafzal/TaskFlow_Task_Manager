import { EntitySchema } from 'typeorm';

export default new EntitySchema({
    name: "Notification",
    tableName: "notifications",
    columns: {
        id: {
            primary: true,
            type: "integer",
            generated: "increment"
        },
        userId: {
            type: "uuid",
            nullable: false
        },
        title: {
            type: "varchar",
            nullable: false
        },
        message: {
            type: "text",
            nullable: false
        },
        isRead: {
            type: "boolean",
            default: false
        },
        createdAt: {
            type: "timestamp with time zone",
            createDate: true
        }
    },
    relations: {
        user: {
            type: "many-to-one",
            target: "User",
            inverseSide: "notifications",
            joinColumn: { name: "userId" },
            onDelete: "CASCADE"
        }
    }
});