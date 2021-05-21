import express from "express";
import { CommonRequest } from "../types/Types";
import { download, upload } from "../controllers/fileController";

const privateRouter = express.Router();
const publicRouter = express.Router();

/* GET: Get file from database by id */
publicRouter.get("/download/:id", (req, res, next) => download(req as CommonRequest, res, next));

/* POST: upload file to database */
privateRouter.post("/upload", (req, res, next) => upload(req as CommonRequest, res, next));

export { privateRouter as privateFileRouter, publicRouter as publicFileRouter };
