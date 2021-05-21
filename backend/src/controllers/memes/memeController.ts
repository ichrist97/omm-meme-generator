import express from "express";
import { CommonRequest, MemeQuery } from "../../types/Types";
import { includesSubArray } from "../../util/helper";
import { validateCaptions } from "../../util/captions";
import { Meme } from "../../models/meme";
import { Comment } from "../../models/comment";
import { Like } from "../../models/like";
import { IMonkManager } from "monk";
import {
  Access,
  Caption,
  IComment,
  ILike,
  IMeme,
  IMemeRelations,
  ITempMeme,
  MediaType,
  VideoMemeType,
} from "meme-generator-lib";
import { Template } from "../../models/template";
import { User } from "../../models/user";
import { getFileById } from "../fileController";
import { createDynamicVideoMeme, createStaticVideoMeme } from "./memesVideoController";
import { MemeFile } from "../../models/file";
import { mapLikes } from "../tempMemeController";

/**
 * Shared interface for creating memes
 * Possible meme types are: Static image memes (jpeg, png), static video memes (mp4, gif) and
 * dynamic video memes (mp4, gif)
 * The template can be either provided as a direct file upload or as a database reference to
 * a template
 * @param req request
 * @param res response
 */
async function createMeme(req: CommonRequest, res: express.Response): Promise<void> {
  try {
    if ((!req.body.template && !req.files) || !req.body.access || !req.body.captions) {
      res.status(400).json({ msg: "Bad request: Parameters missing" });
      return;
    }

    // read parameters from request body
    const captions: Caption[] = JSON.parse(req.body.captions);

    // decide mediaType of template
    let template: Template | null;
    let mediaType: MediaType;
    if (req.files && req.files.template) {
      // is file upload
      const mimeType = req.files.template.mimetype;
      const tmpMediaType = MemeFile.getMediaType(mimeType);
      if (!tmpMediaType) {
        // error fallback
        res.status(415).json({ err: "Mimetype of supplied file is not supported." });
        return;
      }
      mediaType = tmpMediaType;
      template = null;
    } else if (req.body.template) {
      // is database reference
      template = await Template.getById(req.body.template, req.db);
      if (!template) {
        res.status(500).json({ msg: "Could not fetch template" });
        return;
      }
      mediaType = template.mediaType;
    } else {
      // error fallback
      res.status(400).json({ msg: "Invalid template" });
      return;
    }

    // validate captions
    const { isValid, memeType } = validateCaptions(captions, mediaType);
    if (!isValid) {
      res.status(400).json({ msg: "Bad request: invalid captions" });
      return;
    }

    // optional params
    const access = req.body.access;
    const memeName = req.body.name ?? "Untitled";
    let tags: string[];
    try {
      if (req.body.tags) {
        tags = JSON.parse(req.body.tags);
      } else {
        tags = [];
      }
    } catch (err) {
      res.status(400).json({ msg: "Invalid tags" });
      return;
    }

    // if template was supplied as a file, then take binary data from file, else fetch from database
    let templateBuffer: Buffer | null;
    if (!template) {
      templateBuffer = req.files.template.data;
    } else {
      const templateFile = await getFileById(req.db, template.url);
      templateBuffer = templateFile ? templateFile.data.buffer : null;
    }

    if (!templateBuffer) {
      res.status(500).json({ msg: "Failed getting binary of template" });
    }

    // create the meme depending on its media type
    let meme: Meme | null = null;

    let isDraft = false;
    if (req.body.isDraft) {
      isDraft = JSON.parse(req.body.isDraft);
    }

    if (isDraft) {
      meme = new Meme(memeName, access, req.user.id ?? "");
      meme.mediaType = mediaType;
    } else {
      // static image meme
      if (mediaType === MediaType.Image) {
        meme = await createImageMeme(
          req.user,
          access,
          captions,
          templateBuffer as Buffer,
          memeName
        );
      } else if (mediaType === MediaType.Video || mediaType === MediaType.GIF) {
        // decide whether static or dynamic video meme
        if (memeType === VideoMemeType.Static) {
          // static video meme
          meme = await createStaticVideoMeme(
            req.user,
            access,
            captions,
            templateBuffer as Buffer,
            mediaType,
            memeName
          );
        } else if (memeType === VideoMemeType.Dynamic) {
          // dynamic video meme
          meme = await createDynamicVideoMeme(
            req.user,
            access,
            captions,
            templateBuffer as Buffer,
            mediaType,
            memeName
          );
        }
      } else {
        // fallback
        meme = null;
      }
    }

    if (!meme) {
      res.status(500).json({ msg: "Meme creation failed" });
      return;
    }

    // add template reference if template was not provided as file
    if (template && template.id) {
      meme.template = template.id;
    }
    // add captions
    meme.captions = captions;
    // add tags
    meme.tags = tags;

    // Upload meme to database
    const iMeme = await meme.uploadToDatabase(req.db, mediaType);
    if (!iMeme) {
      res.status(500).json({ msg: "Meme upload failed" });
      return;
    }

    const newMeme = await Meme.assign(iMeme, req.db);
    newMeme.alterImgUrl(req.protocol, req.headers.host);

    //send response
    res.json({
      msg: "Meme got created",
      data: newMeme,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}

/**
 * Create static image meme
 * @param user user who created the meme
 * @param access access level of meme
 * @param captions caption set
 * @param template template of meme
 * @param name name of meme
 */
async function createImageMeme(
  user: User,
  access: Access,
  captions: Caption[],
  template: Buffer,
  name: string
): Promise<Meme | null> {
  // create meme and render image
  const meme = new Meme(name, access ?? Access.Public, user.id ?? "");
  meme.mediaType = MediaType.Image;
  meme.dataBuffer = await Meme.render(template, captions);
  return meme;
}

/**
 * Parses query parameters from the request for filtering memes
 * @param req request
 */
function handleQueries(req: CommonRequest): MemeQuery | null {
  const limitQuery = req.query.limit as string;
  const likesQuery = req.query.likes as string;
  const viewsQuery = req.query.views as string;
  const createdAfterQuery = req.query.createdAfter as string;
  const createdBeforeQuery = req.query.createdBefore as string;
  const mediaTypeQuery = req.query.mediaType as MediaType;
  const templateQuery = req.query.template as string;
  const viewsSortQuery = req.query.viewsSort as string;
  const likesSortQuery = req.query.likesSort as string;
  const createdSortQuery = req.query.createdSort as string;
  const commentsSortQuery = req.query.commentsSort as string;
  const nameQuery = req.query.name as string;
  let tagsQuery: string[] | null = null;
  try {
    if (req.query.tags) {
      tagsQuery = JSON.parse(req.query.tags as string);
    }
  } catch (err) {
    return null;
  }
  const query: MemeQuery = {};

  // limit
  let limit;
  if (limitQuery) {
    limit = parseInt(limitQuery);
    query.limit = limit;
  }

  // likes
  let likes;
  if (likesQuery) {
    likes = parseInt(likesQuery);
    query.likesCount = likes;
  }

  // views
  let views;
  if (viewsQuery) {
    views = parseInt(viewsQuery);
    query.viewsCount = views;
  }

  // createdAfter
  let createdAfter;
  if (createdAfterQuery) {
    createdAfter = new Date(createdAfterQuery);
    query.createdAfter = createdAfter;
  }

  // createdBefore
  let createdBefore;
  if (createdBeforeQuery) {
    createdBefore = new Date(createdBeforeQuery);
    query.createdBefore = createdBefore;
  }

  // mediaType
  let mediaType;
  if (mediaTypeQuery) {
    mediaType = mediaTypeQuery;
    query.mediaType = mediaType;
  }

  // template
  let template;
  if (templateQuery) {
    template = templateQuery;
    query.template = template;
  }

  // viewsSort
  let viewsSort;
  if (viewsSortQuery) {
    viewsSort = viewsSortQuery;
    query.viewsSort = viewsSort;
  }

  // likesSort
  let likesSort;
  if (likesSortQuery) {
    likesSort = likesSortQuery;
    query.likesSort = likesSort;
  }

  // createdSort
  let createdSort;
  if (createdSortQuery) {
    createdSort = createdSortQuery;
    query.createdSort = createdSort;
  }

  // commentsSort
  let commentsSort;
  if (commentsSortQuery) {
    commentsSort = commentsSortQuery;
    query.commentsSort = commentsSort;
  }

  //name
  let name;
  if (nameQuery) {
    name = nameQuery;
    query.name = name;
  }

  // tags
  if (tagsQuery) {
    query.tags = tagsQuery;
  }

  return query;
}

/**
 * Query memes from the database with a maximum limit of items
 * @param db database session
 * @param limit max items to be retrieved
 */
async function queryPublicMemes(db: IMonkManager, limit: number): Promise<Meme[] | null> {
  const memesCollection = db.get<IMeme>("memes");
  // Memes must have a url (otherwise it's a draft)
  return memesCollection
    .find({ access: Access.Public, url: { $ne: null } }, { limit: limit })
    .then((docs) => {
      return Promise.all(docs.map((m) => Meme.assign(m, db)));
    })
    .catch((err: Error) => {
      console.error(err);
      return null;
    });
}

/**
 * Filter the retrieved memes by query parameters
 *
 * @param memes list of memes
 * @param likeMap mapped likes for each meme
 * @param commentsMap mapped comments for each meme
 * @param query the query params
 */
function filterMemes(
  memes: Array<Meme>,
  likeMap: Map<ITempMeme, ILike[]>,
  commentsMap: Map<Meme, IComment[]>,
  query: MemeQuery
): Meme[] {
  // no filters present
  if (
    !query.viewsCount &&
    !query.likesCount &&
    !query.createdAfter &&
    !query.createdBefore &&
    !query.commentsCount &&
    !query.mediaType &&
    !query.name &&
    !query.template &&
    !query.viewsSort &&
    !query.likesSort &&
    !query.createdSort &&
    !query.commentsSort &&
    !query.tags
  ) {
    return memes;
  }

  // filter by views
  if (query.viewsCount) {
    memes = memes.filter((meme) => {
      return meme["views"] >= (query.viewsCount ?? 0);
    });
  }

  // filter by likes
  if (query.likesCount) {
    memes = memes.filter((meme) => {
      const likes = likeMap.get(meme);
      return likes ? likes.length >= (query.likesCount ?? 0) : false;
    });
  }

  // filter by comments
  if (query.commentsCount) {
    memes = memes.filter((meme) => {
      const comments = commentsMap.get(meme);
      return comments ? comments.length >= (query.commentsCount ?? 0) : false;
    });
  }

  // filter by createdAfter
  if (query.createdAfter) {
    memes = memes.filter((meme) => {
      return meme["createdAt"].getTime() > (query.createdAfter ?? new Date("1970-01-01")).getTime();
    });
  }

  // filter by createdBefore
  if (query.createdBefore) {
    memes = memes.filter((meme) => {
      return meme["createdAt"].getTime() < (query.createdBefore ?? new Date()).getTime();
    });
  }

  // filter by mediaType
  if (query.mediaType) {
    memes = memes.filter((meme) => {
      return meme["mediaType"] == query.mediaType;
    });
  }

  // name
  if (query.name) {
    memes = memes.filter((meme) => {
      const lowercaseName = meme.name?.toLowerCase();
      return lowercaseName.includes((query.name as string).toLowerCase());
    });
  }

  // template
  if (query.template) {
    memes = memes.filter((meme) => {
      return meme["template"] == query.template;
    });
  }

  // tags
  if (query.tags) {
    memes = memes.filter((meme) => {
      return includesSubArray(meme.tags, query.tags as string[]);
    });
  }

  if (query.viewsSort && memes.length > 1) {
    memes = memes.sort((a, b) => {
      // Sort by views
      // If the first item has a higher number, move it up
      // If the first item has a lower number, move it down
      return b.views - a.views;
    });
  }

  if (query.likesSort && memes.length > 1) {
    memes = memes.sort((a, b) => {
      const likesA = likeMap.get(a);
      const likesB = likeMap.get(b);
      if (likesA && likesB) {
        return likesB.length - likesA.length;
      } else return 0;
    });
  }
  // createdDate
  if (query.createdSort && memes.length > 1) {
    memes = memes.sort((a, b) => {
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  if (query.commentsSort && memes.length > 1) {
    memes = memes.sort((a, b) => {
      const commentA = commentsMap.get(a);
      const commentB = commentsMap.get(b);
      if (commentA && commentB) {
        return commentB.length - commentA.length;
      } else return 0;
    });
  }

  return memes;
}

/**
 * Get memes from the database
 * Retrieve all public memes and the private memes of the logged in user
 * @param req request
 * @param res response
 */
async function getPublicMemes(req: CommonRequest, res: express.Response): Promise<void> {
  // query parameters
  const query = handleQueries(req);
  if (!query) {
    res.status(400).json({ msg: "Invalid query" });
    return;
  }

  // get public memes from database
  const memes = await queryPublicMemes(req.db, query.limit ? query.limit : Number.MAX_SAFE_INTEGER);

  if (!memes) {
    res.status(500).json({ msg: "Failed fetching memes" });
    return;
  }

  // map likes and comments to each meme so we can filter the memes later
  const commentMap = await mapComments(memes, req.db);
  const likeMap = await mapLikes(memes, req.db);

  // filter memes according to query
  const filtered = filterMemes(memes, likeMap, commentMap, query);

  const relationMemes = filtered.map((meme) => {
    // append likes and comments to each meme
    const likes = likeMap.get(meme);
    const comments = commentMap.get(meme) ?? [];

    meme.alterImgUrl(req.protocol, req.headers.host);
    const memeRelations: IMemeRelations = { ...meme.toJSON(), likes, comments };
    return memeRelations;
  });

  res.json({
    msg: "Ok",
    data: relationMemes,
  });
}

/**
 * Retrieve all comments for each meme and organize them in a map for each meme.
 *
 * @param memes list of memes
 * @param db database session
 */
async function mapComments(memes: Meme[], db: IMonkManager): Promise<Map<Meme, IComment[]>> {
  const commentMap = new Map();

  // for each meme
  for (const meme of memes) {
    // map comments
    const comments = await Comment.getCommentsByMemeId(meme.id ?? "", db);
    if (comments) {
      const iComments = comments.map((c) => c.toJSON());
      commentMap.set(meme, iComments);
    }
  }
  return commentMap;
}

/**
 * Create comment for a meme
 * @param req request
 * @param res response
 */
async function commentMeme(req: CommonRequest, res: express.Response): Promise<void> {
  try {
    // create and upload comment to database
    const userId = req.user.id ?? "";
    const username = req.user.username;
    const memeId = req.body.memeId;
    const text = req.body.text;
    const meme = await Meme.getById(memeId, req.db);

    if (!memeId || !text) {
      res.status(400).json({ msg: "Parameters missing" });
      return;
    }

    // meme not existing
    if (!meme) {
      res.status(400).json({ msg: "Meme id not existing" });
      return;
    }

    // create comment
    const iComment = await meme.comment(userId, username, text, req.db);

    //send response
    res.json({
      msg: "Comment for meme got created",
      data: iComment,
    });
  } catch (err) {
    res.status(500).json({ msg: err });
  }
}

/**
 * Get all memes a single user has created
 * @param req request
 * @param res response
 */
async function getUserMemes(req: CommonRequest, res: express.Response): Promise<void> {
  try {
    // Make sure username was provided
    if (!req.params["userId"]) {
      res.status(400).json({ msg: "UserId not provided" });
      return;
    }
    const userId = req.params["userId"];

    // user not existing
    if (!req.user) {
      res.status(400).json({ msg: "User not existing" });
      return;
    }

    // only authenticated user is allowed to see his memes
    if (userId !== req.user.id) {
      res.status(403).json({ msg: "Forbidden" });
      return;
    }

    let isDraft = false;
    if (req.query.isDraft) {
      isDraft = JSON.parse(req.query.isDraft as string);
    }

    let relationMemes: IMemeRelations[];
    if (isDraft) {
      const memes = await req.user.loadDraftMemes(req.db);

      if (!memes) {
        res.status(500).json({ msg: "Failed fetching user draft memes" });
        return;
      }

      res.json({
        msg: "Ok",
        data: memes,
      });
    } else {
      // query parameters and load memes
      const query = handleQueries(req);
      if (!query) {
        res.status(400).json({ msg: "Invalid query" });
        return;
      }

      const memes = await req.user.loadMemes(req.db);

      if (!memes) {
        res.status(500).json({ msg: "Failed fetching user memes" });
        return;
      }

      // map likes and comments
      const commentMap = await mapComments(memes, req.db);
      const likeMap = await mapLikes(memes, req.db);

      // filter memes according to query
      const filtered = filterMemes(memes, likeMap, commentMap, query);

      // append likes and comments to each meme
      relationMemes = filtered.map((meme) => {
        const likes = likeMap.get(meme);
        const comments = commentMap.get(meme) ?? [];
        meme.alterImgUrl(req.protocol, req.headers.host);
        const memeRelations: IMemeRelations = { ...meme.toJSON(), likes, comments };
        return memeRelations;
      });

      res.json({
        msg: "Ok",
        data: relationMemes,
      });
    }
  } catch (err) {
    res.status(500).json({ msg: err });
  }
}

/**
 * Get a single meme by its id
 * @param req request
 * @param res response
 */
async function getSingleMeme(req: CommonRequest, res: express.Response): Promise<void> {
  try {
    // Make sure id was provided
    if (!req.params["id"]) {
      res.status(400).json({ msg: "ID not provided" });
      return;
    }

    const id = req.params["id"];
    const meme = (await Meme.getById(id, req.db)) as Meme;

    // meme not existing
    if (!meme) {
      res.status(400).json({ msg: "Meme not existing" });
      return;
    }

    // make sure meme is public or user authorized to see meme
    if (meme.access === Access.Private && req.user.id !== meme.owner) {
      res.status(403).json({ msg: "User not authorized" });
      return;
    }

    // append likes
    const likes = await Like.getLikesByTempMemeId(meme.id ?? "", req.db);
    let iLikes: ILike[] = [];
    if (likes) {
      iLikes = likes.map((l) => l.toJSON());
    }
    // append comments
    const comments = await Comment.getCommentsByMemeId(meme.id ?? "", req.db);
    let iComments: IComment[] = [];
    if (comments) {
      iComments = comments.map((c) => c.toJSON());
    }

    // increment view count of meme
    await increaseMemeViewsInDatabase(req.db, meme.id ?? "");

    const memeRelations: IMemeRelations = {
      ...meme.toJSON(),
      likes: iLikes || [],
      comments: iComments || [],
    };
    meme.alterImgUrl(req.protocol, req.headers.host);
    res.json({
      msg: "Ok",
      data: memeRelations,
    });
  } catch (err) {
    res.status(500).json({ msg: err });
  }
}

/**
 * Increase view count of meme
 * @param db database session
 * @param memeId id of meme
 */
async function increaseMemeViewsInDatabase(db: IMonkManager, memeId: string): Promise<void> {
  const meme = await Meme.getById(memeId, db);
  if (meme) {
    await meme.view(db);
  }
}

export {
  createMeme,
  getSingleMeme,
  getPublicMemes,
  getUserMemes,
  commentMeme,
  handleQueries,
  queryPublicMemes,
  mapComments,
  filterMemes,
  increaseMemeViewsInDatabase,
};
