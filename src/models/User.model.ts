import { Table, Column, Model, DataType, PrimaryKey, HasMany, AutoIncrement } from "sequelize-typescript";
import { default as Party } from "./Party.model";

@Table({
    tableName: "users"
})
export default class User extends Model<User> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    userId: number;

    @Column(DataType.BIGINT)
    UUID: number;

    @Column(DataType.TEXT)
    spotifyId: string;

    @Column(DataType.TEXT)
    accessToken: string;

    @Column(DataType.TEXT)
    refreshToken: string;

    @Column(DataType.TEXT)
    email: string;

    @Column(DataType.TEXT)
    username: string;

    @Column(DataType.STRING)
    country: string;

    @HasMany(() => Party)
    parties: Party[];

}