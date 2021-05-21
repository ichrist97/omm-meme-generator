import express from "express";
import { CommonRequest } from "../../types/Types";
import JSZip from "jszip";
import { binaryToBase64, Caption, MediaType, Access } from "meme-generator-lib";
import { Template } from "../../models/template";
import { MemeFile } from "../../models/file";
import { validateCaptions } from "../../util/captions";
import { getFileById } from "../fileController";
import { handleQueries, queryPublicMemes, mapComments, filterMemes } from "./memeController";
import { Meme } from "../../models/meme";
import { IMonkManager } from "monk";
import { mapLikes } from "../tempMemeController";

/**
 * Create meme collection as a zip folder containing a newly created meme for each provided caption
 * @param req request
 * @param res response
 */
async function createMemeCollection(req: CommonRequest, res: express.Response): Promise<void> {
  try {
    // make sure all params are given
    if ((!req.body.template && !req.files) || !req.body.captions) {
      res.status(400).json({ msg: "Bad request: Parameters missing" });
      return;
    }

    // read captions from request body
    const captions: Caption[] = JSON.parse(req.body.captions);
    if (!validateCaptions(captions, MediaType.Image)) {
      res.status(400).json({ msg: "Bad request - invalid captions" });
      return;
    }

    // optional params
    const access = req.body.access ?? Access.Private;
    const name = req.body.name ?? "Untitled";

    // template was supplied as a file, then take binary data from file else fetch file from db
    let templateBuffer: Buffer | null;

    // get template reference
    if (req.files && req.files.template) {
      const mimeType = req.files.template.mimetype;
      const tmpMediaType = MemeFile.getMediaType(mimeType);
      if (!tmpMediaType) {
        // fallback
        res.status(400).json({ msg: "Invalid mimetype of file." });
        return;
      }
      templateBuffer = req.files.template.data;
    } else if (req.body.template) {
      const template = await Template.getById(req.body.template, req.db);
      if (!template) {
        res.status(500).json({ msg: "Could not fetch template" });
        return;
      }

      const templateFile = await getFileById(req.db, template.url);
      templateBuffer = templateFile ? templateFile.data.buffer : null;
    } else {
      // fallback
      res.status(400).json({ msg: "Invalid template" });
      return;
    }

    if (!templateBuffer) {
      res.status(500).json({ msg: "Could not fetch template" });
      return;
    }

    // render memes
    const memes: Array<Meme> = [];
    for (const caption of captions) {
      const meme = new Meme(name, access ?? Access.Private, req.user.id ?? "");
      meme.mediaType = MediaType.Image;
      meme.dataBuffer = await Meme.render(templateBuffer, [caption]);
      memes.push(meme);
    }

    // Upload to database
    await uploadMemeBulkToDatabase(req.db, memes);

    // create and send zip as binary
    await sendZip(
      memes.map((m) => {
        return {
          mimeType: "image/jpeg",
          buffer: m.dataBuffer,
        };
      }),
      req,
      res
    );
  } catch (err) {
    res.status(500).json({ msg: err });
  }
}

/**
 * Upload multiple memes to database
 * @param db database session
 * @param memes list of memes
 */
async function uploadMemeBulkToDatabase(db: IMonkManager, memes: Meme[]): Promise<void> {
  // upload files and memes
  memes.forEach((meme) => meme.uploadToDatabase(db, MediaType.Image));
}

/**
 * Get memes from database by filtering parameters and then create a collection from these memes as
 * a zip folder
 * @param req request
 * @param res response
 */
async function zipifyFilteredMemes(req: CommonRequest, res: express.Response): Promise<void> {
  // read query parameters
  const query = handleQueries(req);
  if (!query) {
    res.status(400).json({ msg: "Invalid query" });
    return;
  }

  // get all public memes from database
  const memes = await queryPublicMemes(req.db, Number.MAX_SAFE_INTEGER);
  if (!memes) {
    res.status(500).json({ msg: "Failed fetching memes from database" });
    return;
  }
  // map likes and comments to each meme so we can filter the memes later
  const commentMap = await mapComments(memes, req.db);
  const likeMap = await mapLikes(memes, req.db);

  // filter memes according to query
  const filtered = filterMemes(memes, likeMap, commentMap, query);
  // set limit
  const filteredLimit = filtered.slice(0, query.limit != null ? query.limit : filtered.length);

  // get all images files for memes
  const fileIds = filteredLimit.map((meme) => meme.url);
  const getFiles = async () => {
    return Promise.all(fileIds.map((id) => getFileById(req.db, id ?? "")));
  };
  const memeArray = (await getFiles())
    .filter((f) => f !== undefined && f !== null)
    .map((f) => {
      return {
        mimeType: (f as MemeFile).mimetype,
        buffer: (f as MemeFile).data.buffer,
      };
    });

  // create and send zip as binary
  await sendZip(memeArray, req, res);
}

/**
 * Create a zip containing the meme images and send the zip as a binary
 * @param buffers list of buffers containing the meme images
 * @param req request
 * @param res response
 */
async function sendZip(
  buffers: Array<{ mimeType: string; buffer: Buffer }>,
  req: CommonRequest,
  res: express.Response
) {
  // flag to force client to downlaod the binary
  let forceDownload = false;
  if (req.query.force && req.query.force == "true") {
    forceDownload = true;
  }

  // zipify
  const zip = new JSZip();
  const zipFolder = zip.folder("memes");

  // append each meme image to the zip
  buffers.forEach((memeBuffer, index) => {
    if (memeBuffer) {
      const type = MemeFile.getFileExtension(memeBuffer.mimeType);
      const base64 = binaryToBase64(memeBuffer.buffer);
      if (zipFolder != null) {
        zipFolder.file(`meme${index}.${type}`, base64, { base64: true });
      }
    }
  });

  try {
    // generate and send zip
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    if (forceDownload) {
      const fileName = new Date().toISOString() + "_filtered-meme-collection.zip";
      // Force browser to open download option
      res.set("Content-Disposition", `attachment;filename=${fileName}`);
    }
    res.setHeader("Content-Type", "application/zip");
    res.end(zipBuffer);
  } catch (e) {
    res.status(500).json({ msg: "Could not create zip archive" });
    return;
  }
}

export { zipifyFilteredMemes, createMemeCollection };
