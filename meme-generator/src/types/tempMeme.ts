/**
 * Interface for wrapping the global window object
 */
import {Access, ILike, IMeme, ITemplate, ITempMeme, MediaType, MemeProvider} from "meme-generator-lib";

export class HybridTempMeme implements ITempMeme {
    private _template: ITemplate;
    private _meme: IMeme | null;

    static async createAsync(
        tempMeme: ITempMeme,
        getTemplate: (id: string) => Promise<ITemplate | null>
    ): Promise<HybridTempMeme | null> {
        const tmpMeme = tempMeme as IMeme;
        if (tmpMeme.template) {
            const t = await getTemplate(tmpMeme.template);
            if (!t) return null;
            return new this(t, tmpMeme);
        } else {
            return new this(tempMeme as ITemplate);
        }
    }

    constructor(template: ITemplate, meme: IMeme | null = null) {
        this._template = template;
        this._meme = meme;
    }

    get template(): ITemplate {
        return this._template;
    }

    get meme(): IMeme | null {
        return this._meme;
    }

    /**
     * Is template only without meme.
     */
    get isTemplate(): boolean {
        return this._meme == null;
    }

    get id(): string | null {
        return this._meme?.id ?? this._template.id ?? null;
    }

    get access(): Access {
        return this._meme?.access ?? this._template.access;
    }

    get createdAt(): Date {
        return this._meme?.createdAt ?? this._template.createdAt;
    }

    get mediaType(): MediaType {
        return this._meme?.mediaType ?? this._template.mediaType;
    }

    get name(): string {
        return this._meme?.name ?? this._template.name;
    }

    get url(): string | null {
        return this._meme?.url ?? this._template.url;
    }

    get owner(): string | null {
        return this._meme?.owner ?? this._template.owner ?? null;
    }

    get views(): number {
        return this._meme?.views ?? this._template.views ?? 0;
    }
    get likes(): ILike[] {
        return this._meme?.likes ?? this._template.likes ?? [];
    }

    get provider(): MemeProvider {
        return this._meme?.provider ?? this._template.provider ?? MemeProvider.Server;
    }
}
