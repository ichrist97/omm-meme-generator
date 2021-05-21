import {getJson, postJson} from "./ApiHelper";
import {AppUser, Tokens} from "../index";

export async function signIn(username: string, password: string): Promise<AppUser> {
    return await postJson("login", {username: username, password: password});
}

export async function getUser(tokens: Tokens): Promise<AppUser> {
    const appUser: AppUser = await getJson("login/user", {}, tokens);
    appUser.tokens = tokens;
    return appUser;
}

export async function signUp(username: string, password: string, email?: string) {
    return await postJson("login/register", {username: username, password: password, ...(email && {email: email})});
}

export async function signOut(tokens: Tokens): Promise<void> {
    // TODO may use bearer token in header only for logging out without transmitting token via body
    await postJson("login/logout", {token: tokens.accessToken}, tokens);
    return;
}

export async function refreshToken(refreshToken: string): Promise<Tokens> {
    return await postJson("login/refresh", {token: refreshToken});
}
