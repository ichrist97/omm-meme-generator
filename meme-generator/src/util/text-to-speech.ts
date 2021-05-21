import {IMemeRelations, ITempMeme, getSingleTemplate, IMeme, Tokens} from "meme-generator-lib";
import {MemeSpeechInformation} from "../types/types";
import {HybridTempMeme} from "../types/tempMeme";
import {relativeTimeFromDates} from "../util/dateTimeUtil";

/**
 * Extracts speakable information about a meme
 * @param tempMeme  - the meme or template to read the infos from
 * @param tokens    - the tokens, needed to fetch private templates
 */
export async function extractSpeechInformation(tempMeme: ITempMeme, tokens?: Tokens): Promise<MemeSpeechInformation> {
    const info: MemeSpeechInformation = {};

    if ((tempMeme instanceof HybridTempMeme && tempMeme.meme) || tempMeme.hasOwnProperty("captions")) {
        let currMeme: IMeme;
        if (tempMeme instanceof HybridTempMeme && tempMeme.meme) {
            // Drafts
            currMeme = tempMeme.meme;
            info.template = tempMeme.template.name;
        } else {
            // Generated memes
            const memeRelations = tempMeme as IMemeRelations; // cast
            if (memeRelations.template) {
                const template = await getSingleTemplate(memeRelations.template, tokens);
                if (template) {
                    info.template = template?.name;
                }
            }
            // comments
            info.comments = memeRelations.comments ? memeRelations.comments.length.toString() : "";
            currMeme = memeRelations;
        }
        // Drafts and memes

        // extract captions
        let captions = currMeme.captions.map((c) => c.text);
        // join captions to single string
        info.captions = captions.join(". ");
        // tags
        info.tags = currMeme.tags.join(", ");
        // meme creator
        if (currMeme.username) {
            info.creator = currMeme.username;
        }
        // creation date
        info.createdAt = relativeTimeFromDates(currMeme.createdAt);
    } else {
        // Template specific stuff
    }

    // Infos for Drafts, Memes and Templates

    // views
    //info.views = tempMeme.views ? tempMeme.views.toString() : "";
    info.views = tempMeme.views?.toString();
    // likes
    info.likes = tempMeme.likes?.length.toString();
    // title / name
    info.name = tempMeme.name;

    return info;
}

/**
 * Prepares a single utterance containing all speakable information about a meme
 * @param info speakable infos about the meme
 */
export function prepareUtterance(info: MemeSpeechInformation): string {
    const utterances: string[] = [];
    for (const [key, value] of Object.entries(info)) {
        let text: string | null;

        // empty value
        if (value === "") {
            continue;
        }

        // decide text for each meme information
        switch (key) {
            case "name":
                text = `The title is ${value}`;
                break;
            case "captions":
                text = `The captions say ${value}`;
                break;
            case "comments":
                text = `The image has ${value} comments`;
                break;
            case "likes":
                text = `The image has ${value} likes`;
                break;
            case "views":
                text = `The image got viewed ${value} times`;
                break;
            case "tags":
                text = `The image's context is ${value}`;
                break;
            case "template":
                text = `The template's name is ${value}`;
                break;
            case "creator":
                text = `The creator's username is ${value}`;
                break;
            case "createdAt":
                text = `The image got created ${value}`;
                break;
            default:
                text = null;
                break;
        }

        if (text) {
            utterances.push(text);
        }
    }
    return utterances.join(". ");
}
