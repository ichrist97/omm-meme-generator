import {StringId} from "./index";

export interface ILike extends StringId {
    user: string;
    createdAt: Date;
    memeId: string;
    isTemplate: boolean;
}
