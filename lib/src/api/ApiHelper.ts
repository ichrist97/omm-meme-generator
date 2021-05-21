import {refreshToken} from "./AuthApi";
import {dateTimeReviver, Tokens} from "../index";

class ApiBaseUrl {
    private _baseUrl: string;
    private static _instance: ApiBaseUrl;

    private constructor() {
        this._baseUrl = "";
    }

    public setUrl(value: string) {
        ApiBaseUrl.getInstance()._baseUrl = value;
    }

    public getUrl(): string {
        return ApiBaseUrl.getInstance()._baseUrl;
    }

    public static getInstance(): ApiBaseUrl {
        return this._instance || (this._instance = new this());
    }
}

export const apiBaseUrl = ApiBaseUrl.getInstance();

export interface QueryParam {
    [key: string]: string;
}

export interface PostQueryParam {
    [key: string]: string | boolean | number;
}

export interface BlobParam {
    [key: string]: string | Blob;
}

export enum ContentType {
    Json = "json",
    Binary = "binary",
}

/**
 * POST Json Data.
 * @param path        - the url path with url parameters
 * @param params      - the json query parameters
 * @param tokens      - the auth tokens
 */
export async function postJson(path: string, params: PostQueryParam, tokens?: Tokens): Promise<any> {
    return await handleRequest(
        new URL(path, apiBaseUrl.getUrl()).href,
        {
            method: "POST",
            body: JSON.stringify(params),
            headers: Object.assign({"Content-type": "application/json"}, getAuthHeader(tokens?.accessToken)),
            redirect: "follow",
        },
        tokens
    );
}

/**
 * POST Form Data.
 * @param path        - the url path with url parameters
 * @param params      - the from data parameters
 * @param tokens      - the auth tokens
 * @param contentType - the requested content type, which will be returned
 */
export async function postFormData(
    path: string,
    params: BlobParam,
    tokens?: Tokens,
    contentType = ContentType.Json
): Promise<any> {
    const form = new FormData();
    for (const [key, value] of Object.entries(params)) {
        form.append(key, value);
    }
    const authHeader = getAuthHeader(tokens?.accessToken);
    return await handleRequest(
        new URL(path, apiBaseUrl.getUrl()).href,
        {
            method: "POST",
            body: form,
            redirect: "follow",
            ...(authHeader && {headers: authHeader}),
        },
        tokens,
        contentType
    );
}

/**
 * GET request.
 * @param path        - the url path with url parameters
 * @param queryParams - the query parameters
 * @param tokens      - the auth tokens
 * @param contentType - the requested content type, which will be returned
 */
export async function getRequest(
    path: string,
    queryParams: QueryParam,
    tokens?: Tokens,
    contentType?: ContentType
): Promise<any> {
    const url = new URL(path, apiBaseUrl.getUrl());
    url.search = new URLSearchParams(queryParams).toString();
    const requestHeaders: HeadersInit = new Headers();
    if (tokens) {
        requestHeaders.set("Authorization", "Bearer " + tokens.accessToken);
    }
    // No content type specified as GET request has query params
    return await handleRequest(
        url.href,
        {
            method: "GET",
            headers: requestHeaders,
            redirect: "follow",
        },
        tokens,
        contentType
    );
}

/**
 * Short method for requesting Json data.
 */
export async function getJson(path: string, queryParams: QueryParam, tokens?: Tokens): Promise<any> {
    return await getRequest(path, queryParams, tokens, ContentType.Json);
}

/**
 * Handle request and response. Refreshes session, if access token is invalid.
 * @param request       - the request url
 * @param requestInit   - the request headers
 * @param tokens        - the auth tokens
 * @param contentType   - the requested content type, which will be returned
 * @param isRefresh     - handle refresh (recursive)
 */
async function handleRequest(
    request: Request | string,
    requestInit?: RequestInit,
    tokens?: Tokens,
    contentType = ContentType.Json,
    isRefresh = false
): Promise<any> {
    const response = await fetch(request, requestInit);
    let body = null;
    if (contentType == ContentType.Json) {
        body = JSON.parse(await response.text(), dateTimeReviver);
    }
    if (response.status >= 400) {
        if (response.status == 401 && tokens && requestInit && !isRefresh) {
            // Refresh token and try again
            const newTokens = await refreshToken(tokens.refreshToken);
            tokens.accessToken = newTokens.accessToken;
            requestInit.headers = Object.assign(requestInit.headers, getAuthHeader(tokens.accessToken));
            return await handleRequest(request, requestInit, tokens, contentType, true);
        } else {
            throw new RestError(body.msg ?? "", response.status, response.statusText);
        }
    }
    if (contentType == ContentType.Binary) {
        const blob = await response.blob();
        const file = await window.URL.createObjectURL(blob);
        // forceDownload / force dynamic content to be prompted at the user
        window.location.assign(file);
    }
    return body;
}

/**
 * Get authentication header.
 * // TODO replace with new Headers()
 * https://developer.mozilla.org/en-US/docs/Web/API/Headers/set
 * @param token     - the auth token
 */
export function getAuthHeader(token?: string): {Authorization: string} | null {
    return token ? {Authorization: "Bearer " + token} : null;
}

export class RestError extends Error {
    readonly status: number;
    readonly statusText: string;

    constructor(message: string, status: number, statusText: string) {
        super(message);
        this.name = "RestError";
        this.status = status;
        this.statusText = statusText;
    }
}
