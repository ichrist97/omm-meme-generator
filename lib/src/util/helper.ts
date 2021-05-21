import {createCanvas, Image} from "canvas";

export function objectDefined<T>(obj: T): T {
    const acc: Partial<T> = {};
    for (const key in obj) {
        if (obj[key] !== undefined) acc[key] = obj[key];
    }
    return acc as T;
}

export function jsonifyAttributes(obj: {[name: string]: any}): {[name: string]: string | number} {
    const jsonFilterProps: {[name: string]: string | number} = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "string" || typeof value === "number") {
            jsonFilterProps[key] = value;
        } else if (value instanceof Date) {
            jsonFilterProps[key] = value.toISOString();
        } else {
            jsonFilterProps[key] = value.toString();
        }
    }
    return jsonFilterProps;
}

export function stringifyAttributes(obj: {[name: string]: any}): {[name: string]: string} {
    const jsonFilterProps: {[name: string]: string} = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "string") {
            jsonFilterProps[key] = value;
        } else if (value instanceof Date) {
            jsonFilterProps[key] = value.toISOString();
        } else {
            jsonFilterProps[key] = value.toString();
        }
    }
    return jsonFilterProps;
}

export function binaryToBase64(binary: Buffer): string {
    return binary.toString("base64");
}

export function base64ToBinary(str: string): Buffer {
    return Buffer.from(str, "base64");
}

export interface ResolutionProps {
    width: number;
    height: number;
}

export function resizeImagesToCommonSize(images: Buffer[], resolution?: ResolutionProps): Buffer[] {
    // get width and height of biggest image
    let maxWidth = 0;
    let maxHeight = 0;
    const canvasImages: Image[] = [];
    images.forEach((image) => {
        const img = new Image();
        img.src = image;
        canvasImages.push(img);

        // check dimensions
        if (img.width > maxWidth) {
            maxWidth = img.width;
        }
        if (img.height > maxHeight) {
            maxHeight = img.height;
        }
    });
    if (resolution) {
        maxWidth = resolution.width;
        maxHeight = resolution.height;
    }

    // resize all images
    const resized = canvasImages.map((image) => {
        // setup canvas
        const canvas = createCanvas(maxWidth, maxHeight);
        const context = canvas.getContext("2d");

        // embed image
        const imageRatio = image.width / image.height;
        const canvasRatio = maxWidth / maxHeight;

        const width = imageRatio > canvasRatio ? maxWidth : maxHeight * imageRatio;
        const height = imageRatio > canvasRatio ? maxWidth / imageRatio : maxHeight;
        const dx = (maxWidth - width) / 2;
        const dy = (maxHeight - height) / 2;
        context.drawImage(image, dx, dy, width, height);
        return canvas.toBuffer("image/png");
    });
    return resized;
}
