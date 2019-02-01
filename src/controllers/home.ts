import { Request, Response } from "express";
import passport = require("passport");
import { IVerifyOptions } from "passport-local";
import { nextTick } from "async";
const randToken = require("rand-token");

/**
 * GET /
 * Home page.
 */
export let index = (req: Request, res: Response) => {
  res.render("home", {
    title: "Home"
  });
};
