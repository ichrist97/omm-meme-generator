import md5 from "md5";
import { IFile } from "../types/Types";
import { Like } from "./like";
import { Comment } from "./comment";
import { IMonkManager, IObjectID, WithID } from "monk";
import { Binary, ObjectId, UpdateWriteOpResult } from "mongodb";
import {
  Access,
  Caption,
  IComment,
  ILike,
  IMeme,
  ITempMeme,
  LibMeme,
  MediaType,
  MemeProvider,
} from "meme-generator-lib";
import { saveFileToDatabase } from "../controllers/fileController";
import { MemeFile } from "./file";
import { User } from "./user";

/**
 * Class for representing memes
 */
export class Meme extends LibMeme implements ITempMeme {
  public _id?: IObjectID | null;
  protected _owner?: string | null;
  protected _name: string;
  protected _createdAt: Date;
  protected _views: number;
  protected _access: Access;
  protected _url: string | null;
  protected _dataBuffer?: Buffer; // Temporary store data buffer
  protected _mediaType: MediaType;
  protected _template: string | null;
  protected _captions: Caption[];
  protected _tags: string[];
  protected _provider: MemeProvider;
  protected _username: string | null;

  /**
   * STATIC METHODS
   */

  /**
   * Assign IMeme interface to meme object
   * @param m interface instance of IMeme
   * @param db the database manager to postload attributes
   */
  public static async assign(m: WithID<IMeme>, db: IMonkManager): Promise<Meme> {
    const meme = new this(
      m.name,
      m.access,
      m.owner,
      m.createdAt,
      m.views,
      m.url,
      m.mediaType,
      m.template ? m.template : null,
      m.captions,
      m.tags,
      m.provider,
      m.username
    );
    meme._id = m._id;
    if (meme.owner) {
      const user = await User.getUserById(meme.owner, db);
      if (user) {
        meme._username = user.username;
      }
    }
    return meme;
  }

  /**
   * Get instance of meme by its id
   * @param memeId id of meme
   * @param db database session
   */
  static async getById(memeId: string, db: IMonkManager): Promise<Meme | null> {
    const memes = db.get<IMeme>("memes");
    return memes
      .findOne({ _id: new ObjectId(memeId) })
      .then((doc) => {
        if (doc) {
          return Meme.assign(doc, db);
        }
        return null;
      })
      .catch((err: Error) => {
        console.error(err);
        return null;
      });
  }

  public constructor(
    name: string,
    access: Access,
    owner?: string | null,
    createdAt?: Date,
    views?: number,
    url?: string | null,
    mediaType?: MediaType,
    template?: string | null,
    captions?: Caption[],
    tags?: string[],
    provider?: MemeProvider,
    username?: string | null
  ) {
    super();

    this._createdAt = createdAt ?? new Date(); // Fallback: today
    this._views = views ?? 0; // existing

    // url
    this._url = url ?? null;

    // name
    this._name = name;

    // user
    this._owner = owner;

    // access
    if (access === Access.Public || access === Access.Private || Access.Unlisted) {
      this._access = access; // default
    } else {
      throw new Error("Access is invalid");
    }

    // mediatype
    if (mediaType && MemeFile.isMediaTypeSupported(mediaType)) {
      this._mediaType = mediaType;
    } else {
      this._mediaType = MediaType.Image; // default
    }

    this._template = template ?? null;
    this._captions = captions ?? [];
    this._tags = tags ?? [];
    this._provider = provider ?? MemeProvider.Server;
    this._username = username ?? null;
  }

  /**
   * Undo like in meme
   * @param userId id of user
   * @param db database session
   */
  async undoLike(userId: string, db: IMonkManager): Promise<boolean> {
    const like = new Like(userId, this.id ?? "", false);
    return await like.deleteFromDatabase(db);
  }

  /**
   * Like Meme
   * @param userId if of user
   * @param db database session
   */
  async like(userId: string, db: IMonkManager): Promise<ILike | null> {
    // create and upload like
    const like = new Like(userId, this.id ?? "", false);
    return await like.uploadToDatabase(db);
  }

