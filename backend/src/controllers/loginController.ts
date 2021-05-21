import { User } from "../models/user";
import express from "express";
import jwt from "jsonwebtoken";
import { comparePassword, hashPassword, jwtTTL } from "../middleware/auth";
import { CommonRequest } from "../types/Types";
import { AppUser, Tokens } from "meme-generator-lib";
import { IMonkManager } from "monk";

/**
 * Login user by his password and return access and refresh tokens
 * @param req request
 * @param res response
 */
async function login(req: CommonRequest, res: express.Response): Promise<void> {
  // read username and password from request body
  const { username, password } = req.body;
  const { accessTokenSecret, refreshTokenSecret } = req.secrets;

  // read user from database
  const user = await User.getUserByName(username, req.db);

  // mismatch
  if (!user) {
    res.status(403).json({
      msg: "Username or password incorrect",
    });
    return;
  }

  // match password
  const pwMatch = await comparePassword(password, user.password);
  if (pwMatch) {
    // generate an access token
    const accessToken = jwt.sign({ username: user.username }, accessTokenSecret, {
      expiresIn: jwtTTL,
    });
    // generate refresh token
    const refreshToken = jwt.sign({ username: user.username }, refreshTokenSecret);
    addRefreshToken(req.db, refreshToken);

    const tokens: Tokens = { accessToken, refreshToken };
    const appUser: AppUser = {
      ...user.toJSON(),
      tokens: tokens,
    };
    res.json(appUser);
    return;
  } else {
    res.status(403).json({
      msg: "Username or password incorrect",
    });
  }
}

/**
 * Get instance of currently logged in user
 * @param req request
 * @param res response
 */
export async function getUser(req: CommonRequest, res: express.Response): Promise<void> {
  if (!req.user) {
    res.status(403).json({
      msg: "Token invalid or outdated",
    });
    return;
  }
  res.json(req.user);
}

/**
 * Generate new access token using the refresh token
 * @param req request
 * @param res response
 */
async function refreshToken(req: CommonRequest, res: express.Response): Promise<void> {
  const { token } = req.body;
  const { accessTokenSecret, refreshTokenSecret } = req.secrets;

  // no token was sent
  if (!token) {
    res.status(422).json({ msg: "No token was sent" });
    return;
  }

  // token does not exist
  getRefreshToken(req.db, token).then((refreshToken) => {
    if (!refreshToken) {
      res.status(403).json({
        msg: "Token invalid",
      });
      return;
    }

    jwt.verify(token, refreshTokenSecret, (err, user) => {
      // token is invalid
      if (err) {
        res.status(403).json({
          msg: "Token invalid",
        });
        return;
      }

      // new access token
      const accessToken = jwt.sign({ username: user.username }, accessTokenSecret, {
        expiresIn: jwtTTL,
      });

      res.json({
        accessToken,
      });
    });
  });
}

/**
 * Logout the user by invalidating his refresh token
 * @param req request
 * @param res response
 */
function logout(req: CommonRequest, res: express.Response): void {
  const { token } = req.body;
  removeRefreshToken(req.db, token); // deactivate refresh token
  res.json({ msg: "Logout successful" });
}

/**
 * Register new user with supplied username and password
 * Save hash of password in database
 * @param req request
 * @param res response
 */
async function registerUser(req: CommonRequest, res: express.Response): Promise<void> {
  // read username and password from request body
  const { username, password } = req.body;

  // parameters missing
  if (!username || !password) {
    res.sendStatus(400);
    return;
  }

  // check if user already exists
  const exists = await User.getUserByName(username, req.db);
  if (exists) {
    res.json({
      msg: "User already exists",
    });
    return;
  }

  // create user
  const pwHash = await hashPassword(password);
  const user = new User(username);
  user.password = pwHash ?? "";
  await user.register(req.db);

  res.json({
    msg: `Created user: ${username}`,
  });
}

/**
 * Add new refresh token to active refresh tokens in database
 * @param db database session
 * @param token refresh jwt token
 */
function addRefreshToken(db: IMonkManager, token: string) {
  const refreshTokens = db.get("refreshTokens");
  refreshTokens
    .insert({ token })
    .then()
    .catch((err: Error) => console.error(err));
}

/**
 * Find refresh token in database
 * @param db database session
 * @param token refresh token
 */
async function getRefreshToken(db: IMonkManager, token: string): Promise<any> {
  // get specific refresh token
  const refreshTokens = db.get("refreshTokens");
  return refreshTokens
    .find({ token: token })
    .then((docs) => {
      return docs;
    })
    .catch((err: Error) => {
      console.error(err);
    });
}

/**
 * Remove refresh token from active refresh tokens in database
 * @param db database session
 * @param token refresh token
 */
function removeRefreshToken(db: IMonkManager, token: string) {
  const refreshTokens = db.get("refreshTokens");
  refreshTokens
    .remove({ token: token })
    .then(() => console.log("Removed refresh token."))
    .catch((err: Error) => console.error(err));
}

export { login, refreshToken, logout, registerUser };
