import express from "express";
const privateRouter = express.Router();
const publicRouter = express.Router();
import {
  createMeme,
  getSingleMeme,
  getPublicMemes,
  commentMeme,
  getUserMemes,
} from "../controllers/memes/memeController";
import {
  zipifyFilteredMemes,
  createMemeCollection,
} from "../controllers/memes/memeCollectionsController";
import { CommonRequest } from "../types/Types";
import { likeTempMeme, viewTempMeme } from "../controllers/tempMemeController";

/* GET: all public memes */
publicRouter.get("/", (req, res) => getPublicMemes(req as CommonRequest, res));

/* GET: all memes for specific user */
privateRouter.get("/user/:userId", (req, res) => getUserMemes(req as CommonRequest, res));

/* POST: create meme */
privateRouter.post("/meme", (req, res) => createMeme(req as CommonRequest, res));

/* GET: single meme by id */
privateRouter.get("/meme/:id", (req, res) => getSingleMeme(req as CommonRequest, res));

/* POST: create meme collection by creating new memes from different texts */
privateRouter.post("/meme-collection", (req, res) =>
  createMemeCollection(req as CommonRequest, res)
);

/* GET: create meme collection by filtering memes */
publicRouter.get("/filter-meme-collection", (req, res) =>
  zipifyFilteredMemes(req as CommonRequest, res)
);

/* POST: view meme */
privateRouter.post("/view", (req, res) => viewTempMeme(req as CommonRequest, res, false));

/* POST: like meme */
privateRouter.post("/like", (req, res) => likeTempMeme(req as CommonRequest, res, false));

/* POST: comment meme */
privateRouter.post("/comment", (req, res) => commentMeme(req as CommonRequest, res));

export { privateRouter as privateMemeRouter, publicRouter as publicMemeRouter };
