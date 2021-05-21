import express, { NextFunction } from "express";
import { CommonRequest, IFile } from "../types/Types";
import { IMonkManager } from "monk";
import { UploadedFile } from "express-fileupload";
import { Access } from "meme-generator-lib";
import { Binary, ObjectId } from "mongodb";
import { User } from "../models/user";
import { authenticateJwtQueryParams } from "../middleware/auth";
import { MemeFile } from "../models/file";

/**
 * Upload files to database
 * @param req request
 * @param res response
 * @param next next element in middleware chain
 */
async function upload(
  req: CommonRequest,
  res: express.Response,
  next: NextFunction
): Promise<void> {
  // verify request body
  const ids: string[] = [];
  const user = req.user;
  if (!user) {
    res.status(400).json({ msg: "User not existing" });
    return;
  }

  // set access
  let access = Access.Public;
  if (req.body.access) {
    access = <Access>req.body.access;
  }

  // upload each file from request
  for (const uploadedFile of Object.values(req.files)) {
    if (Array.isArray(uploadedFile)) {
      for (const file of uploadedFile) {
        const dbRes = await postFileToDatabase(req.db, file, access, user);
        if (dbRes.id) {
          ids.push(dbRes.id);
        }
      }
    } else {
      const dbRes = await postFileToDatabase(req.db, uploadedFile, access, user);
      if (dbRes.id) {
        ids.push(dbRes.id);
      }
    }
  }
  res.status(200).json(ids);
}

/**
 * Save and prepared uploaded file from express-fileupload to File object
 * Use this method when receiving only the image itself
 * @param db database session
 * @param file uploaded file
 * @param access accessType
 * @param owner user who is owner
 */
export async function postFileToDatabase(
  db: IMonkManager,
  file: UploadedFile,
  access: Access = Access.Public,
  owner?: User
): Promise<IFile> {
  return await saveFileToDatabase(db, prepareFile(file, owner, access));
}

/**
 * Save file directly to database with complete file object
 * @param db database session
 * @param file IFile instance
 */
export async function saveFileToDatabase(db: IMonkManager, file: IFile): Promise<IFile> {
  const fileCollection = db.get<IFile>("files");
  const inserted = await fileCollection.insert(file);
  inserted.id = inserted._id.toString();
  return inserted;
}

/**
 * Prepare file for uploading by migrating uploaded file to IFile interface
 * @param file uploaded file
 * @param user user who uploaded file
 * @param isPublic flag whether file shall be public
 */
function prepareFile(file: UploadedFile, user?: User, isPublic: Access = Access.Public): IFile {
  const newFile: IFile = {
    name: file.name,
    encoding: file.encoding,
    mimetype: file.mimetype,
    data: new Binary(file.data),
    tempFilePath: file.tempFilePath,
    truncated: file.truncated,
    size: file.size,
    md5: file.md5,
    dateCreated: new Date(), // TODO if overwrite previous file, do not change
    dateModified: new Date(),
    access: isPublic,
  };
  // set user
  if (user) {
    newFile.owner = user.id ?? "";
  }
  return newFile;
}

/**
 * Download file from database
 * Private file can only be downloaded by owner of the file
 * @param req request
 * @param res response
 * @param next next element in middleware chain
 */
async function download(
  req: CommonRequest,
  res: express.Response,
  next: NextFunction
): Promise<void> {
  // Make sure id was provided
  if (!req.params["id"]) {
    res.status(400).json({ msg: "ID not provided" });
    return;
  }

  // force download in browser
  let forceDownload = false;
  if (req.query.force && req.query.force == "true") {
    forceDownload = true;
  }

  // fetch file from database
  const id = req.params["id"];
  const file = await getFileById(req.db, id);

  // file not existing
  if (!file) {
    res.status(400).json({ msg: "File not existing" });
    return;
  }

  // make sure file is public / unlisted or user authorized to see file
  if (file.access === Access.Private) {
    // Use authorisation header from param, as html resources don't support bearer tokens natively
    if (!(await authenticateJwtQueryParams(req, res, next))) {
      res.status(403).json({ msg: "Authorization rejected for this resource" });
      return;
    }
    if (req.user.id != file.owner) {
      res.status(403).json({ msg: "Authorization rejected for this resource" });
      return;
    }
  }

  if (forceDownload) {
    // Force browser to open download option
    res.set("Content-Disposition", `attachment;filename=${file.name}`);
  }
  res.setHeader("Content-Type", file.mimetype);
  res.end(file.data.buffer);
}

/**
 * Get instance of MemeFile by its id from database
 * @param db database session
 * @param fileId id of file
 */
async function getFileById(db: IMonkManager, fileId: string): Promise<MemeFile | null> {
  try {
    const files = db.get<IFile>("files");
    const doc = await files.findOne({ _id: new ObjectId(fileId) });
    if (doc) {
      return MemeFile.assign(doc);
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

export { download, upload, getFileById };
