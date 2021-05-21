import { IFile } from "../types/Types";
import { Access, MediaType } from "meme-generator-lib";
import { Binary, ObjectId } from "mongodb";
import { IObjectID, WithID } from "monk";

/**
 * Class for MemeFile representing a media file like an image or video
 */
export class MemeFile implements IFile {
  public _id?: IObjectID | null;
  access: Access;
  data: Binary;
  dateCreated: Date;
  dateModified: Date;
  encoding: string;
  md5: string;
  mimetype: string;
  name: string;
  owner?: string | null;
  size: number;
  tempFilePath: string;
  truncated: boolean;

  /**
   * STATIC METHODS
   */

  /**
   * Get abstract media type of meme file
   * Possible media types: Image, Video, GIF
   * @param mimeType mimeType of memeFile
   */
  public static getMediaType(mimeType: string | null = null): MediaType | null {
    if (!mimeType) return null;
    if (mimeType === "image/gif") {
      return MediaType.GIF;
    } else if (mimeType.startsWith("image")) {
      return MediaType.Image;
    } else if (mimeType.startsWith("video")) {
      return MediaType.Video;
    }
    return null;
  }

  /**
   * Check if media type is supported by backend
   * @param type mediaType
   */
  public static isMediaTypeSupported(type: MediaType | string | null = null): boolean {
    if (!type) return false;
    return type === MediaType.Image || type === MediaType.GIF || type === MediaType.Video;
  }

  /**
   * Get file extension of file
   * @param mimeType mimeType of file
   */
  public static getFileExtension(mimeType: string): string {
    return mimeType.replace(/^(.*)\//gi, "");
  }

  /**
   * Extracts filename from complete URL
   * @param text URL
   */
  public static parseToFileName(text: string): string {
    return text.replace(/(^http[s]?:\/\/)|[./\\]/gi, "");
  }

  constructor(
    access: Access,
    data: Binary,
    dateCreated: Date,
    dateModified: Date,
    encoding: string,
    md5: string,
    mimetype: string,
    name: string,
    size: number,
    tempFilePath: string,
    truncated: boolean,
    owner?: string | null
  ) {
    this.access = access;
    this.data = data;
    this.dateCreated = dateCreated;
    this.dateModified = dateModified;
    this.encoding = encoding;
    this.md5 = md5;
    this.mimetype = mimetype;
    this.name = name;
    this.size = size;
    this.tempFilePath = tempFilePath;
    this.truncated = truncated;
    this.owner = owner;
  }

  /**
   * Assign IFile interface to MemeFile object
   * @param iFile interface instance of IFile
   */
  public static assign(iFile: WithID<IFile>): MemeFile {
    const file = new this(
      iFile.access,
      iFile.data,
      iFile.dateCreated,
      iFile.dateModified,
      iFile.encoding,
      iFile.md5,
      iFile.mimetype,
      iFile.name,
      iFile.size,
      iFile.tempFilePath,
      iFile.truncated,
      iFile.owner
    );
    file._id = iFile._id;
    return file;
  }

  /**
   * GETTER AND SETTER
   */

  set id(id: string | null) {
    this._id = new ObjectId(id ?? "");
  }

  get id(): string | null {
    return this._id?.toString() ?? null;
  }
}
