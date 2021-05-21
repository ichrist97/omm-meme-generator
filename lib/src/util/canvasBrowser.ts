/**
 * Source:
 * https://github.com/Automattic/node-canvas/blob/master/browser.js
 */

/* globals document, ImageData */

// import * as parseFont from "./parseFont";
// export {parseFont};

export function createCanvas(width: number, height: number): HTMLCanvasElement {
    return Object.assign(document.createElement("canvas"), {width: width, height: height});
}

export function createImageData(array: Uint8ClampedArray, width: number, height: number): ImageData {
    // Browser implementation of ImageData looks at the number of arguments passed
    return new ImageData(array, width, height);
}

export function loadImage(src: string, options: Partial<HTMLImageElement> = {}): Promise<HTMLImageElement> {
    return new Promise(function (resolve, reject) {
        const image: HTMLImageElement = Object.assign(document.createElement("img"), options);

        function cleanup() {
            image.onload = null;
            image.onerror = null;
        }

        image.onload = function () {
            cleanup();
            resolve(image);
        };
        image.onerror = function () {
            cleanup();
            reject(new Error('Failed to load the image "' + src + '"'));
        };

        image.src = src;
    });
}
