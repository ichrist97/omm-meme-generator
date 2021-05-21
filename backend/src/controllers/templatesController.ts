import express from "express";
import { CommonRequest, IFile } from "../types/Types";
import fetch from "node-fetch";
import md5 from "md5";
import { FindResult, IMonkManager, WithID } from "monk";
import { postFileToDatabase, saveFileToDatabase } from "./fileController";
import { User } from "../models/user";
import { Binary } from "mongodb";
import captureWebsite from "capture-website";
import { Access, ILike, ITemplate, ITempMeme, MediaType, MemeProvider } from "meme-generator-lib";
import { Template } from "../models/template";
import { MemeFile } from "../models/file";
import { mapLikes } from "./tempMemeController";
import { Like } from "../models/like";

/**
 * Fetch templates from database and filter them by query parameters
 * @param req request
 * @param res response
 */
async function getTemplatesFromDatabase(req: CommonRequest, res: express.Response): Promise<void> {
  // query
  const limitQuery = req.query.limit as string;
  const typeQuery = req.query.type as string;
  const access = (req.query.access as Access) ?? Access.Public;

  const query: {
    owner?: string;
    access?: Access;
    type?: string;
  } = {};

  if (typeQuery) {
    if (MemeFile.isMediaTypeSupported(typeQuery)) {
      query.type = typeQuery;
    } else {
      res.status(415).json({ msg: "Media type not supported" });
      return;
    }
  }

  // set access
  if (access === Access.Private) {
    query.owner = req.user.id?.toString();
    query.access = Access.Private;
  } else {
    query.access = Access.Public;
  }

  // database
  const templateCollection = req.db.get<ITemplate>("templates");
  try {
    // query for type set
    const iTemplates: FindResult<ITemplate> = await templateCollection.find(query, {
      limit: limitQuery ? parseInt(limitQuery) : Number.MAX_SAFE_INTEGER,
    });
    const templates = await Promise.all(iTemplates.map((t) => Template.assign(t, req.db)));

    const likesMap = await mapLikes(templates, req.db);

    // append likes to template
    const relationTemplates = templates.map((t) => {
      const likes = likesMap.get(t);

      // prepare for response
      t.alterImgUrl(req.protocol, req.headers.host);
      const templateRelations: ITempMeme = { ...t.toJSON(), likes };
      return templateRelations;
    });

    res.json(relationTemplates);
  } catch (e) {
    console.error(e);
  }
}

/**
 * Fetches single template from the database by its id
 * @param req request
 * @param res response
 */
