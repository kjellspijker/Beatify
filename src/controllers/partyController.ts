import { Request, Response } from "express";

export let join = (req: Request, res: Response) => {
    res.render("join", {
      title: "Join a party",
      pid: req.params.id
    });
  };

  export let create = (req: Request, res: Response) => {
    res.render("create", {
      title: "Create a party"
    });
  };