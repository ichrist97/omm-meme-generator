import express from "express";
import fs from "fs";
import path from "path";
import { CommonRequest, IFile } from "../../types/Types";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import ffmpeg, { AudioVideoFilter } from "fluent-ffmpeg";
import { path as ffprobePath } from "@ffprobe-installer/ffprobe";
import videoshow from "videoshow";
import { IMonkManager } from "monk";
import { Meme } from "../../models/meme";
import { getFileById } from "../fileController";
import {
  Access,
  Caption,
  MediaType,
  MEME_VIDEO_RESPONSE_EVENT,
  resizeImagesToCommonSize,
  ResolutionProps,
} from "meme-generator-lib";
import { User } from "../../models/user";
import {
  bufferToUint8Array,
  fileExists,
  makeDir,
  readFile,
  removeDir,
  statFile,
  writeFile,
} from "../../util/helper";
import http from "http";
import https from "https";
import { Server, ServerOptions } from "socket.io";

export function initLiveVideoStream(
  httpServer: https.Server | http.Server,
  options: Partial<ServerOptions>,
  db: IMonkManager
): void {
  const io = new Server(httpServer, options);
  const roomName = "tvRoom";

  let isRunning = false;
  function startVideoBroadcast() {
    if (!isRunning) {
      console.log("Broadcasting started");
      isRunning = true;
      broadCastVideo();
    }
  }

  function stopVideoBroadcast() {
    const clients = io._nsps.get("/")?.adapter.rooms.get(roomName);
    if (isRunning && (!clients || Object.keys(clients).length === 0)) {
      isRunning = false;
      console.log("Broadcasting stopped");
    }
  }

  async function broadCastVideo() {
    if (isRunning) {
      console.log("Is broadcasting");
      const videoCount = 4;
      const slideDuration = 4;
      const calcDuration = 1;
      const videoPath = (await createSlideshowVideo(db, videoCount, slideDuration)) as string;
      if (videoPath) {
        const file = await readFile(videoPath);
        io.in(roomName).emit(MEME_VIDEO_RESPONSE_EVENT, bufferToUint8Array(file));
        setTimeout(function () {
          broadCastVideo();
        }, 1000 * (videoCount * slideDuration - calcDuration));
      }
    }
  }

  io.on("connection", function (socket) {
    console.log("Socket.io: connected");
    socket.join(roomName);
    startVideoBroadcast();

    socket.on("disconnect", (reason) => {
      stopVideoBroadcast();
    });
  });
}

// init ffmpeg and ffprobe
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

/**
 * Source: https://github.com/daspinola/video-stream-sample
 * Creates slideshow video of random memes from the database
 * Sends the video as chunks to the client
 * @param req request
 * @param res response
 */
