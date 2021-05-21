import express from "express";
import { IMonkManager } from "monk";
import { Authorization, Secrets, StringId, MediaType } from "meme-generator-lib";
import { UploadedFile } from "express-fileupload";
import { Binary } from "mongodb";
import { User } from "../models/user";

/**
 * Bundle express request with database reference, user object and secrets into interface
 */
export interface CommonRequest extends express.Request {
  files: { [key: string]: UploadedFile };
  db: IMonkManager;
  user: User;
  secrets: Secrets;
}

/**
 * Interface for media files
 */
export interface IFile extends Authorization, StringId {
  /** file name */
  name: string;
  /** Encoding type of the file */
  encoding: string;
  /** The mimetype of your file */
  mimetype: string;
  /** A buffer representation of your file, returns empty buffer in case useTempFiles
   * option was set to true. */
  data: Binary;
  /** A path to the temporary file in case useTempFiles option was set to true. */
  tempFilePath: string;
  /** A boolean that represents if the file is over the size limit */
  truncated: boolean;
  /** Uploaded size in bytes */
  size: number;
  /** MD5 checksum of the uploaded file */
  md5: string;
  /** creation date */
  dateCreated: Date;
  /** last modified at */
  dateModified: Date;
}

/**
 * Interface for query parameters when searching memes
 *
 * @param views min number of views
 * @param likesCount min number of likes
 * @param createdAfter needs to created after this date
 * @param createdBefore needs to created before this date
 * @param mediaType wanted mediaType of meme
 * @param commentsCount min number of comments
 */
export interface MemeQuery {
  name?: string | null;
  limit?: number | null;
  likesCount?: number | null;
  viewsCount?: number | null;
  commentsCount?: number;
  createdAfter?: Date | null;
  createdBefore?: Date | null;
  mediaType?: MediaType | null;
  template?: string | null;
  viewsSort?: boolean | null;
  likesSort?: boolean | null;
  createdSort?: boolean | null;
  commentsSort?: boolean | null;
  tags?: string[] | null;
}
