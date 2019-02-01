import express from "express";
import compression from "compression";  // compresses requests
import session from "express-session";
import bodyParser from "body-parser";
import logger from "./util/logger";
import lusca from "lusca";
import dotenv from "dotenv";
// import mongo from "connect-mongo";
import flash from "express-flash";
import path from "path";
// import mongoose from "mongoose";
import passport from "passport";
import expressValidator from "express-validator";
import bluebird, { any } from "bluebird";
import { default as User } from "./models/User.model";
import { default as Party } from "./models/Party.model";
import { default as Queue } from "./models/Queue.model";
import { MONGODB_URI, SESSION_SECRET, MYSQL_DATABASE, MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_HOST, MYSQL_PORT } from "./util/secrets";
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_CALLBACK_URL } from "./util/secrets";
import { main } from "./util/websocket";
import { Sequelize } from "sequelize-typescript";
const favicon = require("serve-favicon");
const SpotifyStrategy = require("passport-spotify").Strategy;
const randToken = require("rand-token");
const request = require("request");
const MySQLStore = require("express-mysql-session")(session);

// const MongoStore = mongo(session);

// Load environment variables from .env file, where API keys and passwords are configured
dotenv.config({ path: ".env" });

// Controllers (route handlers)
import * as homeController from "./controllers/home";
import * as partyController from "./controllers/partyController";
import { fstat, readFileSync } from "fs";

// Create Express server
const app = express();

// Connect to MySQL
export const sequelize = new Sequelize({
  database: MYSQL_DATABASE,
  username: MYSQL_USERNAME,
  password: MYSQL_PASSWORD,
  host: MYSQL_HOST,
  storage: ":memory:",
  modelPaths: [__dirname + "/models"],
  dialect: "mysql"
});
sequelize.authenticate()
  .then(() => {
    console.log("Connected to MySQL");
    sequelize.sync().then(() => {
      sequelize.query("DROP TRIGGER IF EXISTS BeforeNewUserUUIDGeneratorTrigger").then(() => {
        const newUserTrigger = readFileSync("./sql/BeforeNewUserUUIDGeneratorTrigger.sql", "utf8");
        sequelize.query(newUserTrigger).then(() => {
          sequelize.query("DROP TRIGGER IF EXISTS BeforeNewPartyUUIDGeneratorTrigger").then(() => {
            const newPartyTrigger = readFileSync("./sql/BeforeNewPartyUUIDGeneratorTrigger.sql", "utf8");
            sequelize.query(newPartyTrigger);
          });
        });
      });
    });
  })
  .catch((err: any) => {
    console.error("Unable to connect to MySQL: ", err);
  });

const MySQLStoreOptions = {
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USERNAME,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE
};

const sessionStore = new MySQLStore(MySQLStoreOptions);

// Express configuration
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: SESSION_SECRET,
  store: sessionStore
}));
app.use(flash());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));

app.use(
  express.static(path.join(__dirname, "public"), { maxAge: 31557600000 })
);
app.use(favicon(path.join(__dirname, "public", "images", "favicon.ico")));

// After here requires passport authorization
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use((req, res, next) => {
  // After successful login, redirect back to the intended page
  if (!req.user &&
    req.path !== "/login" &&
    req.path !== "/signup" &&
    !req.path.match(/^\/auth/) &&
    !req.path.match(/\./)) {
    req.session.returnTo = req.path;
  } else if (req.user &&
    req.path == "/account") {
    req.session.returnTo = req.path;
  }
  next();
});

passport.serializeUser(function (user: User, done) {
  done(undefined, user.userId);
});

passport.deserializeUser(function (spotifyId, done) {
  console.log("Deserializing");
  User.findOne({
    where: {
      userId: spotifyId
    }
  }).then((user) => {
    done(undefined, user);
  });
});

passport.use(new SpotifyStrategy(
  {
    clientID: SPOTIFY_CLIENT_ID,
    clientSecret: SPOTIFY_CLIENT_SECRET,
    callbackURL: SPOTIFY_CALLBACK_URL
  },
  function (accessToken: string, refreshToken: string, expires_in: number, profile: any, done: any) {
    User.findOrCreate({
      where: {
        spotifyId: profile.id
      },
      defaults: {
        spotifyId: profile.id,
        accessToken: accessToken,
        refreshToken: refreshToken,
        email: profile.emails[0].value,
        username: profile.username,
        country: profile.country
      }
    }).spread((user, created) => {
      return done(undefined, user);
    }).catch(err => {
      return done(err, undefined);
    });
  }
));

/**
 * Primary app routes.
 */
app.get("/", homeController.index);
app.get("/join/:id", partyController.join);
app.get("/create", partyController.create);
app.get("/auth/spotify", passport.authenticate("spotify", {
  scope: ["user-read-email", "user-read-private"]
}), function (req, res) {

});

app.get("/party/:id", function (req, res) {
  const id = parseInt(req.params.id, 16);
  Party.findOrCreate({
    where: {
      UUID: id
    },
    defaults: {
      owner: req.user.userId,
      name: "TestName"
    }
  }).spread((party: Party, created) => {
    res.render("party", {
      page: "party",
      title: req.user.username + "'s party",
      accessToken: req.user.accessToken,
      partyId: party.UUID.toString(16),
      partyName: party.name,
      url: "http://192.168.1.13:3000/join/" + party.id
    });
    return 0;
  }).catch((err) => {
    console.error(err);
    req.flash("errors", JSON.stringify(err));
    return res.redirect("/");
  });
});

app.get("/auth/spotify/callback", passport.authenticate("spotify", { failureRedirect: "/" }),
  function (req, res) {
    res.redirect("/");
  }
);

app.get("/auth/spotify/refreshAccessToken", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const refreshToken = req.user.refreshToken;
  request.post("https://accounts.spotify.com/api/token", {
    form: {
      grant_type: "refresh_token",
      refresh_token: refreshToken
    },
    headers: {
      Authorization: "Basic " + Buffer.from(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }, (err: any, httpResponse: any, body: any) => {
    if (err) {
      console.error(err);
      res.send(JSON.stringify({ error: "spotify-error", message: err }));
    } else {
      const data = JSON.parse(body);
      req.user.accessToken = data.access_token;
      User.update(
        {
          accessToken: data.access_token
        },
        {
          where: {
            userId: req.user.userId
          }
        });
      res.send(JSON.stringify({ accessToken: data.access_token }));
    }
  });
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

/**
 * API examples routes.
 */
// app.get("/api", apiController.getApi);

main(app);

export default app;