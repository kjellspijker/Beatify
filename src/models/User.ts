import mongoose from "mongoose";
import { NextFunction } from "express";

export type UserModel = mongoose.Document & {
    spotifyId: string,
    email: string,
    username: string,
    country: string
    // TODO maybe add profile images here
};

const userSchema = new mongoose.Schema({
    spotifyId: {type: String, unique: true},
    email: String,
    username: String,
    country: String
});

const User = mongoose.model("User", userSchema);
export default User;