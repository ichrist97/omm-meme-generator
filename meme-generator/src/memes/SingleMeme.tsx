import Paper from "@material-ui/core/Paper";
import {
    AppBar,
    Box,
    Button,
    Container,
    createStyles,
    Grid,
    List,
    ListItem,
    makeStyles,
    TextField,
    Theme,
    Typography,
} from "@material-ui/core";
import {addComments, addMemeView, IMemeRelations} from "meme-generator-lib";
import React, {useContext, useEffect, useState} from "react";
import {UserContext} from "../App";
import {MemeView} from "./MemeView";
import {NavigateBefore, NavigateNext} from "@material-ui/icons";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import ShuffleIcon from "@material-ui/icons/Shuffle";
import ChatOutlinedIcon from "@material-ui/icons/ChatOutlined";
import {useParams} from "react-router-dom";
import {MemeTabStatus} from "./MemeScreen";
import {relativeTimeFromDates} from "../util/dateTimeUtil";

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        gridListTileBar: {
            height: "auto",
        },
        appBarComments: {
            marginTop: 30,
            marginBottom: 16,
        },
        cardComments: {
            display: "flex",
            borderRadius: 16,
            backgroundColor: "#e6e6e6",
            padding: 16,
        },
        controlButtons: {
            minWidth: "auto",
        },
    })
);

