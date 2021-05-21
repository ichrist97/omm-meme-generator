import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../models/user";
import { CommonRequest } from "../types/Types";
import { IMonkManager } from "monk";
import { NextFunction, Response } from "express";
import { IUser, Secrets } from "meme-generator-lib";
import dotenv from "dotenv";
// read .env config file
dotenv.config();

// time to live for jwt token
const jwtTTL = process.env.JWT_TTL || "60m";

/**
 * Authenticate a JWT token by comparing password with password hash
 * @param req request
 * @param res response
 * @param next next element in middleware chain
 */
const authenticateJWT = async (
  req: CommonRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { accessTokenSecret } = req.secrets;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      req.user = await authenticateJwtFromAuthHeader(authHeader, accessTokenSecret, req.db);
      next();
    } catch (e) {
      res.status(401).json({ msg: "Unknown or outdated Authorization token" });
      return;
    }
  } else {
    res.status(401).json({ msg: "No Authorization token provided" });
  }
};

/**
 * Authenticate a JWT token sent in the query params
 * @param req request
 * @param res response
 * @param next next element in middleware chain
 */
export async function authenticateJwtQueryParams(
  req: CommonRequest,
  res: Response,
  next: NextFunction
): Promise<boolean> {
  // Use authorisation header from param, as html resources don't support bearer tokens natively
  const { accessTokenSecret } = req.secrets;
  const authHeader = <string>req.query.Authorization;
  if (authHeader) {
    try {
      req.user = await authenticateJwtFromAuthHeader(authHeader, accessTokenSecret, req.db);
    } catch (e) {
      res.status(401).json({ msg: "Unknown or outdated Authorization token" });
      return false;
    }
  } else {
    res.status(401).json({ msg: "No Authorization token provided" });
    return false;
  }
  return true;
}

/**
 * Get bearer token from auth header and verify hash
 * @param authHeader auth header from request
 * @param accessTokenSecret secret for tokens
 * @param db database session
 */
export function authenticateJwtFromAuthHeader(
  authHeader: string,
  accessTokenSecret: string,
  db: IMonkManager
): Promise<User> {
  const token = authHeader.split(" ")[1];
  return new Promise((resolve, reject) => {
    jwt.verify(token, accessTokenSecret, async (err, sharedUser) => {
      // error or incorrect hash
      if (err || !sharedUser) {
        return reject(err);
      }
      const user = await User.getUserByName((<IUser>sharedUser).username, db);
      // user not found
      if (user == null) {
        return reject;
      }
      // successful
      return resolve(user);
    });
  });
}

/**
 * Get secrets from database to sign the JWT tokens
 * @param db mongo database instance
 */
const getSecrets = (db: IMonkManager): Promise<Secrets> => {
  const collection = db.get<Secrets>("secrets");
  return collection.find().then((docs) => {
    return docs[0];
  });
};

/**
 * Create a hash for a password
 * @param password some password as a string
 */
const hashPassword = async (password: string): Promise<string | null> => {
  const saltRounds = 10;
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(saltRounds);

    // Hash password
    return await bcrypt.hash(password, salt);
  } catch (error) {
    console.error(error);
  }

  // Return null if error
  return null;
};

/**
 * Compare whether the given password results in the expected hash
 * @param password password from request
 * @param hash hash from database
 */
const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    // Compare password
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error(error);
  }

  // Return false if error
  return false;
};

export { authenticateJWT, jwtTTL, hashPassword, comparePassword, getSecrets };
