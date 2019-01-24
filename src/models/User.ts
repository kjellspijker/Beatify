import mongoose from "mongoose";
import { NextFunction } from "express";

export type UserModel = mongoose.Document & {
    accessToken: string,
    refreshToken: string,
    spotifyId: string,
    email: string,
    username: string,
    country: string
    // TODO maybe add profile images here
};

const userSchema = new mongoose.Schema({
    spotifyId: {type: String, unique: true},
    accessToken: String,
    refreshToken: String,
    email: String,
    username: String,
    country: String
});

const User = mongoose.model("User", userSchema);
export default User;