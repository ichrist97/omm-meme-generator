import {apiBaseUrl, ContentType, getAuthHeader, getJson, getRequest, postFormData, postJson} from "./ApiHelper";
import {
    Access,
    Caption,
    FilterProps,
    IComment,
    ILike,
    IMeme,
    IMemeRelations,
    ITemplate,
    jsonifyAttributes,
    MediaType,
    MemeProvider,
    objectDefined,
    stringifyAttributes,
    Tokens,
} from "../index";
import io from "socket.io-client";

export async function getUserMemes(
    tokens: Tokens,
    userId: string,
    filterProps: FilterProps
): Promise<IMemeRelations[]> {
    const definedFilterProps = objectDefined(filterProps);
    const jsonFilterProps = jsonifyAttributes(definedFilterProps);

    // Object.keys(filterProps).forEach(key => filterProps[key] === undefined && delete filterProps[key])
    const memes: IMemeRelations[] = (
        await getJson(
            "memes/user/" + userId,
            {
                ...jsonFilterProps,
                isDraft: JSON.stringify(false),
            },
            tokens
        )
    ).data;
    const authHeader = getAuthHeader(tokens.accessToken);
    if (authHeader) {
        const queryParams = new URLSearchParams(authHeader).toString();
        memes.forEach((m) => {
            if (m.access === Access.Private && m.url) m.url += "?" + queryParams;
        });
    }
    return memes;
}

export async function getUserDraftMemes(tokens: Tokens, userId: string): Promise<IMeme[]> {
    const memes: IMemeRelations[] = (await getJson("memes/user/" + userId, {isDraft: JSON.stringify(true)}, tokens))
        .data;
    const authHeader = getAuthHeader(tokens.accessToken);
    if (authHeader) {
        const queryParams = new URLSearchParams(authHeader).toString();
        memes.forEach((m) => {
            if (m.access === Access.Private && m.url) m.url += "?" + queryParams;
        });
    }
    return memes;
}

export async function getPublicMemes(filterProps: FilterProps): Promise<IMemeRelations[]> {
    const definedFilterProps = objectDefined(filterProps);
    const jsonFilterProps = stringifyAttributes(definedFilterProps);
    const memes: IMemeRelations[] = (await getJson("memes", jsonFilterProps)).data;
    return memes;
}

export async function createMeme(
    name: string,
    template: ITemplate,
    captions: Caption[],
    tags: string[],
    isDraft = false,
    access = Access.Private,
    tokens: Tokens
): Promise<IMemeRelations> {
    let parsedCaptions: Caption[];
    if (
        template.mediaType === MediaType.Image ||
        captions.length === 0 ||
        (captions.length === captions.filter((c) => c.start === 0).length &&
            captions.length === captions.filter((c) => c.end === 1).length)
    ) {
        // Use static caption(s)
        parsedCaptions = captions.map((c) => {
            c.start = undefined;
            c.end = undefined;
            return c;
        });
    } else {
        // Dynamic captions
        parsedCaptions = captions;
    }
    let templateObj: string | Blob = "";
    if (template.id && template.provider === MemeProvider.Server) {
        // Only set reference
        templateObj = template.id;
    } else if (template.url) {
        // Upload file (e.g. template from ImgFlip)
        templateObj = await (await fetch(template.url)).blob();
    }
    const response = await postFormData(
        "memes/meme",
        {
            template: templateObj,
            name: name,
            captions: JSON.stringify(parsedCaptions),
            tags: JSON.stringify(tags),
            isDraft: JSON.stringify(isDraft),
            access: access,
        },
        tokens
    );
    const meme: IMemeRelations = response.data;
    const authHeader = getAuthHeader(tokens.accessToken);
    if (authHeader && meme.access === Access.Private && meme.url) {
        const queryParams = new URLSearchParams(authHeader).toString();
        meme.url += "?" + queryParams;
    }
    return meme;
}

export async function createMemeCollection(template: ITemplate, captions: Caption[], tokens: Tokens): Promise<void> {
    const file = await (await fetch(template.url)).blob();
    const result = await postFormData(
        "memes/meme-collection",
        {template: file, captions: JSON.stringify(captions)},
        tokens,
        ContentType.Binary
    );
}

export async function createMemeFilterCollection(filterProps: FilterProps, tokens?: Tokens): Promise<void> {
    const definedFilterProps = objectDefined(filterProps);
    const stringifiedFilterProps = stringifyAttributes(definedFilterProps);
    const result = await getRequest(
        "memes/filter-meme-collection",
        {
            ...stringifiedFilterProps,
        },
        tokens,
        ContentType.Binary
    );
}

export async function addMemeView(memeId: string, tokens: Tokens): Promise<void> {
    const result = (await postJson("memes/view", {memeId: memeId}, tokens)).data;
}

export async function addMemeLike(memeId: string, tokens: Tokens, undo = false): Promise<ILike | null> {
    const like = (await postJson("memes/like", {memeId: memeId, undo: undo}, tokens)).data;
    return like;
}

export async function addComments(memeId: string, text: string, tokens: Tokens): Promise<IComment> {
    const comment = (await postJson("memes/comment", {memeId: memeId, text: text}, tokens)).data;
    return comment;
}

export const MEME_VIDEO_RESPONSE_EVENT = "meme-video-response";
export const MEME_VIDEO_REQUEST_EVENT = "meme-video-request";

let socketInstance: SocketIOClient.Socket | null = null;
export function startVideoStream(callback: (data: any) => void): void {
    if (!socketInstance) {
        try {
            socketInstance = io.connect(apiBaseUrl.getUrl(), {path: "/memes-socket"});

            // const socket = io.connect(process.env.REACT_APP_API_HOST as string);
            //socket.emit(MEME_VIDEO_REQUEST_EVENT, "test request");
            socketInstance.on(MEME_VIDEO_RESPONSE_EVENT, (data: any) => {
                callback(data);
            });
            socketInstance.on("disconnect", () => {
                socketInstance = null;
            });
        } catch (e) {
            socketInstance = null;
        }
    }
}
export function stopVideoStream(): void {
    socketInstance?.close();
    socketInstance = null;
}
