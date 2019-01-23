import mongoose from "mongoose";
import { NextFunction } from "express";

export type QueueModel = mongoose.Document & {
    partyId: string,
    songs: [string]
};

const queueSchema = new mongoose.Schema({
    partyId: String,
    songs: [String]
});

const Queue = mongoose.model("User", queueSchema);
export default Queue;