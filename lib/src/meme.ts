import {Canvas, CanvasRenderingContext2D, createCanvas, Image} from "canvas";
import {createCanvas as createCanvasBrowser, loadImage} from "./util/canvasBrowser";
import {binaryToBase64} from "./util/helper";
import {Access, Align, Caption, IComment, MediaType, FontFace as IFontFace, ITempMeme, MemeProvider} from "./index";
import {loadFonts} from "./fonts/FontHelper";

export interface IMeme extends ITempMeme {
    views: number;
    template: string | null;
    captions: Caption[];
    tags: string[];
}

export interface IMemeRelations extends IMeme {
    comments: IComment[];
}

function isNode(): boolean {
    return typeof window === "undefined";
}

loadFonts(isNode());

const DEFAULT_FONT_FACE = {
    fontStyle: "normal",
    fontWeight: "normal",
    fontSize: 40,
    fontFamily: "Roboto",
    fontVariant: "normal",
    color: "white",
    textStrokeColor: "black",
    textStrokeWidth: 4,
};

export abstract class LibMeme implements IMeme {
    abstract id?: string | null;
    abstract createdAt: Date;
    abstract access: Access;
    abstract owner?: string;
    abstract url: string | null;
    abstract name: string;
    abstract views: number;
    abstract mediaType: MediaType;
    abstract template: string | null;
    abstract captions: Caption[];
    abstract tags: string[];
    abstract provider?: MemeProvider;

    static async prepareImage(img: Buffer | string): Promise<Image | HTMLImageElement> {
        if (img instanceof Buffer) {
            const template = new Image();
            template.src = `data:image/png;base64,${binaryToBase64(img)}`;
            return template;
        } else {
            return await loadImage(img, {crossOrigin: "anonymous"});
        }
    }

    static async render<T extends Buffer | string>(img: T, captions: Caption[]): Promise<T> {
        const template = await this.prepareImage(img);

        // setup canvas according to template size
        const width = template.width;
        const height = template.height;
        const margin = height * 0.08; // 8%
        const innerHeight = height - 2 * margin;

        const canvas = isNode() ? createCanvas(width, height) : createCanvasBrowser(width, height);
        const context = canvas.getContext("2d") as CanvasRenderingContext2D;

        // draw image
        context.drawImage(template, 0, 0);

        for (let i = 0; i < captions.length; i++) {
            const caption = captions[i];

            const text = caption.text;
            let x, y;
            let horizontalAlign = Align.Center;
            let verticalAlign = Align.Center;
            if (caption.grid) {
                // calculate coordinates for grid position
                ({x, y} = this.calcGridPosition(width, height, margin, caption.grid.gridCol, caption.grid.gridRow));
            } else if (caption.position) {
                x = width * caption.position.left;
                y = height * caption.position.top;
                horizontalAlign = Align.Start;
                verticalAlign = Align.Start;
            } else {
                x = width / 2;
                if (captions.length < 2) {
                    y = margin;
                } else {
                    // 1.5 * margin as text is centered vertically
                    y = (innerHeight / (captions.length - 1)) * i + margin;
                }
            }

            // draw
            const fontFace = caption.fontFace ?? (DEFAULT_FONT_FACE as IFontFace);
            this.drawCaption(context, text, x, y, horizontalAlign, verticalAlign, fontFace);
        }

        // upload
        if (typeof Canvas === "function" && canvas instanceof Canvas) {
            return <T>canvas.toBuffer("image/jpeg");
        } else {
            return <T>canvas.toDataURL("image/jpeg");
        }
    }

    private static drawCaption(
        context: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        horizontalAlign = Align.Center,
        verticalAlign = Align.Center,
        fontFace: IFontFace
    ): void {
        // default values if not explicitly specified or wrong type
        if (!fontFace.fontSize) {
            //fontFace.fontSize = `${DEFAULT_FONT_FACE.fontSize}px`;
            fontFace.fontSize = DEFAULT_FONT_FACE.fontSize;
        }
        let fontSize = fontFace.fontSize;
        if (typeof fontSize === "number") {
            fontSize = `${fontFace.fontSize}px`;
        }

        if (!fontFace.fontFamily) {
            fontFace.fontFamily = DEFAULT_FONT_FACE.fontFamily;
        }
        if (!fontFace.fontStyle) {
            fontFace.fontStyle = DEFAULT_FONT_FACE.fontStyle;
        }
        if (!fontFace.fontVariant) {
            fontFace.fontVariant = DEFAULT_FONT_FACE.fontVariant;
        }
        if (!fontFace.fontWeight) {
            fontFace.fontWeight = "normal";
        }
        if (!fontFace.color) {
            fontFace.color = DEFAULT_FONT_FACE.color;
        }
        if (!fontFace.textStrokeColor) {
            fontFace.textStrokeColor = DEFAULT_FONT_FACE.textStrokeColor;
        }
        if (!fontFace.textStrokeWidth) {
            fontFace.textStrokeWidth = `${DEFAULT_FONT_FACE.textStrokeWidth}px`;
        }

        // context style
        context.fillStyle = fontFace.color;
        context.strokeStyle = fontFace.textStrokeColor;
        context.lineWidth = parseInt(fontFace.textStrokeWidth);
        context.font = `${fontFace.fontStyle} ${fontFace.fontVariant} ${fontFace.fontWeight} ${fontSize} ${fontFace.fontFamily}`;

        let textWidth = 0;
        let textHeight = 0;
        const metrics = context.measureText(text);
        if (horizontalAlign == Align.Center) {
            textWidth = metrics.width / 2;
        } else if (horizontalAlign === Align.End) {
            textWidth = metrics.width;
        }

        if (verticalAlign == Align.Center) {
            // The distance from text baseline
            textHeight = (metrics.actualBoundingBoxAscent || metrics.fontBoundingBoxAscent) / 2;
        } else if (verticalAlign === Align.Start) {
            textHeight = metrics.actualBoundingBoxAscent || metrics.fontBoundingBoxAscent;
        }

        context.strokeText(text, x - textWidth, y + textHeight);
        context.fillText(text, x - textWidth, y + textHeight);
    }

    private static calcGridPosition(
        canvasWidth: number,
        canvasHeight: number,
        margin: number,
        positionCol: number,
        positionRow: number
    ) {
        let x;
        switch (positionCol) {
            case 0:
                x = margin;
                break;
            case 1:
                x = canvasWidth / 2;
                break;
            case 2:
                x = canvasWidth - margin;
                break;
            default:
                x = 0;
                break;
        }
        let y;
        switch (positionRow) {
            case 0:
                y = margin;
                break;
            case 1:
                y = canvasHeight / 2;
                break;
            case 2:
                y = canvasHeight - margin;
                break;
            default:
                y = 0;
                break;
        }

        return {x, y};
    }
}
