import { Table, Column, Model, DataType, BelongsTo, ForeignKey } from "sequelize-typescript";
import { default as Party } from "./Party.model";

@Table({
    tableName: "queue",
    indexes: [
        {
            unique: true,
            fields: ["partyId", "songUri"]
        }
    ]
})
export default class Queue extends Model<Queue> {
    @ForeignKey(() => Party)
    @Column(DataType.INTEGER)
    partyId: Party;

    @Column(DataType.STRING)
    songUri: string;

    @Column(DataType.TEXT)
    songName: string;

    @Column(DataType.TEXT)
    artistName: string;

    @Column(DataType.TEXT)
    albumImage: string;

    @Column(DataType.INTEGER)
    votes: number;
}