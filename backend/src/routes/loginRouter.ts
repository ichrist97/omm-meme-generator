import express from "express";

const publicRouter = express.Router();
const privateRouter = express.Router();

import { login, refreshToken, logout, registerUser, getUser } from "../controllers/loginController";
import { CommonRequest } from "../types/Types";

/* POST: login with credentials and receive JWT token */
publicRouter.post("/", (req, res) => login(req as CommonRequest, res));

/* GET: the current user of given auth header */
privateRouter.get("/user", (req, res) => getUser(req as CommonRequest, res));

/* POST: refresh jwt token */
publicRouter.post("/refresh", (req, res) => refreshToken(req as CommonRequest, res));

/* POST: logout and expire jwt token */
privateRouter.post("/logout", (req, res) => logout(req as CommonRequest, res));

/* POST: register new user */
publicRouter.post("/register", (req, res) => registerUser(req as CommonRequest, res));

export { publicRouter as publicLoginRouter, privateRouter as privateLoginRouter };
