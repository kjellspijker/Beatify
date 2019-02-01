import { Table, Column, Model, DataType, PrimaryKey, BelongsTo, Unique, HasMany, ForeignKey, AutoIncrement } from "sequelize-typescript";
import { default as User } from "./User.model";
import { default as Queue } from "./Queue.model";

@Table({
    tableName: "parties"
})
export default class Party extends Model<Party> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    partyId: number;

    @Unique
    @Column(DataType.BIGINT)
    UUID: number;

    @ForeignKey(() => User)
    @Column(DataType.INTEGER)
    owner: User;

    @Column(DataType.STRING)
    name: string;

    @HasMany(() => Queue)
    queues: Queue[];
}