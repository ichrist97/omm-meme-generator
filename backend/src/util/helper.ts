import fs from "fs";
import util from "util";
import { Canvas } from "canvas";

/**
 * For debugging
 * Write canvas to filesystem
 * @param canvas 2dcanvas containing image
 */
export function printImage(canvas: Canvas): void {
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync("./test.png", buffer);
}

/**
 * Promisify filesystem functions
 */
export const makeDir = util.promisify(fs.mkdir);
export const writeFile = util.promisify(fs.writeFile);
export const readFile = util.promisify(fs.readFile);
export const statFile = util.promisify(fs.stat);
export const removeDir = util.promisify(fs.rmdir);
export const fileExists = (path: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err) => {
      // file does not exists
      if (err && err.code === "ENOENT") {
        resolve(false);
      }
      // other error
      if (err) {
        reject(err);
      }
      // file exists
      resolve(true);
    });
  });
};

/**
 * Delete file in filesystem after timout
 * @param fsPath absolute filepath
 * @param timeout timeout in milliseconds
 */
export function deleteFileAfterTime(fsPath: string, timeout = 300000): void {
  setTimeout(() => {
    // delete the file
    fs.unlink(fsPath, (err) => {
      if (err) {
        throw err;
      }
      console.log(`File: ${fsPath} is deleted`);
    });
  }, timeout);
}

/**
 * Delete directory in filesystem after timout
 * @param fsPath absolute filepath
 * @param timeout timeout in milliseconds
 */
export function deleteDirAfterTime(fsPath: string, timeout = 300000): void {
  setTimeout(() => {
    // delete the video
    fs.rmdir(fsPath, { recursive: true }, (err) => {
      if (err) {
        throw err;
      }
      console.log(`File: ${fsPath} is deleted`);
    });
  }, timeout);
}

/**
 * Checks whether every element in subarray is present in an array
 * @param arr master array
 * @param sub sub array
 */
export function includesSubArray(arr: string[], sub: string[]): boolean {
  return sub.every(((i) => (value: string) => (i = arr.indexOf(value, i) + 1))(0));
}

/**
 * Convert buffer to Uint8Array (e.g. for frontend)
 *
 * @param b the buffer to convert
 */
export function bufferToUint8Array(b: Buffer): ArrayBuffer {
  // Slice (copy) its segment of the underlying ArrayBuffer
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}
