import {registerFont} from "canvas";
import {FontFaceDescriptors} from "css-font-loading-module";
import path from "path";

export async function loadFont(
    fontFamily: string,
    fileName: string,
    descriptors?: Partial<FontFaceDescriptors>
): Promise<void> {
    const url = (await import("../assets/fonts/" + fileName)).default;
    const font = new FontFace(fontFamily, `local(${fontFamily}), url(${url})`, descriptors);
    // wait for font to be loaded
    await font.load();
    // add font to document
    document.fonts.add(font);
    // enable font with CSS class
    document.body.classList.add("fonts-loaded");
}

export function loadFonts(isNode: boolean): void {
    for (const cFont of customFonts) {
        if (isNode) {
            registerFont(fontFile(cFont.file), {
                family: cFont.family,
                weight: cFont.descriptors?.weight,
                style: cFont.descriptors?.style,
            });
        } else {
            loadFont(cFont.family, cFont.file, cFont.descriptors).catch((e) => {
                console.log(e);
            });
        }
    }
}

export function getFontFamilies(): string[] {
    return Array.from(new Set(customFonts.map((f) => f.family)));
}

function fontFile(name: string) {
    return path.join(__dirname, "/../assets/fonts/", name);
}

interface CustomFont {
    family: string;
    file: string;
    descriptors?: Partial<FontFaceDescriptors>;
}

const customFonts: CustomFont[] = [
    {
        family: "Komika Axis",
        file: "KomikaAxis-Regular.ttf",
        descriptors: {
            weight: "normal",
            style: "normal",
        },
    },
    {
        family: "Open Sans",
        file: "OpenSans-Regular.ttf",
        descriptors: {
            weight: "normal",
            style: "normal",
        },
    },
    {
        family: "Roboto",
        file: "Roboto-Regular.ttf",
        descriptors: {
            weight: "normal",
            style: "normal",
        },
    },
    {
        family: "Roboto",
        file: "Roboto-Italic.ttf",
        descriptors: {
            weight: "normal",
            style: "italic",
        },
    },
    {
        family: "Roboto",
        file: "Roboto-Bold.ttf",
        descriptors: {
            weight: "bold",
            style: "normal",
        },
    },
    {
        family: "Roboto",
        file: "Roboto-BoldItalic.ttf",
        descriptors: {
            weight: "bold",
            style: "italic",
        },
    },
    {
        family: "Times New Roman",
        file: "TimesNewRoman-Regular.ttf",
        descriptors: {
            weight: "normal",
            style: "normal",
        },
    },
    {
        family: "Times New Roman",
        file: "TimesNewRoman-Italic.ttf",
        descriptors: {
            weight: "normal",
            style: "italic",
        },
    },
    {
        family: "Times New Roman",
        file: "TimesNewRoman-Bold.ttf",
        descriptors: {
            weight: "bold",
            style: "normal",
        },
    },
    {
        family: "Times New Roman",
        file: "TimesNewRoman-BoldItalic.ttf",
        descriptors: {
            weight: "bold",
            style: "italic",
        },
    },
    {
        family: "Courier New",
        file: "CourierNew-Regular.ttf",
        descriptors: {
            weight: "normal",
            style: "normal",
        },
    },
    {
        family: "Courier New",
        file: "CourierNew-Italic.ttf",
        descriptors: {
            weight: "normal",
            style: "italic",
        },
    },
    {
        family: "Courier New",
        file: "CourierNew-Bold.ttf",
        descriptors: {
            weight: "bold",
            style: "normal",
        },
    },
    {
        family: "Courier New",
        file: "CourierNew-BoldItalic.ttf",
        descriptors: {
            weight: "bold",
            style: "italic",
        },
    },
];
