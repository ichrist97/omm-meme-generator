import { CommonRequest } from "../types/Types";
import express from "express";
import { Meme } from "../models/meme";
import { ITempMemeExtended } from "../models/tempMeme";
import { Template } from "../models/template";
import { Access, ILike, ITempMeme } from "meme-generator-lib";
import { increaseMemeViewsInDatabase } from "./memes/memeController";
import { increaseTemplateViewsInDatabase } from "./templatesController";
import { IMonkManager } from "monk";
import { Like } from "../models/like";

/**
 * Shared interface method liking memes and templates
 * @param req request
 * @param res response
 * @param isTemplate flag whether is template
 */
export async function likeTempMeme(
  req: CommonRequest,
  res: express.Response,
  isTemplate: boolean
): Promise<void> {
  try {
    // create and upload like to database
    const tempMemeId = isTemplate ? req.body.templateId : req.body.memeId;

    let tempMeme: ITempMemeExtended | null;
    // get instances of meme or template
    if (isTemplate) {
      tempMeme = await Template.getById(tempMemeId, req.db);
    } else {
      tempMeme = await Meme.getById(tempMemeId, req.db);
    }

    // read parameters from request body
    const undoLike = req.body.undo ?? false;
    const userId = req.user.id ?? "";

    // meme not existing
    if (!tempMeme) {
      res.status(400).json({ msg: "Object id not existing" });
      return;
    }

    // undo like
    if (undoLike) {
      const wasRemoved = await tempMeme.undoLike(userId, req.db);
      if (wasRemoved) {
        res.status(200).json({
          msg: "Like was removed",
        });
      } else {
        res.status(200).json({
          msg: "Like not found",
        });
      }
    } else {
      // create new like
      const like = await tempMeme.like(userId, req.db);

      //send response
      res.json({
        msg: like ? "Like for meme got created" : "Like already present",
        data: like,
      });
    }
  } catch (err) {
    res.status(500).json({ msg: err });
  }
}

/**
 * Fetch likes for each given template.
 *
 * @param templates list of templates
 * @param db database session
 */
export async function mapLikes(
  templates: ITempMeme[],
  db: IMonkManager
): Promise<Map<ITempMeme, ILike[]>> {
  const likeMap = new Map();

  for (const template of templates) {
    // map likes
    const likes = await Like.getLikesByTempMemeId(template.id ?? "", db);
    if (likes) {
      const iLikes = likes.map((l) => l.toJSON());
      likeMap.set(template, iLikes);
    }
  }
  return likeMap;
}

/**
 * Shared interface method for liking memes and templates
 * @param req request
 * @param res response
 * @param isTemplate flag whether is template
 */
export async function viewTempMeme(
  req: CommonRequest,
  res: express.Response,
  isTemplate: boolean
): Promise<void> {
  try {
    const tempMemeId = isTemplate ? req.body.templateId : req.body.memeId;
    // Make sure id was provided
    if (!tempMemeId) {
      res.status(400).json({ msg: "ID not provided" });
      return;
    }

    // get instances of meme or template
    let tempMeme: ITempMeme | null;
    if (isTemplate) {
      tempMeme = await Template.getById(tempMemeId, req.db);
    } else {
      tempMeme = await Meme.getById(tempMemeId, req.db);
    }

    // object not existing
    if (!tempMeme) {
      res.status(400).json({ msg: "Object not existing" });
      return;
    }

    // make sure meme is public or user authorized to see meme
    if (tempMeme.access === Access.Private && req.user.id !== tempMeme.owner) {
      res.status(403).json({ msg: "User not authorized" });
      return;
    }

    // increase view counter
    if (isTemplate) {
      await increaseTemplateViewsInDatabase(req.db, tempMeme.id ?? "");
    } else {
      await increaseMemeViewsInDatabase(req.db, tempMeme.id ?? "");
    }
    res.json({ msg: "View counter increased" });
  } catch (err) {
    res.status(500).json({ msg: err });
  }
}