export function SingleMeme(props: {
    memesPrivate?: IMemeRelations[] | null;
    memesPublic: IMemeRelations[];
    tabStatus: MemeTabStatus;
    setTabStatus: (tabStatus: MemeTabStatus) => void;
    currentSlide: number | null;
    setCurrentSlide: (slide: number | null) => void;
}) {
    const {memeId} = useParams<{memeId: string}>();

    const {memesPrivate, memesPublic, currentSlide, setCurrentSlide, tabStatus, setTabStatus} = props;

    let meme: IMemeRelations | null = null;
    if (memesPrivate) {
        meme = memesPrivate.find((m) => m.id === memeId) ?? null;
        setTabStatus(MemeTabStatus.Private);
        if (currentSlide == null && meme) {
            setCurrentSlide(memesPrivate.indexOf(meme));
        }
    }
    if (!meme) {
        meme = memesPublic.find((m) => m.id === memeId) ?? null;
        setTabStatus(MemeTabStatus.Public);
        if (currentSlide == null && meme) {
            setCurrentSlide(memesPublic.indexOf(meme));
        }
    }

    useEffect(() => {
        // Handle the current slide, in case of a page reload
        if (meme) {
            if (memesPrivate && tabStatus === MemeTabStatus.Private) {
                props.setCurrentSlide(memesPrivate.indexOf(meme));
            } else if (tabStatus === MemeTabStatus.Public) {
                props.setCurrentSlide(memesPublic.indexOf(meme));
            }
        }

        // Cleanup on unmount component
        return () => {
            props.setCurrentSlide(null);
        };
    }, [tabStatus, memesPrivate, memesPublic]);

    const [comment, setComment] = useState<string>("");
    const [stateCounter, setStateCounter] = useState<number>(0);
    const classes = useStyles();
    const user = useContext(UserContext);
    const [isShuffle, setShuffle] = useState<boolean>(false);
    const [autoplay, setAutoplay] = useState<boolean>(false);

    async function addComment(text: string) {
        if (!user) return;
        const memeId = meme!.id ?? "";
        const comment = await addComments(memeId, text, user.tokens);
        meme?.comments.push(comment);
        setStateCounter(stateCounter + 1);
    }

    useEffect(() => {
        if (user && meme) {
            addMemeView(meme.id ?? "", user.tokens);
        }
    }, [meme, user]);

    useEffect(() => {
        let timeOut: NodeJS.Timeout;
        if (autoplay) {
            timeOut = setTimeout(isShuffle ? shuffle : next, 4000);
        }
        return () => {
            clearTimeout(timeOut);
        };
    }, [autoplay, isShuffle, meme]);

    function previous() {
        let tmpSlide = null;
        if (currentSlide !== null && memesPublic) {
            if (memesPrivate && tabStatus === MemeTabStatus.Private) {
                tmpSlide = currentSlide === 0 ? memesPrivate.length - 1 : currentSlide - 1;
            } else if (tabStatus === MemeTabStatus.Public) {
                tmpSlide = currentSlide === 0 ? memesPublic.length - 1 : currentSlide - 1;
            }
            props.setCurrentSlide(tmpSlide);
        }
    }

    function next() {
        let tmpSlide = null;
        if (currentSlide !== null && memesPublic) {
            if (memesPrivate && tabStatus === MemeTabStatus.Private) {
                tmpSlide = (currentSlide + 1) % memesPrivate.length;
            } else if (tabStatus === MemeTabStatus.Public) {
                tmpSlide = (currentSlide + 1) % memesPublic.length;
            }
            props.setCurrentSlide(tmpSlide);
        }
    }

    function random(x: number) {
        return Math.floor(Math.random() * x);
    }

    function shuffle() {
        let tmpSlide = currentSlide ?? null;
        if (memesPublic) {
            if (memesPrivate && tabStatus === MemeTabStatus.Private) {
                if (memesPrivate.length > 0) {
                    while (tmpSlide === currentSlide) tmpSlide = random(memesPrivate.length);
                }
            } else if (tabStatus === MemeTabStatus.Public) {
                if (memesPublic.length > 0) {
                    while (tmpSlide === currentSlide) tmpSlide = random(memesPublic.length);
                }
            }
            props.setCurrentSlide(tmpSlide);
        }
    }

    const controls = (
        <>
            <Button className={classes.controlButtons} onClick={isShuffle ? shuffle : previous} color="inherit">
                <NavigateBefore />
            </Button>

            <Button className={classes.controlButtons} onClick={isShuffle ? shuffle : next} color="inherit">
                <NavigateNext />
            </Button>
            <Button
                className={classes.controlButtons}
                onClick={() => {
                    setAutoplay(!autoplay);
                }}
                color={autoplay ? "secondary" : "inherit"}
            >
                <PlayArrowIcon />
            </Button>

            <Button
                className={classes.controlButtons}
                onClick={() => setShuffle(!isShuffle)}
                color={isShuffle ? "secondary" : "inherit"}
            >
                <ShuffleIcon />
            </Button>
        </>
    );

    const comments = meme ? (
        <>
            <Button startIcon={<ChatOutlinedIcon />} disabled>
                <Typography variant={"h6"}>{meme.comments.length}</Typography>
            </Button>
        </>
    ) : (
        <Box>
            <Typography>No meme!</Typography>
        </Box>
    );

    return (
        <Container id={"selection-container"} maxWidth="lg">
            {meme ? (
                <Grid item xs={12}>
                    <MemeView
                        meme={meme!}
                        controls={controls}
                        comments={comments}
                        tags={meme && meme.tags.length > 0 ? meme.tags : undefined}
                    />
                    <Paper>
                        <AppBar position="relative" className={classes.appBarComments}>
                            <Box p={1}>
                                <Typography variant="h5">Comments</Typography>
                            </Box>
                        </AppBar>
                        <Grid>
                            <List>
                                {meme?.comments && meme?.comments.length > 0 ? (
                                    meme?.comments.map((el) => (
                                        <ListItem key={"comments" + el.id}>
                                            <Box
                                                className={classes.cardComments}
                                                flexDirection="column"
                                                alignItems="flex-start"
                                            >
                                                <Box display="flex" flexGrow={1}>
                                                    <Typography variant={"subtitle1"} color="textSecondary">
                                                        {el.username} wrote {relativeTimeFromDates(el.createdAt)}:
                                                    </Typography>
                                                </Box>
                                                <Typography variant="h6">{el.text} </Typography>
                                            </Box>
                                        </ListItem>
                                    ))
                                ) : (
                                    <ListItem key={"comments"}>
                                        <Box display="flex" justifyContent="center" alignItems="center" width={1}>
                                            <Typography variant={"subtitle1"} color="textSecondary">
                                                No comments left so far
                                            </Typography>
                                        </Box>
                                    </ListItem>
                                )}
                                {user && (
                                    <ListItem key={"comments-new"}>
                                        <Box
                                            alignItems="center"
                                            className={classes.cardComments}
                                            justifyContent="center"
                                        >
                                            <Box mr={2}>
                                                <form noValidate autoComplete={"off"}>
                                                    <TextField
                                                        label={"new comment"}
                                                        defaultValue={""}
                                                        variant={"standard"}
                                                        onChange={(e) => setComment(e.target.value)}
                                                    />
                                                </form>
                                            </Box>
                                            <Button
                                                variant={"outlined"}
                                                onClick={async () => {
                                                    await addComment(comment);
                                                }}
                                            >
                                                add
                                            </Button>
                                        </Box>
                                    </ListItem>
                                )}
                            </List>
                        </Grid>
                    </Paper>
                </Grid>
            ) : (
                <Grid item xs={12}>
                    <Typography variant="h2">Meme not found in this collection</Typography>
                </Grid>
            )}
        </Container>
    );
}
