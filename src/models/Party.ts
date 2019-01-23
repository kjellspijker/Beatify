import mongoose from "mongoose";
import { NextFunction } from "express";

export type PartyModel = mongoose.Document & {
    partyId: {type: number, unique: true},
    owner: {type: string, unique: true},
    name: string
};

const partySchema = new mongoose.Schema({
    partyId: {type: Number, unique: true},
    owner: {type: String, unique: true},
    name: String
});

const Party = mongoose.model("Party", partySchema);
export default Party;