async function getSingleTemplate(req: CommonRequest, res: express.Response): Promise<void> {
  try {
    // Make sure id was provided
    if (!req.params["id"]) {
      res.status(400).json({ msg: "ID not provided" });
      return;
    }

    const id = req.params["id"];
    const template = await Template.getById(id, req.db);
    if (!template) {
      res.status(400).json({ msg: "Template not existing" });
      return;
    }

    // make sure template is public or user authorized to see template
    if (template.access === Access.Private && (!req.user || req.user.id !== template.owner)) {
      res.status(403).json({ msg: "User not authorized" });
      return;
    }

    const likes = await Like.getLikesByTempMemeId(template.id ?? "", req.db);
    let iLikes: ILike[] = [];
    if (likes) {
      iLikes = likes.map((l) => l.toJSON());
    }

    // prepare template url
    template.alterImgUrl(req.protocol, req.headers.host);

    const templateRelations: ITemplate = {
      ...template.toJSON(),
      likes: iLikes,
    };
    res.json({ msg: "Ok", data: templateRelations });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}

/**
 * Interface for handling Imgflip templates
 */
interface ImgFlipTemplate {
  id: number;
  name: string;
  url: string;
  width: number;
  height: number;
}

/**
 * Fetch popular template from the Imgflip API
 * @param req request
 * @param res response
 */
async function getTemplatesFromImgflip(req: express.Request, res: express.Response): Promise<void> {
  // fetch from api
  const api = "https://api.imgflip.com/get_memes";
  const apiRes = await fetch(api);
  const imgFlipTemplates: ImgFlipTemplate[] = (await apiRes.json()).data.memes;

  // map each template to interface
  const iTemplates = imgFlipTemplates.map(
    (t): ITemplate => {
      return {
        id: String(t.id),
        name: t.name,
        url: t.url,
        width: t.width,
        height: t.height,
        access: Access.Public,
        mediaType: MediaType.Image,
        createdAt: new Date(),
        provider: MemeProvider.ImgFlip,
      };
    }
  );
  res.json(iTemplates);
}

/**
 * Upload template to database by referencing to an URL containing an image
 * @param req request
 * @param res response
 */
async function uploadTemplateFromUrl(req: CommonRequest, res: express.Response): Promise<void> {
  const targetURL: string | null = req.body.url;
  if (!targetURL) {
    // the request was made without the "url" query parameter.
    res.status(400).json({
      msg: 'Parameter "url" missing.',
    });
    return;
  }

  // extract filename from url
  const fileName = MemeFile.parseToFileName(targetURL);

  // set access
  let access = Access.Private;
  if (req.body.access) {
    access = <Access>req.body.access;
  }

  // if name in params specified then take name else take filename of url
  let templateName: string;
  if (req.body.name) {
    templateName = <string>req.body.name;
  } else {
    templateName = fileName;
  }

  try {
    const response = await fetch(targetURL);
    const mimeType = response.headers.get("content-type") ?? "image/png";

    // verify mediatype of image
    const mediaType = MemeFile.getMediaType(mimeType);
    if (!MemeFile.isMediaTypeSupported(mediaType)) {
      res.status(415).json({
        msg: "Media Type is not supported.",
      });
      return;
    }

    // upload file and template to database
    const imgBuffer = await response.buffer();
    const iTemplate = await uploadTemplateAndFileToDatabase(
      req.db,
      templateName,
      fileName,
      imgBuffer,
      mimeType,
      access,
      req.user
    );

    if (!iTemplate) {
      res.status(500).json({ msg: "Failed uploading template" });
      return;
    }

    const newTemplate = await Template.assign(iTemplate as WithID<ITemplate>, req.db);
    newTemplate.alterImgUrl(req.protocol, req.headers.host);

    res.json({
      msg: "created new download",
      template: newTemplate,
    });
  } catch (e) {
    // send the response here.
    res.status(500).json({
      msg: "could not create download",
      reason: e.toString(),
    });
  }
}

/**
 * Upload new template by taking screenshot of provided URL
 * @param req request
 * @param res response
 */
async function uploadTemplateFromScreenshot(
  req: CommonRequest,
  res: express.Response
): Promise<void> {
  const targetURL: string | null = req.body.url;
  if (!targetURL) {
    // the request was made without the "url" query parameter.
    res.status(400).json({
      msg: 'Parameter "url" missing.',
    });
    return;
  }

  // exttract filename
  const fileName = MemeFile.parseToFileName(targetURL);

  // set access
  let access = Access.Private;
  if (req.body.access) {
    access = <Access>req.body.access;
  }

  // if name in params specified then take name else take filename of url
  let templateName: string;
  if (req.body.access) {
    templateName = <string>req.body.name;
  } else {
    templateName = fileName;
  }

  const mimeType = "image/png";

  // capture screenshot and upload to database
  try {
    const imgBuffer = await captureWebsite.buffer(targetURL);
    const iTemplate = await uploadTemplateAndFileToDatabase(
      req.db,
      templateName,
      fileName,
      imgBuffer,
      mimeType,
      access,
      req.user
    );

    if (!iTemplate) {
      res.status(500).json({ msg: "Failed uploading template" });
      return;
    }

    const newTemplate = await Template.assign(iTemplate as WithID<ITemplate>, req.db);
    newTemplate.alterImgUrl(req.protocol, req.headers.host);

    res.json({
      msg: "created new screenshot",
      template: newTemplate,
    });
  } catch (e) {
    // send the response here.
    res.status(500).json({
      msg: "could not create screenshot",
      reason: e.toString(),
    });
  }
}

/**
 * Upload new template file to database
 * @param req request
 * @param res response
 */
async function uploadTemplate(req: CommonRequest, res: express.Response): Promise<void> {
  try {
    if (!req.files || !req.files.template || !req.body.name) {
      res.status(400).json({ msg: "No file uploaded or template information missing" });
      return;
    }

    // template file uploaded
    // Use the name of the input field ("template") to retrieve the uploaded file
    const template = req.files.template;

    // verify mediatype
    if (!MemeFile.isMediaTypeSupported(MemeFile.getMediaType(template.mimetype))) {
      res.status(415).json({
        msg: "Media Type is not supported.",
      });
      return;
    }

    // read other parameters from request body
    const name = req.body.name;
    const access = <Access>req.body.access ?? Access.Public;

    // Upload template to database
    const savedFile = await postFileToDatabase(req.db, template, access, req.user);
    const iTemplate = await uploadTemplateToDatabase(
      req.db,
      name,
      savedFile.id ?? "",
      template.mimetype,
      access,
      req.user
    );

    if (!iTemplate) {
      res.status(500).send({ msg: "Failed uploading template" });
      return;
    }

    const newTemplate = await Template.assign(iTemplate as WithID<ITemplate>, req.db);
    newTemplate.alterImgUrl(req.protocol, req.headers.host);

    //send response
    res.json({
      msg: "File is uploaded",
      template: newTemplate,
    });
  } catch (err) {
    res.status(500).json({ msg: err });
  }
}

/**
 * Upload file and template to database
 * @param db database session
 * @param templateName name of template
 * @param fileName filename of template
 * @param imgBuffer binary buffer of image
 * @param mimeType mimetype of image
 * @param access access level of template
 * @param user user who uploaded template
 */
async function uploadTemplateAndFileToDatabase(
  db: IMonkManager,
  templateName: string,
  fileName: string,
  imgBuffer: Buffer,
  mimeType: string,
  access: Access,
  user: User
): Promise<WithID<ITemplate> | null> {
  // setup file
  const dbFile: IFile = {
    data: new Binary(imgBuffer),
    dateCreated: new Date(),
    dateModified: new Date(),
    encoding: "base64",
    md5: md5(imgBuffer),
    mimetype: mimeType,
    name: fileName + "." + MemeFile.getFileExtension(mimeType),
    owner: user.id?.toString(),
    size: imgBuffer.byteLength,
    tempFilePath: "",
    truncated: false,
    access: access,
  };
  // upload file to database
  const savedFile = await saveFileToDatabase(db, dbFile);
  // upload template to database
  return await uploadTemplateToDatabase(
    db,
    templateName,
    savedFile.id ?? "",
    mimeType,
    access,
    user
  );
}

/**
 * Upload only template to database without uploading the image file
 * @param db database session
 * @param name name of template
 * @param url url of template file
 * @param mimetype mimetype of image
 * @param access access level of template
 * @param owner user who uploaded template
 */
export async function uploadTemplateToDatabase(
  db: IMonkManager,
  name: string,
  url: string,
  mimetype: string,
  access: Access = Access.Public,
  owner?: User
): Promise<WithID<ITemplate> | null> {
  // setup template type
  const templateType = MemeFile.getMediaType(mimetype);
  // invalid mediatype
  if (!templateType) {
    return null;
  }

  // upload to database database
  const templates = db.get<ITemplate>("templates");
  const item: ITemplate = {
    name,
    url,
    access,
    mediaType: templateType,
    owner: owner?.id ?? "",
    createdAt: new Date(),
    views: 0,
  };
  const inserted = await templates.insert(item);
  inserted.id = inserted._id.toString();
  return inserted;
}

/**
 * Increase view counter of template
 * @param db database session
 * @param templateId id of template
 */
export async function increaseTemplateViewsInDatabase(
  db: IMonkManager,
  templateId: string
): Promise<void> {
  const template = await Template.getById(templateId, db);
  if (template) {
    await template.view(db);
  }
}

export {
  getTemplatesFromDatabase,
  getTemplatesFromImgflip,
  uploadTemplate,
  uploadTemplateFromUrl,
  uploadTemplateFromScreenshot,
  getSingleTemplate,
};
