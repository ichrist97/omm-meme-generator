import { IMonkManager } from "monk";
import { ILike } from "meme-generator-lib";

/**
 * Utility interface for likes in memes and templates
 */
export interface ITempMemeExtended {
  undoLike(userId: string, db: IMonkManager): Promise<boolean>;
  like(userId: string, db: IMonkManager): Promise<ILike | null>;
}