async function getMemeVideo(req: CommonRequest, res: express.Response): Promise<void> {
  // limit query parameter
  const limitQuery = req.query.limit as string;
  let limit;
  if (limitQuery) {
    limit = parseInt(limitQuery);
  }

  // create video
  const defaultLimit = 100;
  const videoPath = (await createSlideshowVideo(req.db, limit ?? defaultLimit, 4)) as string;

  if (!videoPath) {
    res.status(500).json({ msg: "Something went wrong while generating video." });
    return;
  }

  // file attributes for response
  const stat = await statFile(videoPath);
  const parentDir = path.dirname(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  try {
    if (range) {
      // cut video file in chunks and send chunks to client
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }

    // delete video directory
    removeDir(parentDir, { recursive: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err });
  }
}

/**
 * Create slideshow video of memes
 * @param db database session
 * @param limit limit of memes to be included in the slideshow
 * @param slideDuration the duration to show a single image in seconds
 */
async function createSlideshowVideo(
  db: IMonkManager,
  limit: number,
  slideDuration: number
): Promise<string | null> {
  /**
   * For creating the slideshow video the images must be temporay written on the filesystem.
   * Afterwards they can be deleted again
   */
  const id = Math.floor(Math.random() * 1000000 + 1); // random number between 0 and 1.000.000
  const videoDir = path.join(global["appRoot"], "tmp", "videostream", id.toString());
  const finalVideoPath = path.join(videoDir, "slideshow.mp4");

  // create video directory if not already existing
  if (!(await fileExists(videoDir))) {
    await makeDir(videoDir, { recursive: true });
  }

  // setup videoshow options of fluent-ffmpeg
  const resolution: ResolutionProps = {
    width: 640,
    height: 512,
  };
  const videoOptions = {
    fps: 24,
    transition: false,
    videoBitrate: 1024,
    videoCodec: "libx264",
    size: `${resolution.width}x?`,
    outputOptions: ["-pix_fmt yuv420p"],
    format: "mp4",
  };

  /**
   * Load images and write them to the filesystem
   * array of images to make the 'videoshow' from
   * make sure all images have the same size
   */
  const imagePaths = await loadImages(db, videoDir, limit, resolution);
  if (imagePaths && imagePaths.length > 0) {
    // prepare images
    const images = imagePaths.map((imagePath) => {
      return {
        path: imagePath,
        loop: slideDuration,
      };
    });

    // render slideshow video
    return new Promise((resolve, reject) => {
      videoshow(images, videoOptions)
        .save(finalVideoPath)
        .on("start", function (command) {
          console.log("encoding " + finalVideoPath + " with command " + command);
        })
        .on("error", function (err) {
          console.error(`Failed creating video: ${err}`);
          reject(err);
        })
        .on("end", function (output) {
          // do stuff here when done
          console.log(`Finished creating video: ${finalVideoPath}`);
          resolve(finalVideoPath);
        });
    });
  }
  return null;
}

/**
 * Load memes from database and write the images to filesystem
 * @param db database session
 * @param videoDirectory temporary directory for writing the image files
 * @param limit limit of memes to be fetched from the database
 * @param resolution the unified resolution of the images
 */
async function loadImages(
  db: IMonkManager,
  videoDirectory: string,
  limit: number,
  resolution: ResolutionProps
): Promise<Array<string> | null> {
  // load images as buffer
  const images = await getMemeImages(db, limit, resolution);

  if (images) {
    /**
     * temporary write images to filesystem in order for videoshow to access them
     * Every image must have the same prefix (in this case `img_`) and a unique index
     */
    const result: string[] = [];
    let indexCounter = 0;

    // write each meme image
    for (const image of images) {
      const index = String(indexCounter).padStart(3, "0");
      indexCounter++;
      const writePath = path.join(videoDirectory, `img_${index}.png`);
      await writeFile(writePath, image);
      result.push(writePath);
    }

    // return paths of temporary files
    return result;
  }
  return null;
}

/**
 * Fetch images of memes from the database
 * @param db database session
 * @param limit limit of memes to be fetched
 * @param resolution the unified resolution of the images
 */
async function getMemeImages(
  db: IMonkManager,
  limit: number,
  resolution: ResolutionProps
): Promise<Buffer[] | null> {
  /**
   * Closure function for loading memes from the database
   * @param db database session
   * @param limit limit of memes to be fetched
   */
  async function loadMemes(db: IMonkManager, limit: number): Promise<Meme[]> {
    const memesCollection = db.get<Meme>("memes");
    return memesCollection
      .aggregate([
        {
          // attribute of entry must match everything
          $match: {
            access: Access.Public,
            mediaType: MediaType.Image,
          },
        },
        {
          // max number of results
          $sample: { size: limit },
        },
      ])
      .then((docs) => {
        return Promise.all(docs.map((doc) => Meme.assign(doc, db)));
      });
  }

  // load memes
  const memes = await loadMemes(db, limit);

  // load images of memes
  const imageFiles: IFile[] = [];
  for (const meme of memes) {
    const imageFile = (await getFileById(db, meme.url as string)) as IFile;
    if (imageFile) {
      imageFiles.push(imageFile);
    }
  }

  // extract binary buffers from images
  const imageBuffers = imageFiles.map((imageFile) => imageFile.data.buffer);

  // resize images to common size
  return resizeImagesToCommonSize(imageBuffers, resolution);
}

/**
 * Create a static video meme. A static video meme is a video meme display the same captions set
 * throughout the whole video. Supported mime type for videos are mp4 and gif.
 * @param user user who created the meme
 * @param access access level of meme
 * @param captions caption set
 * @param template template for meme
 * @param templateType media type of template
 * @param name name of meme
 */
async function createStaticVideoMeme(
  user: User,
  access: Access,
  captions: Caption[],
  template: Buffer,
  templateType: MediaType,
  name: string
): Promise<Meme | null> {
  console.log("Start creating static video meme. This could take a while...");

  // temporary write video to filesystem
  const id = Math.floor(Math.random() * 1000000 + 1);
  const dirPath = path.join(global["appRoot"], "tmp", "video-meme", id.toString());

  // check correct filetype for writing into filesystem
  let fileType: string;
  if (templateType === MediaType.Video) {
    fileType = ".mp4";
  } else if (templateType === MediaType.GIF) {
    fileType = ".gif";
  } else {
    console.error("Unknown or unsupported file type for video meme.");
    return null;
  }

  // write template file temporary to filesystem
  const filePath = path.join(dirPath, `template${fileType}`);
  const memePath = path.join(dirPath, `meme${fileType}`);
  await makeDir(dirPath, { recursive: true });
  await writeFile(filePath, template);

  // render video with caption text
  await renderStaticVideo(filePath, memePath, captions);
  const videoBuffer = await readFile(memePath);

  // remove temporary files from filesystem
  await cleanTempFiles(dirPath);

  // create meme object
  const meme = new Meme(name, access, user.id ?? "");
  meme.mediaType = templateType;
  meme.dataBuffer = videoBuffer;
  return meme;
}

async function cleanTempFiles(fsPath: string) {
  await removeDir(fsPath, { recursive: true });
}

/**
 * Render a static video meme.
 * @param sourcePath absolute path to template video file
 * @param renderPath absolute path to which the rendered video meme should be saved to
 * @param captions caption set
 */
async function renderStaticVideo(
  sourcePath: string,
  renderPath: string,
  captions: Caption[]
): Promise<void> {
  // get attributes of template
  const { width, height } = await readVideoMetadata(sourcePath);

  // setup video filters for captions
  const videoFilters = createCaptionFilters(captions, width, height);

  /**
   * Render the video meme
   * Eslint-disable and ts-ignore is a needed workaround in this case as the ffmpeg object does not
   * have a method to start the rendering process. Instead it starts automatically when the setup
   * is ready
   */
  return new Promise((resolve, reject) => {
    /* eslint-disable */
    // @ts-ignore
    const proc = new ffmpeg({
      // input source, required
      source: sourcePath,
      // timout of the spawned ffmpeg sub-processes in seconds (optional, defaults to 30)
      timeout: 120,
      // default priority for all ffmpeg sub-processes (optional, defaults to 0 which is no priorization)
      priority: 0,
      logger: null,
      // completely disable logging (optional, defaults to false)
      nolog: false,
    })
      // draw caption text
      .videoFilters(videoFilters)
      .on("error", function (err) {
        // The 'error' event is emitted when an error occurs,
        // either when preparing the FFmpeg process or while
        // it is running
        console.log("Cannot process video: " + err.message);
        reject(err);
      })
      .on("end", function () {
        // The 'end' event is emitted when FFmpeg finishes
        // processing.
        console.log("Video meme has been created succesfully");
        resolve();
      })
      .saveToFile(renderPath);
    /* eslint-enable */
  });
}

/**
 * Create video filter objects for caption drawing
 * @see https://ffmpeg.org/ffmpeg-filters.html#drawtext-1
 *
 * @param captions caption set
 * @param videoWidth width of template video
 * @param videoHeight height of template video
 * @param duration the duration of the video
 */
function createCaptionFilters(
  captions: Caption[],
  videoWidth: number,
  videoHeight: number,
  duration?: number
): AudioVideoFilter[] {
  return captions.map((caption, index) => {
    /*
     * positioning of captions is not perfect as the dimensions of the drawn text is not
     * known before drawing it
     */

    // default drawing positions
    let x: number = videoWidth / 2;
    let y: number = videoHeight / 2 + index * 10; // offset for each caption

    // take positions from request params
    if (caption.position) {
      x = caption.position.left * videoWidth;
      y = caption.position.top * videoHeight;
    }

    const fontFace = caption.fontFace;

    const options: string | string[] | { [attr: string]: string | number } = {
      //fontfile: fontPath,
      font: fontFace.fontFamily ?? "Sans",
      text: caption.text,
      fontsize: fontFace.fontSize ?? 30,
      fontcolor: fontFace.color ?? "white",
      x: x,
      y: y,
      bordercolor: fontFace.textStrokeColor ?? "black",
      borderw:
        typeof fontFace.textStrokeWidth === "string" ? parseInt(fontFace.textStrokeWidth) / 2 : 2,
    };
    if (duration && caption.start != undefined && caption.end != undefined) {
      const start = caption.start * duration;
      const end = caption.end * duration;
      options.enable = `gte(t,${start})*lt(t,${end})`;
    }

    // create video filter for caption
    return {
      filter: "drawtext",
      options: options,
    };
  });
}

/**
 * Read metadata from video such as width, height and duration
 * @param videoPath path to video file
 */
function readVideoMetadata(
  videoPath: string
): Promise<{ width: number; height: number; duration?: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      }

      // read metadata
      const width = metadata.streams[0].width ?? 1;
      const height = metadata.streams[0].height ?? 1;
      const duration = parseFloat(metadata.streams[0].duration ?? "0");
      resolve({ width, height, duration });
    });
  });
}

