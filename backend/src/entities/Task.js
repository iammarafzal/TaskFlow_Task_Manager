import { EntitySchema } from 'typeorm';

export default new EntitySchema({
    name: "Task",
    tableName: "tasks",
    columns: {
        id: {
            primary: true,
            type: "uuid",
            generated: "uuid"
        },
        userId: {
            type: "uuid",
            nullable: false
        },
        title: {
            type: "varchar",
            nullable: false
        },
        impact: {
            type: "enum",
            enum: ["HIGH", "MEDIUM", "LOW"],
            nullable: false
        },
        deadline: {
            type: "timestamp with time zone",
            nullable: false
        },
        effort: {
            type: "float",
            nullable: false
        },
        score: {
            type: "integer",
            nullable: false
        },
        status: {
            type: "enum",
            enum: ["PENDING", "COMPLETED"],
            default: "PENDING"
        },
        createdAt: {
            type: "timestamp with time zone",
            createDate: true
        },
        updatedAt: {
            type: "timestamp with time zone",
            updateDate: true
        }
    },
    relations: {
        user: {
            type: "many-to-one",
            target: "User",
            inverseSide: "tasks",
            joinColumn: { name: "userId" },
            onDelete: "CASCADE"
        }
    }
});