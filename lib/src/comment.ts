import {StringId} from "./index";

export interface IComment extends StringId {
    userId: string;
    createdAt: Date;
    text: string;
    memeId: string;
    username?: string | null;
}