/**
 * Create dynamic video meme. A dynamic video is a video meme displaying different caption set
 * throughout the video.
 * @param user user who created the meme
 * @param access access level of meme
 * @param captions
 * @param template template video
 * @param templateType media type of template
 * @param name name of the meme
 */
async function createDynamicVideoMeme(
  user: User,
  access: Access,
  captions: Caption[],
  template: Buffer,
  templateType: MediaType,
  name: string
): Promise<Meme | null> {
  console.log("Start creating dynamic video meme. This could take a while...");

  // check correct filetype for writing into filesystem
  let fileType: string;
  if (templateType === MediaType.Video) {
    fileType = ".mp4";
  } else if (templateType === MediaType.GIF) {
    fileType = ".gif";
  } else {
    console.error("Unknown or unsupported file type for video meme.");
    return null;
  }

  // temporary write video to filesystem
  const id = Math.floor(Math.random() * 1000000 + 1);
  const dirPath = path.join(global["appRoot"], "tmp", "video-meme", id.toString());
  const filePath = path.join(dirPath, `template${fileType}`);
  await makeDir(dirPath, { recursive: true });
  await writeFile(filePath, template);

  const memeVideoPath = path.join(dirPath, `submeme_${fileType}`);

  // read metadata from template video
  const { width, height, duration } = await readVideoMetadata(filePath);

  await renderSubVideo(filePath, memeVideoPath, captions, width, height, duration);

  // read created video meme
  const videoBuffer = await readFile(memeVideoPath);

  // remove temporary files from filesystem
  await cleanTempFiles(dirPath);

  // create meme object
  const meme = new Meme(name, access, user.id ?? "");
  meme.mediaType = templateType;
  meme.dataBuffer = videoBuffer;
  return meme;
}

