import {Box, Grid, Typography} from "@material-ui/core";
import {MediaType, ITempMeme, addMemeLike} from "meme-generator-lib";
import Paper from "@material-ui/core/Paper";
import React from "react";
import {TempMemeAppBar} from "../components/TempMemeAppBar";
import {relativeTimeFromDates} from "../util/dateTimeUtil";

interface MemeViewProps {
    meme: ITempMeme | null;
    controls?: JSX.Element;
    comments?: JSX.Element;
    tags?: string[];
    onClick?: () => void;
}

export function MemeView(props: MemeViewProps) {
    const meme = props.meme;

    return (
        <Paper>
            <TempMemeAppBar
                toggleLike={addMemeLike}
                controls={props.controls}
                comments={props.comments}
                tempMeme={meme}
            />
            <Box p={1}>
                <Typography variant="h5">{meme?.name ?? "Untitled"}</Typography>
            </Box>
            <Grid>
                {meme?.mediaType !== MediaType.Video ? (
                    <img key={meme?.id} className="active-meme" src={meme?.url ?? ""} onClick={props.onClick} />
                ) : (
                    <video key={meme.id} autoPlay controls className="active-meme" muted onClick={props.onClick}>
                        <source src={meme.url ?? ""} type={"video/mp4"} />
                    </video>
                )}
            </Grid>
            {meme && (
                <Box p={1} display="flex" alignItems="center">
                    {meme.username ? (
                        <Box>
                            Posted by <b>{meme.username}</b>
                        </Box>
                    ) : (
                        <Box>Author unknown, </Box>
                    )}
                    {meme.createdAt && <Box>&nbsp;{relativeTimeFromDates(meme.createdAt)}</Box>}
                </Box>
            )}
            {props.tags && (
                <Box p={1} display="flex" alignItems="center">
                    {props.tags.map((tag) => {
                        return (
                            <Box
                                p={0.5}
                                m={0.5}
                                display="flex-wrap"
                                borderColor="#DDD"
                                borderRadius={10}
                                border={2}
                                bgcolor="#EEE"
                            >
                                <Typography variant="caption" color={"inherit"}>
                                    {tag}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            )}
        </Paper>
    );
}
