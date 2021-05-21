import {getAuthHeader, getJson, postFormData, postJson} from "./ApiHelper";
import {Access, ILike, ITemplate, Tokens} from "../index";

export async function getPublicTemplates(tokens: Tokens): Promise<ITemplate[]> {
    return await getJson("templates", {}, tokens);
}

export async function getUserTemplates(tokens: Tokens): Promise<ITemplate[]> {
    // TODO provide templates by user only
    const templates: ITemplate[] = await getJson("templates/", {access: Access.Private}, tokens);
    const authHeader = getAuthHeader(tokens.accessToken);
    if (authHeader) {
        const queryParams = new URLSearchParams(authHeader).toString();
        templates.forEach((t) => {
            if (t.access === Access.Private) t.url += "?" + queryParams;
        });
    }
    return templates;
}

export async function getSingleTemplate(templateId: string, tokens?: Tokens): Promise<ITemplate | null> {
    // if user is not logged in
    if (!tokens) {
        return null;
    }

    const template: ITemplate = (await getJson(`templates/template/${templateId}/`, {}, tokens)).data;
    if (tokens) {
        const authHeader = getAuthHeader(tokens.accessToken);
        if (template.access === Access.Private && authHeader) {
            const queryParams = new URLSearchParams(authHeader).toString();
            template.url += "?" + queryParams;
        }
    }
    return template;
}

export async function getImgFlipTemplates(tokens: Tokens): Promise<ITemplate[]> {
    return await getJson("templates/imgflip", {}, tokens);
}

export async function uploadTemplateFile(
    file: File,
    name: string,
    access = Access.Private,
    tokens: Tokens
): Promise<ITemplate> {
    const template = (
        await postFormData("templates", {access: access, template: file, name: name || "Unnamed Template"}, tokens)
    ).template;
    const authHeader = getAuthHeader(tokens.accessToken);
    if (authHeader) {
        const queryParams = new URLSearchParams(authHeader).toString();
        template.url += "?" + queryParams;
    }
    return template;
}

export async function uploadTemplateImageUrl(
    imgUrl: string,
    name: string,
    access = Access.Private,
    tokens: Tokens
): Promise<ITemplate> {
    const template = (await postJson("templates/url", {access: access, url: imgUrl, name: name}, tokens)).template;
    const authHeader = getAuthHeader(tokens.accessToken);
    if (authHeader) {
        const queryParams = new URLSearchParams(authHeader).toString();
        template.url += "?" + queryParams;
    }
    return template;
}

export async function uploadTemplateScreenShotUrl(
    screenshotUrl: string,
    name: string,
    access = Access.Private,
    tokens: Tokens
): Promise<ITemplate> {
    const template = (await postJson("templates/screenshot", {access: access, url: screenshotUrl, name: name}, tokens))
        .template;
    const authHeader = getAuthHeader(tokens.accessToken);
    if (authHeader) {
        const queryParams = new URLSearchParams(authHeader).toString();
        template.url += "?" + queryParams;
    }
    return template;
}

export async function addTemplateView(templateId: string, tokens: Tokens): Promise<void> {
    const result = (await postJson("templates/view", {templateId: templateId}, tokens)).data;
}

export async function addTemplateLike(templateId: string, tokens: Tokens, undo = false): Promise<ILike | null> {
    const like = (await postJson("templates/like", {templateId: templateId, undo: undo}, tokens)).data;
    return like;
}
