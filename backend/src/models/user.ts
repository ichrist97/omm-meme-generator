import { Meme } from "./meme";
import { FindOneResult, IMonkManager, IObjectID, WithID } from "monk";
import { IMeme, IUser } from "meme-generator-lib";
import { ObjectId } from "mongodb";

/**
 * Class for representing users
 */
export class User implements IUser {
  public _id?: IObjectID | null;
  private _username: string;
  private _password: string;
  private _createdAt: Date;

  /**
   * STATIC METHODS
   */

  /**
   * Get instance of user by his name
   * @param username name of user
   * @param db database session
   */
  static async getUserByName(username: string, db: IMonkManager): Promise<User | null> {
    const users = db.get<IUser>("users");
    const dbUser: FindOneResult<IUser> = await users.findOne({ username: username });
    if (dbUser) {
      return User.assign(dbUser);
    }
    return null;
  }

  /**
   * Get instance of user by his id
   * @param id id of user
   * @param db database session
   */
  static async getUserById(id: string, db: IMonkManager): Promise<User | null> {
    const users = db.get<IUser>("users");
    const dbUser: FindOneResult<IUser> = await users.findOne({ _id: new ObjectId(id) });
    if (dbUser) {
      return User.assign(dbUser);
    }
    return null;
  }

  /**
   * Assign user interface to user object
   * @param iUserinterface instance of user
   */
  public static assign(iUser: WithID<IUser>): User {
    const user = new this(iUser.username, iUser.password, iUser.createdAt);
    user._id = iUser._id;
    return user;
  }

  constructor(username: string, password?: string, createdAt?: Date) {
    this._username = username;

    if (password) {
      this._password = password;
    } else {
      this._password = "";
    }

    if (createdAt) {
      this._createdAt = createdAt;
    } else {
      this._createdAt = new Date();
    }
  }

  /**
   * Register new user in database
   * @param db database session
   */
  async register(db: IMonkManager): Promise<IUser | null> {
    try {
      // create user
      const users = db.get<IUser>("users");
      const item = {
        username: this._username,
        password: this._password,
        createdAt: this._createdAt,
      };

      // upload to database
      const inserted = await users.insert(item);
      inserted.id = inserted._id.toString();
      return inserted;
    } catch (e) {
      console.error(e);
    }
    return null;
  }

  /**
   * Get all memes a user created
   * @param db database session
   */
  async loadMemes(db: IMonkManager): Promise<Meme[] | null> {
    try {
      const memes = db.get<IMeme>("memes");
      // Memes must have a url (otherwise it's a draft)
      const docs = await memes.find({ owner: this.id ?? "", url: { $ne: null } }, {});
      return Promise.all(docs.map((d) => Meme.assign(d, db)));
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  /**
   * Get all draft memes a user created
   * @param db database session
   */
  async loadDraftMemes(db: IMonkManager): Promise<Meme[] | null> {
    try {
      const memes = db.get<IMeme>("memes");
      // Memes without url are drafts
      const docs = await memes.find({ owner: this.id ?? "", url: null }, {});
      return Promise.all(docs.map((d) => Meme.assign(d, db)));
    } catch (e) {
      console.error(e);
      return null;
    }
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

  set password(passwordHash: string) {
    this._password = passwordHash;
  }

  get password(): string {
    return this._password;
  }

  get username(): string {
    return this._username;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  toJSON(): IUser {
    return {
      ...(this.id && { id: this.id }),
      createdAt: this.createdAt,
      // email: this.email, not existing
      // password: this.password, don't send the password!
      username: this.username,
    };
  }
}
