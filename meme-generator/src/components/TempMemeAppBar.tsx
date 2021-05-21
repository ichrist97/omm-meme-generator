import {AppBar, Box, Button, Dialog, DialogTitle, TextField, Toolbar, Tooltip, Typography} from "@material-ui/core";
import FavoriteBorderOutlinedIcon from "@material-ui/icons/FavoriteBorderOutlined";
import FavoriteIcon from "@material-ui/icons/Favorite";
import VolumeUpIcon from "@material-ui/icons/VolumeUp";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import ShareOutlinedIcon from "@material-ui/icons/ShareOutlined";
import GetAppIcon from "@material-ui/icons/GetApp";
import LockIcon from "@material-ui/icons/Lock";
import LockOpenIcon from "@material-ui/icons/LockOpen";
import React, {useContext, useState} from "react";
import {UserContext} from "../App";
import {Access, ILike, ITempMeme, Tokens} from "meme-generator-lib";
import {IWindow} from "../types/types";
import {extractSpeechInformation, prepareUtterance} from "../util/text-to-speech";
import {DialogProps} from "./DialogProps";

export interface TempMemeAppBarProps {
    tempMeme: ITempMeme | null;
    toggleLike: (id: string, tokens: Tokens, undo: boolean) => Promise<ILike | null>;
    controls?: JSX.Element;
    comments?: JSX.Element;
}

export function TempMemeAppBar(props: TempMemeAppBarProps) {
    const tempMeme = props.tempMeme;
    const user = useContext(UserContext);
    const [stateCounter, setStateCounter] = useState<number>(0);
    const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
    const [isSpeaking, setSpeaking] = React.useState(false);

    async function addLike(undo = false) {
        if (!user) return;
        // const date = new Date();
        const memeId = tempMeme?.id ?? "";
        const like = await props.toggleLike(memeId, user.tokens, undo);
        if (undo) {
            if (tempMeme) {
                tempMeme.likes = tempMeme.likes?.filter((l) => l.user !== user?.id);
            }
        } else {
            if (like) {
                tempMeme?.likes?.push(like);
            }
        }

        setStateCounter(stateCounter + 1);
    }

    const undoLike = tempMeme?.likes?.map((like) => like.user).includes(user?.id ?? "");

    /**
     * Tell the backend to use response header that tells the browser to rename the file and then forces it to open a download popup instead of open it in a window.
     * @param url   - the url to download from
     */
    function forceDownload(url: string): string {
        if (url.startsWith("data:")) {
            return url;
        }
        const downloadUrl = new URL(url);
        downloadUrl.searchParams.append("force", "true");
        return downloadUrl.toString();
    }

    const {speechSynthesis, webkitSpeechSynthesis}: IWindow = window as any;
    const synth = speechSynthesis || webkitSpeechSynthesis;
    async function speakMemeInformation() {
        setSpeaking(true);
        if (!tempMeme) return;

        const info = await extractSpeechInformation(tempMeme, user?.tokens);

        // prepare utterances
        const text = prepareUtterance(info);

        // text to speech synthesis
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.85;
        utterance.lang = "en-US";
        synth.cancel(); // workaround for chrome to work
        synth.speak(utterance);
        utterance.addEventListener("end", () => {
            setSpeaking(false);
        });
    }

    return (
        <AppBar position="relative">
            <Toolbar>
                {tempMeme?.likes !== undefined && tempMeme?.likes !== null && (
                    <Button
                        startIcon={!undoLike || !user ? <FavoriteBorderOutlinedIcon /> : <FavoriteIcon />}
                        color="inherit"
                        onClick={async () => {
                            await addLike(undoLike);
                        }}
                        disabled={Boolean(!user)}
                    >
                        <Typography variant={"h6"}>{tempMeme?.likes?.length}</Typography>
                    </Button>
                )}
                {tempMeme?.views !== undefined && tempMeme?.views !== null && (
                    <Button startIcon={<VisibilityOutlinedIcon />} disabled>
                        <Typography variant={"h6"}>{tempMeme?.views}</Typography>
                    </Button>
                )}
                <Box>{props.comments}</Box>
                <Box flexGrow={1}>{props.controls}</Box>
                <Button
                    color={isSpeaking ? "secondary" : "inherit"}
                    onClick={() => {
                        if (isSpeaking) {
                            synth.cancel();
                        } else {
                            speakMemeInformation();
                        }
                    }}
                >
                    <VolumeUpIcon />
                </Button>
                <Button
                    color="inherit"
                    onClick={() => {
                        if (tempMeme?.access !== Access.Private) {
                            setShareDialogOpen(true);
                        }
                    }}
                >
                    {tempMeme?.access === Access.Public ? (
                        <ShareOutlinedIcon />
                    ) : tempMeme?.access === Access.Private ? (
                        <Tooltip title="You cannot share this meme, as it is private!">
                            <LockIcon />
                        </Tooltip>
                    ) : (
                        <LockOpenIcon />
                    )}
                </Button>
                {tempMeme && tempMeme.url && (
                    <Button color="inherit" href={forceDownload(tempMeme.url)} target="_blank" download>
                        <GetAppIcon />
                    </Button>
                )}
            </Toolbar>

            <ShareDialog
                open={shareDialogOpen}
                onClose={() => {
                    setShareDialogOpen(false);
                }}
                shareUrl={tempMeme?.url ?? ""}
            />
        </AppBar>
    );
}

export interface ShareDialogProps extends DialogProps {
    shareUrl: string | undefined;
}

function ShareDialog(props: ShareDialogProps) {
    const {onClose, open} = props;

    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open} fullWidth={true}>
            <DialogTitle id="share-dialog-title">Share Meme</DialogTitle>
            <Box m={3}>
                <Typography>Image Link:</Typography>
                <TextField value={props.shareUrl} fullWidth />
            </Box>
        </Dialog>
    );
}
