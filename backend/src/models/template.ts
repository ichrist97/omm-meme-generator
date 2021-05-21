import { Access, ILike, IMeme, ITemplate, MediaType, MemeProvider } from "meme-generator-lib";
import { IMonkManager, IObjectID, WithID } from "monk";
import { ObjectId, UpdateWriteOpResult } from "mongodb";
import { MemeFile } from "./file";
import { Like } from "./like";
import { ITempMemeExtended } from "./tempMeme";
import { User } from "./user";

/**
 * Class for representing templates
 */
export class Template implements ITemplate, ITempMemeExtended {
  protected _id?: IObjectID | null;
  protected _owner?: string | null;
  protected _access: Access;
  protected _mediaType: MediaType;
  protected _url: string;
  protected _name: string;
  protected _views?: number;
  protected _createdAt: Date;
  protected _provider: MemeProvider;
  protected _username: string | null;

  /**
   * STATIC METHODS
   */

  /**
   * Assign template interface to template object
   * @param t interface instance of template
   * @param db the database manager to postload attributes
   */
  public static async assign(t: WithID<ITemplate>, db: IMonkManager): Promise<Template> {
    const template = new this(
      t.url,
      t.name,
      t.mediaType,
      t.createdAt,
      t.access,
      t.owner,
      t.views,
      t.provider,
      t.username
    );
    template._id = t._id;
    if (template.owner) {
      const user = await User.getUserById(template.owner, db);
      if (user) {
        template._username = user.username;
      }
    }
    return template;
  }

  /**
   * Get instance of template by its id
   * @param templateId id of template
   * @param db database session
   */
  static async getById(templateId: string, db: IMonkManager): Promise<Template | null> {
    const templates = db.get<ITemplate>("templates");
    return templates
      .findOne({ _id: new ObjectId(templateId) })
      .then((doc) => {
        if (doc) {
          return Template.assign(doc, db);
        }
        return null;
      })
      .catch((err: Error) => {
        console.error(err);
        return null;
      });
  }

  constructor(
    url: string,
    name: string,
    mediaType: MediaType,
    createdAt: Date,
    access: string,
    owner?: string | null,
    views?: number,
    provider?: MemeProvider,
    username?: string | null
  ) {
    this._url = url;
    this._name = name;
    this._owner = owner;
    this._views = views;
    this._createdAt = createdAt;

    // access
    if (access === Access.Public || access === Access.Private) {
      this._access = access; // default
    } else {
      throw new Error("Access is invalid");
    }

    // type
    if (MemeFile.isMediaTypeSupported(mediaType)) {
      this._mediaType = mediaType;
    } else {
      throw new Error("MediaType is invalid");
    }

    this._provider = provider ?? MemeProvider.Server;
    this._username = username ?? null;
  }

  /**
   * Concat url of template to complete URL
   * @param protocol web protocol used
   * @param host host adress of backend
   */
  alterImgUrl(protocol: string, host = "localhost:3000"): void {
    this._url = `${protocol}://${host}/files/download/${this.url}`;
  }

  /**
   * Undo like in template
   * @param userId id of user
   * @param db database session
   */
  async undoLike(userId: string, db: IMonkManager): Promise<boolean> {
    const like = new Like(userId, this.id ?? "", true);
    return await like.deleteFromDatabase(db);
  }

  /**
   * Like template
   * @param userId id of user
   * @param db database session
   */
  async like(userId: string, db: IMonkManager): Promise<ILike | null> {
    // create and upload like
    const like = new Like(userId, this.id ?? "", true);
    return await like.uploadToDatabase(db);
  }

  /**
   * Increase view counter of template
   * @param db database session
   */
  async view(db: IMonkManager): Promise<UpdateWriteOpResult> {
    const memes = db.get<IMeme>("templates");
    return memes.update({ _id: this._id }, { $inc: { views: 1 } });
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

  get url(): string {
    return this._url;
  }

  get access(): Access {
    return this._access;
  }

  get name(): string {
    return this._name;
  }

  get mediaType(): MediaType {
    return this._mediaType;
  }

  get owner(): string | null {
    return this._owner ?? null;
  }

  get views(): number {
    return this._views ?? 0;
  }

  get createdAt(): Date {
    return this._createdAt;
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

  toJSON(): ITemplate {
    return {
      ...(this.id && { id: this.id }),
      name: this.name,
      owner: this.owner,
      access: this.access,
      url: this.url,
      mediaType: this.mediaType,
      views: this.views,
      createdAt: this.createdAt,
      provider: this.provider,
      ...(this.username && { username: this.username }),
    };
  }
}