/**
 * Render a subvideo from the template video with the specified start index and as long as the
 * render duration
 * @param sourcePath absolute path to template file
 * @param renderPath absolue path to where video should be saved
 * @param captions caption set
 * @param width width of video
 * @param height height of video
 * @param duration render duration for subvideo in template file
 */
async function renderSubVideo(
  sourcePath: string,
  renderPath: string,
  captions: Caption[],
  width: number,
  height: number,
  duration?: number
): Promise<void> {
  // create video filters for caption drawing
  const videoFilters = createCaptionFilters(captions, width, height, duration);

  /**
   * Render the subvideo
   * Eslint-disable and ts-ignore is a needed workaround in this case as the ffmpeg object does not
   * have a method to start the rendering process. Instead it starts automatically when the setup
   * is ready
   */
  return new Promise((resolve, reject) => {
    /* eslint-disable */
    // @ts-ignore
    const proc = new ffmpeg({
      // input source, required
      source: sourcePath,
      // timout of the spawned ffmpeg sub-processes in seconds (optional, defaults to 30)
      timeout: 120,
      // default priority for all ffmpeg sub-processes (optional, defaults to 0 which is no priorization)
      priority: 0,
      logger: null,
      // completely disable logging (optional, defaults to false)
      nolog: false,
    })
      // Skip to specific timestamp
      //.setStartTime(renderStart)
      // only render for duration in captionSet
      //.setDuration(renderDuration - renderStart)
      // draw caption text
      .videoFilters(videoFilters)
      .on("error", function (err) {
        // The 'error' event is emitted when an error occurs,
        // either when preparing the FFmpeg process or while
        // it is running
        console.log("Cannot process video: " + err.message);
        reject(err);
      })
      .on("end", function () {
        // The 'end' event is emitted when FFmpeg finishes
        // processing.
        console.log(`Video ${renderPath} has been created successfully`);
        resolve();
      })
      .saveToFile(renderPath);
    /* eslint-enable */
  });
}

export { getMemeVideo, createStaticVideoMeme, createDynamicVideoMeme };
