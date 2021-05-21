import { IMonkManager, IObjectID, WithID } from "monk";
import { ILike } from "meme-generator-lib";
import { DeleteWriteOpResultObject, ObjectId } from "mongodb";

/**
 * Class for likes of a meme
 */
export class Like implements ILike {
  public _id?: IObjectID | null;
  private _user: string;
  private _createdAt: Date;
  private _memeId: string;
  private _isTemplate: boolean;

  /**
   * STATIC METHODS
   */

  /**
   * Assign ILike interface to like object
   * @param iLike interface instance of ILike
   */
  public static assign(iLike: WithID<ILike>): Like {
    const like = new this(iLike.user, iLike.memeId, iLike.isTemplate, iLike.createdAt);
    like._id = iLike._id;
    return like;
  }

  static async getLikesByTempMemeId(memeId: string, db: IMonkManager): Promise<Like[] | null> {
    const collection = db.get<ILike>("likes");
    return collection
      .find({ memeId: memeId }, {})
      .then((docs) => {
        return docs.map((d) => Like.assign(d));
      })
      .catch((err) => {
        console.error(err);
        return null;
      });
  }

  constructor(user: string, memeId: string, isTemplate: boolean, createdAt?: Date) {
    this._user = user;
    this._memeId = memeId;
    this._isTemplate = isTemplate;

    if (createdAt) {
      this._createdAt = createdAt; // existing like
    } else {
      this._createdAt = new Date(); // new like
    }
  }

  /**
   * Delete like from database
   * @param db database session
   */
  async deleteFromDatabase(db: IMonkManager): Promise<boolean> {
    const likes = db.get<ILike>("likes");
    const removed: DeleteWriteOpResultObject = await likes.remove(
      { memeId: this.memeId, user: this.user },
      {}
    );
    return removed.result.n ? removed.result.n > 0 : false;
  }

  /**
   * Upload like to database
   * @param db database session
   */
  async uploadToDatabase(db: IMonkManager): Promise<ILike | null> {
    const likes = db.get<ILike>("likes");
    const previousLike = await likes.find({ memeId: this.memeId, user: this.user }, {});
    if (previousLike.length > 0) {
      return null;
    }

    const inserted = await likes.insert(this.toJSON());
    inserted.id = inserted._id.toString();
    return inserted;
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

  get user(): string {
    return this._user;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get memeId(): string {
    return this._memeId;
  }

  get isTemplate(): boolean {
    return this._isTemplate;
  }

  toJSON(): ILike {
    return {
      ...(this.id && { id: this.id }),
      createdAt: this.createdAt,
      memeId: this.memeId,
      user: this.user,
      isTemplate: this.isTemplate,
    };
  }
}
