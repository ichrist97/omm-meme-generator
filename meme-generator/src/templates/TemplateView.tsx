import {Box, Button, Typography} from "@material-ui/core";
import React from "react";
import {addTemplateLike, Caption, ITempMeme, MediaType} from "meme-generator-lib";
import Paper from "@material-ui/core/Paper";
import {NavigateBefore, NavigateNext} from "@material-ui/icons";
import {TempMemeAppBar} from "../components/TempMemeAppBar";
import {HybridTempMeme} from "../types/tempMeme";
import {relativeTimeFromDates} from "../util/dateTimeUtil";

interface TemplateViewProps {
    memeTitle: string;
    captions: Caption[];
    tempMeme: ITempMeme | null;
    previous: () => void;
    next: () => void;
}

export function TemplateView(props: TemplateViewProps) {
    const captions = props.captions;
    const tempMeme = props.tempMeme;

    let imgSource: string;
    if (tempMeme instanceof HybridTempMeme) {
        const hybridTempMeme = tempMeme as HybridTempMeme;
        // This is a hybrid meme
        imgSource = hybridTempMeme.url ?? "";
    } else {
        // This is a template
        imgSource = tempMeme?.url ?? "";
    }

    const controls = (
        <>
            <Button onClick={props.previous} color="inherit">
                <NavigateBefore />
            </Button>

            <Button onClick={props.next} color="inherit">
                <NavigateNext />
            </Button>
        </>
    );

    return (
        <Paper>
            <TempMemeAppBar toggleLike={addTemplateLike} controls={controls} tempMeme={tempMeme} />
            <Box p={1}>
                <Typography variant="h5">{props.memeTitle}</Typography>
            </Box>

            <Box position="relative" overflow="hidden">
                {props.tempMeme == null || props.tempMeme.mediaType !== MediaType.Video ? (
                    <img className="active-template" src={imgSource} />
                ) : (
                    <video className="active-template" src={imgSource} controls />
                )}
                {captions.map((c, index) => {
                    const fontFace = c.fontFace;
                    const fontSize =
                        typeof fontFace.fontSize != "number"
                            ? parseFloat(fontFace.fontSize)
                            : (fontFace.fontSize as number);

                    // Set the font size to the smaller of view with or view height in order to size the caption accordingly to the renderer.
                    // 5 is only an assumption, may must be adapted
                    const position = c?.position ?? {left: 0, top: 0, right: 1, bottom: 1};
                    const webFontFace = {
                        ...fontFace,
                        fontSize: fontSize / 8 + "vmin",
                        lineHeight: 1,
                        WebkitTextStrokeColor: fontFace.textStrokeColor,
                        WebkitTextStrokeWidth: fontFace.textStrokeWidth,
                    };
                    // Fontface to overlay outline stroke
                    const fillFontFace = {
                        ...webFontFace,
                        WebkitTextStrokeWidth: 0,
                    };
                    const textBoxStyle = {
                        top: position.top * 100 + "%",
                        left: position.left * 100 + "%",
                        right: position.right * 100 + "%",
                        bottom: position.bottom * 100 + "%",
                    };
                    return (
                        <React.Fragment key={index}>
                            <Box
                                className="caption"
                                display="flex"
                                key={"stroke-" + index}
                                // Uncomment to center text between values
                                //justifyContent="center"
                                //alignItems="center"
                                style={textBoxStyle}
                            >
                                <Typography className="caption-text" style={webFontFace}>
                                    {c.text}
                                </Typography>
                            </Box>
                            <Box
                                className="caption"
                                display="flex"
                                key={"fill-" + index}
                                // Uncomment to center text between values
                                //justifyContent="center"
                                //alignItems="center"
                                style={textBoxStyle}
                            >
                                <Typography className="caption-text" style={fillFontFace}>
                                    {c.text}
                                </Typography>
                            </Box>
                        </React.Fragment>
                    );
                })}
            </Box>
            {tempMeme && (
                <Box p={1} display="flex" alignItems="center">
                    {tempMeme.username ? (
                        <Box>
                            Uploaded by <b>{tempMeme.username}</b>
                        </Box>
                    ) : (
                        <Box>Author unknown, </Box>
                    )}
                    {tempMeme.createdAt && <Box>&nbsp;{relativeTimeFromDates(tempMeme.createdAt)}</Box>}
                </Box>
            )}
        </Paper>
    );
}
