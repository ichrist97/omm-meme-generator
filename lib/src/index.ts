import {Access} from "./access";
import {Property} from "csstype";
import FontSize = Property.FontSize;
import FontWeight = Property.FontWeight;
import FontStyle = Property.FontStyle;
import FontFamily = Property.FontFamily;
import FontVariant = Property.FontVariant;
import Color = Property.Color;
import WebkitTextStrokeColor = Property.WebkitTextStrokeColor;
import WebkitTextStrokeWidth = Property.WebkitTextStrokeWidth;

export interface Secrets extends StringId {
    accessTokenSecret: string;
    refreshTokenSecret: string;
}

export interface Authorization {
    owner?: string | null;
    access: Access;
}

export interface Tokens {
    accessToken: string;
    refreshToken: string;
}

export interface AppUser extends IUser {
    tokens: Tokens;
}

export interface IUser extends StringId {
    username: string;
    password?: string;
    email?: string;
    createdAt?: Date;
}

export interface Caption {
    text: string;
    grid?: CaptionGrid;
    position?: CaptionPosition;
    fontFace: FontFace;
    start?: number;
    end?: number;
}

export interface CaptionGrid {
    gridCol: number;
    gridRow: number;
}

export interface CaptionPosition {
    top: number;
    left: number;
    right: number;
    bottom: number;
}

/**
 * See: https://www.w3schools.com/tags/canvas_font.asp
 * StandardLonghandProperties in CssType
 */
export interface FontFace {
    fontStyle?: FontStyle;
    fontWeight?: FontWeight;
    fontSize: FontSize | number;
    fontFamily?: FontFamily;
    fontVariant?: FontVariant;
    color?: Color;
    textStrokeColor?: WebkitTextStrokeColor;
    textStrokeWidth?: WebkitTextStrokeWidth;
}

export enum Align {
    Center = "center",
    Start = "start",
    End = "end",
}

export interface StringId {
    id?: string | null;
}

export enum MemeProvider {
    Client = "client",
    Server = "server",
    ImgFlip = "imgFlip",
}

export enum MediaType {
    Image = "image",
    Video = "video",
    GIF = "gif",
}

export enum VideoMemeType {
    Static = "static",
    Dynamic = "dynamic",
}

export * from "./access";
export * from "./comment";
export * from "./like";
export * from "./meme";
export * from "./template";
export * from "./util/helper";
export * from "./util/dateTimeUtil";
export * from "./fonts/FontHelper";

export * from "./api/index";
