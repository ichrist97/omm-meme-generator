import { IMonkManager, IObjectID, WithID } from "monk";
import { IComment } from "meme-generator-lib";
import { ObjectId } from "mongodb";
import { User } from "./user";

/**
 * Class for comments in memes
 * Comments contain:
 * - id
 * - id of user who created the comment
 * - text
 * - date of creation
 * - id of meme the comment is for
 */
export class Comment implements IComment {
  public _id?: IObjectID | null;
  protected _userId: string;
  protected _createdAt: Date;
  protected _text: string;
  protected _memeId: string;
  protected _username: string | null;

  /**
   * Only user, memeId and text are mandatory for comments at creation
   * @param userId id of user
   * @param memeId id of meme
   * @param text text of comment
   * @param createdAt date of creation
   * @param username username of user
   */
  constructor(
    userId: string,
    memeId: string,
    text: string,
    username?: string | null,
    createdAt?: Date
  ) {
    this._userId = userId;
    this._memeId = memeId;
    this._text = text;
    this._username = username ?? null;

    if (createdAt) {
      this._createdAt = createdAt; // existing comment
    } else {
      this._createdAt = new Date(); // new comment
    }
  }

  /**
   * Assign comment interface to comment object
   * @param iComment interface instance of comment
   */
  public static assign(iComment: WithID<IComment>): Comment {
    const comment = new this(
      iComment.userId,
      iComment.memeId,
      iComment.text,
      iComment.username,
      iComment.createdAt
    );
    comment._id = iComment._id;
    return comment;
  }

  /**
   * Upload comment to database
   * @param db database session
   */
  async uploadToDatabase(db: IMonkManager): Promise<IComment> {
    const comments = db.get<IComment>("comments");
    const inserted = await comments.insert(this.toJSON());
    inserted.id = inserted._id.toString();
    return inserted;
  }

  /**
   * Get all comments for a single meme
   * @param memeId id of meme
   * @param db database session
   */
  static async getCommentsByMemeId(memeId: string, db: IMonkManager): Promise<Comment[] | null> {
    try {
      const collection = db.get<IComment>("comments");
      const findResult = await collection.find({ memeId }, {});
      return await Promise.all(
        findResult.map(async (d) => {
          const user = await User.getUserById(d.userId, db);
          d.username = user?.username;
          return Comment.assign(d);
        })
      );
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  /**
   * GETTER and SETTER
   */
  set id(id: string | null) {
    this._id = new ObjectId(id ?? "");
  }

  get id(): string | null {
    return this._id?.toString() ?? null;
  }

  get memeId(): string {
    return this._memeId;
  }

  get text(): string {
    return this._text;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get userId(): string {
    return this._userId;
  }

  get username(): string | null {
    return this._username;
  }

  toJSON(): IComment {
    return {
      ...(this.id && { id: this.id }),
      memeId: this.memeId,
      text: this.text,
      createdAt: this.createdAt,
      userId: this.userId,
      ...(this.username && { username: this.username }),
    };
  }
}
