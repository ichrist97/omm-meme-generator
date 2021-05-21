import {Authorization, StringId, MediaType, Access, ILike, IMeme, MemeProvider} from "./index";

export interface ITempMeme extends Authorization, StringId {
    owner?: string | null;
    createdAt: Date;
    name: string;
    access: Access;
    url: string | null;
    mediaType: MediaType;
    views?: number;
    likes?: ILike[];
    provider?: MemeProvider;
    username?: string | null;
}

export interface ITemplate extends ITempMeme {
    url: string; // Templates need no drafts, therefore always have an url
    width?: number;
    height?: number;
}

export interface FilterProps {
    createdBefore?: Date;
    createdAfter?: Date;
    views?: string;
    likes?: string;
    mediaType?: MediaType;
    template?: string;
    viewsSort?: boolean;
    likesSort?: boolean;
    createdSort?: boolean;
    commentsSort?: boolean;
    name?: string;
    limit?: number;
}
