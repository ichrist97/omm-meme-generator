import { Caption, MediaType, VideoMemeType } from "meme-generator-lib";

interface ValidateProps {
  isValid: boolean;
  memeType?: VideoMemeType;
}

/**
 * check for required or illegal parameters in captions
 * Returns tuple of {isValid, MemeType}
 * MemeType and duration of captionSet are only not null when isValid is true
 * @param captions
 * @param mediaType
 */
export function validateCaptions(captions: Caption[], mediaType: MediaType): ValidateProps {
  // check if all durations in a caption set are equal

  for (const caption of captions) {
    if (!caption.fontFace) {
      return { isValid: false };
    }
    const fontFace = caption.fontFace;

    // required params
    if (!fontFace.fontSize) {
      return { isValid: false };
    }

    // check duration if specified
    if (mediaType !== MediaType.Image) {
      // does not contain duration
      if (caption.start == undefined || caption.end == undefined) {
        return {
          isValid: true,
          memeType: VideoMemeType.Static,
        };
      }
    } else if (caption.start || caption.end) {
      return {
        isValid: false,
      };
    }
  }

  return {
    isValid: true,
    memeType: VideoMemeType.Dynamic,
  };
}
