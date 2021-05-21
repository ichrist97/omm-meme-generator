import express from "express";
const privateRouter = express.Router();
const publicRouter = express.Router();
import {
  getTemplatesFromDatabase,
  getTemplatesFromImgflip,
  uploadTemplate,
  uploadTemplateFromUrl,
  uploadTemplateFromScreenshot,
  getSingleTemplate,
} from "../controllers/templatesController";
import { CommonRequest } from "../types/Types";
import { likeTempMeme, viewTempMeme } from "../controllers/tempMemeController";

/* GET: all meme templates from database */
privateRouter.get("/", (req, res) => getTemplatesFromDatabase(req as CommonRequest, res));

/* GET: single template by id */
privateRouter.get("/template/:id", (req, res) => getSingleTemplate(req as CommonRequest, res));

/* POST: upload template file to database */
privateRouter.post("/", (req, res) => uploadTemplate(req as CommonRequest, res));

/* POST: upload template from URL to database */
privateRouter.post("/url", (req, res) => uploadTemplateFromUrl(req as CommonRequest, res));

/* POST: upload template from screenshot to database */
privateRouter.post("/screenshot", (req, res) =>
  uploadTemplateFromScreenshot(req as CommonRequest, res)
);

/* GET: meme templates from imgflip API */
privateRouter.get("/imgflip", (req, res) => getTemplatesFromImgflip(req as CommonRequest, res));

/* POST: view template */
privateRouter.post("/view", (req, res) => viewTempMeme(req as CommonRequest, res, true));

/* POST: like template */
privateRouter.post("/like", (req, res) => likeTempMeme(req as CommonRequest, res, true));

export { privateRouter as privateTemplateRouter, publicRouter as publicTemplateRouter };