  /**
   * Comment meme
   * @param userId Id of comment creator
   * @param text comment text
   * @param db database session
   */
  async comment(
    userId: string,
    username: string,
    text: string,
    db: IMonkManager
  ): Promise<IComment> {
    // create and upload comment
    const comment = new Comment(userId, this.id ?? "", text, username);
    const iComment = await comment.uploadToDatabase(db);
    return iComment;
  }

  /**
   * Upload Meme to database
   * @param db database session
   * @param type mediaType of meme
   */
  async uploadToDatabase(db: IMonkManager, type: MediaType): Promise<WithID<IMeme> | null> {
    if (this._dataBuffer) {
      // prepare image file
      const file: IFile = {
        name: MemeFile.parseToFileName(this.name),
        encoding: "base64",
        mimetype: "unknown",
        data: new Binary(this._dataBuffer),
        tempFilePath: "",
        truncated: false,
        size: this._dataBuffer ? this._dataBuffer.byteLength : 0,
        md5: md5(this._dataBuffer ?? 0),
        dateCreated: new Date(),
        dateModified: new Date(),
        access: this.access,
        owner: this.owner,
      };

      // media type
      if (type === MediaType.Image) {
        file.name += ".jpeg";
        file.mimetype = "image/jpeg";
      } else if (type === MediaType.Video) {
        file.name += ".mp4";
        file.mimetype = "video/mp4";
      } else if (type === MediaType.GIF) {
        file.name += ".gif";
        file.mimetype = "image/gif";
      } else {
        console.log("Invalid MediaType");
        return null;
      }

      // upload image file
      const savedFile = await saveFileToDatabase(db, file);
      if (savedFile && savedFile.id) {
        this.url = savedFile.id;
      }
    }

    // upload to meme collection
    const memes = db.get<IMeme>("memes");
    const inserted = await memes.insert(this.toJSON());
    inserted.id = inserted._id.toString();
    return inserted;
  }

  /**
   * Increase view counter of meme
   * @param db database session
   */
  async view(db: IMonkManager): Promise<UpdateWriteOpResult> {
    const memes = db.get<IMeme>("memes");
    return memes.update({ _id: this._id }, { $inc: { views: 1 } });
  }

  /**
   * Concat url of meme to complete URL
   * @param protocol web protocol used
   * @param host host adress of backend
   */
  alterImgUrl(protocol: string, host = "localhost:3000"): void {
    if (this.url) {
      this.url = protocol + "://" + host + "/files/download/" + this.url;
    }
  }

  /**
   * GETTER and SETTER functions
   */

  set id(id: string | null) {
    this._id = new ObjectId(id ?? "");
  }

  get id(): string | null {
    return this._id?.toString() ?? null;
  }

  get url(): string | null {
    return this._url;
  }

  set url(url: string | null) {
    this._url = url;
  }

  set mediaType(mediaType: MediaType) {
    this._mediaType = mediaType;
  }

  get mediaType(): MediaType {
    return this._mediaType;
  }

  get dataBuffer(): Buffer {
    return this._dataBuffer || Buffer.from("");
  }

  set dataBuffer(dataBuffer: Buffer) {
    this._dataBuffer = dataBuffer;
  }

  get access(): Access {
    return this._access;
  }

  get views(): number {
    return this._views;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get owner(): string {
    return this._owner ?? "";
  }

  get name(): string {
    return this._name;
  }

  get template(): string | null {
    return this._template;
  }

  set template(value: string | null) {
    this._template = value;
  }

  get captions(): Caption[] {
    return this._captions;
  }

  set captions(value: Caption[]) {
    this._captions = value;
  }

  get tags(): string[] {
    return this._tags;
  }

  set tags(value: string[]) {
    this._tags = value;
  }

  get provider(): MemeProvider {
    return this._provider;
  }

  set provider(value: MemeProvider) {
    this._provider = value;
  }

  get username(): string | null {
    return this._username;
  }

  toJSON(): IMeme {
    return {
      ...(this.id && { id: this.id }),
      access: this.access,
      createdAt: this.createdAt,
      url: this.url,
      owner: this.owner,
      name: this.name,
      views: this.views,
      mediaType: this.mediaType,
      template: this.template,
      captions: this.captions,
      tags: this._tags,
      provider: this.provider,
      ...(this.username && { username: this.username }),
    };
  }
}
