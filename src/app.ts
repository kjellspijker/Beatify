import express from "express";
import compression from "compression";  // compresses requests
import session from "express-session";
import bodyParser from "body-parser";
import logger from "./util/logger";
import lusca from "lusca";
import dotenv from "dotenv";
import mongo from "connect-mongo";
import flash from "express-flash";
import path from "path";
import mongoose from "mongoose";
import passport from "passport";
import expressValidator from "express-validator";
import bluebird, { any } from "bluebird";
import { default as User, UserModel } from "./models/User";
import { default as Party, PartyModel } from "./models/Party";
import { default as Queue, QueueModel } from "./models/Queue";
import { MONGODB_URI, SESSION_SECRET } from "./util/secrets";
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_CALLBACK_URL } from "./util/secrets";
import { main } from "./util/websocket";
const SpotifyStrategy = require("passport-spotify").Strategy;
const randToken = require("rand-token");

const MongoStore = mongo(session);

// Load environment variables from .env file, where API keys and passwords are configured
dotenv.config({ path: ".env" });

// Controllers (route handlers)
import * as homeController from "./controllers/home";
import * as partyController from "./controllers/partyController";
import { MongoError } from "mongodb";

// Create Express server
const app = express();

// Connect to MongoDB
const mongoUrl = MONGODB_URI;
(<any>mongoose).Promise = bluebird;
mongoose.connect(mongoUrl, { useMongoClient: true }).then(
  () => { /** ready to use. The `mongoose.connect()` promise resolves to undefined. */ },
).catch(err => {
  console.log("MongoDB connection error. Please make sure MongoDB is running. " + err);
  // process.exit();
});

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
  store: new MongoStore({
    url: mongoUrl,
    autoReconnect: true
  })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));
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

app.use(
  express.static(path.join(__dirname, "public"), { maxAge: 31557600000 })
);

passport.serializeUser(function (user: UserModel, done) {
  done(undefined, user.id);
});

passport.deserializeUser(function (spotifyId, done) {
  User.findOne({spotifyId: spotifyId}, function(err, user) {
    done(err, user);
  });
});

passport.use(new SpotifyStrategy(
  {
    clientID: SPOTIFY_CLIENT_ID,
    clientSecret: SPOTIFY_CLIENT_SECRET,
    callbackURL: SPOTIFY_CALLBACK_URL
  },
  function (accessToken: string, refreshToken: string, expires_in: number, profile: any, done: any) {
    User.findOne({spotifyId: profile.id}, function (err, user) {
      if (err) {
        return done(err);
      }
      if (!user) {
        user = new User({
          username: profile.username,
          email: profile.emails[0].value,
          country: profile.country,
          spotifyId: profile.id
        });
        user.save(function(err) {
          if (err) console.log(err);
          return done(err, user);
        });
      } else {
        return done(err, user);
      }
    });
    process.nextTick(function () {
      return done(undefined, profile);
    });
  }
));

/**
 * Primary app routes.
 */
app.get("/", homeController.index);
// app.get("/login", homeController.login);
app.get("/join/:id", partyController.join);
app.get("/create", partyController.create);
app.get("/auth/spotify", passport.authenticate("spotify", {
  scope: ["user-read-email", "user-read-private"]
}), function (req, res) {

});
const pid = 2;

app.get("/party/:id", function (req, res) {
  Party.findOne({owner: req.params.id}, async function (err, party: PartyModel) {
    if (err) {
      req.flash("errors", err);
      return res.redirect("/");
    }
    if (!party) {
      await generateParty(req.params.id).then(function(p: PartyModel) {
        party = p;
      });
  }
    res.render("party", {
      page: "party",
      title: req.user.username + "'s party",
      partyId: party.get("partyId"),
      partyName: party.get("name"),
      url: "http://192.168.1.13:3000/join/" + party.id
    });
    return 0;
  });
});

async function generateParty(userId: string): Promise<mongoose.Document> {
  const party = new Party({
    owner: userId,
    partyId: randToken.generate(8, "0123456789"),
    name: "TestName"
  });
  return await party.save().then((saved) => {
    return party;
  }).catch((err) => {
    return generateParty(userId);
  });
}

app.get("/auth/spotify/callback", passport.authenticate("spotify", { failureRedirect: "/" }),
  function (req, res) {
    res.redirect("/");
  }
);

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