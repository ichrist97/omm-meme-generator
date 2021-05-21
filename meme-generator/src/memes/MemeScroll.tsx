import {
    AppBar,
    Box,
    Button,
    CircularProgress,
    createStyles,
    Grid,
    GridList,
    GridListTile,
    makeStyles,
    Tabs,
    Typography,
} from "@material-ui/core";
import {IMemeRelations, startVideoStream, stopVideoStream} from "meme-generator-lib";
import React, {useContext, useEffect} from "react";
import Paper from "@material-ui/core/Paper";
import {TabPanel} from "../components/TabPanel";
import {UserContext} from "../App";
import {MemeView} from "./MemeView";
import ChatOutlinedIcon from "@material-ui/icons/ChatOutlined";
import {MemeTabStatus} from "./MemeScreen";
import VideoComponent from "../components/VideoComponent";
import {TabItem} from "../components/TabItem";

export function MemeScroll(props: {
    memesPrivate: IMemeRelations[] | null;
    memesPublic: IMemeRelations[] | null;
    onClick: (el: any, index: number, tabStatus: MemeTabStatus) => void;
}) {
    // source: https://material-ui.com/components/tabs/
    const [tabState, setTabState] = React.useState<number>(0);
    const [mediaData, setMediaData] = React.useState<Blob | null>(null);

    const user = useContext(UserContext);
    const memesPrivate = props.memesPrivate ?? [];
    const memesPublic = props.memesPublic ?? [];
    const onClick = props.onClick;

    // source: https://material-ui.com/components/tabs/
    const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
        setTabState(newValue);
    };

    useEffect(() => {
        if (tabState == 2) {
            startVideoStream((data: Uint8Array) => {
                setMediaData(new Blob([data], {type: "video/mp4"}));
            });
        } else {
            stopVideoStream();
        }
    }, [tabState]);

    useEffect(() => {
        if (!user) {
            // Reset tabs at logout
            setTabState(0);
        }
    }, [user]);

    return (
        <Paper>
            <AppBar position="relative">
                <Tabs value={tabState} onChange={handleChange} variant="fullWidth" scrollButtons="auto">
                    <TabItem label="Public" />
                    <TabItem label="My Memes" hidden={Boolean(!user)} />
                    <TabItem label="TV" />
                </Tabs>
            </AppBar>
            <TabPanel value={tabState} index={0}>
                <MemesPreview memes={memesPublic} onClick={(el, index) => onClick(el, index, MemeTabStatus.Public)} />
            </TabPanel>
            <TabPanel value={tabState} index={1}>
                {user && (
                    <MemesPreview
                        memes={memesPrivate}
                        onClick={(el, index) => onClick(el, index, MemeTabStatus.Private)}
                    />
                )}
            </TabPanel>
            <TabPanel value={tabState} index={2}>
                {mediaData === null ? (
                    <Box>
                        <CircularProgress color="inherit" />
                        <p>Loading video stream.</p>
                    </Box>
                ) : (
                    <video autoPlay={true} controls src={window.URL.createObjectURL(mediaData)} width="100%" />
                    // <VideoComponent autoPlay={false} controls srcObject={mediaStream} width="100%" />
                )}
            </TabPanel>
        </Paper>
    );
}

export function MemesPreview(props: {memes: IMemeRelations[]; onClick: (el: IMemeRelations, index: number) => void}) {
    const classes = makeStyles(
        createStyles({
            fullWidth: {
                width: "100%",
            },
            gridListTileBar: {
                height: "auto",
            },
        })
    )();

    return (
        <Grid container>
            <GridList cols={1} spacing={30} cellHeight={"auto"}>
                {props.memes.map((el, index) => (
                    <GridListTile key={"publicMeme" + el.id}>
                        <MemeView
                            meme={el}
                            onClick={() => props.onClick(el, index)}
                            comments={
                                <>
                                    <Button startIcon={<ChatOutlinedIcon />} disabled>
                                        <Typography variant={"h6"}>{el.comments.length}</Typography>
                                    </Button>
                                </>
                            }
                        />
                        {/*<GridListTileBar title={el.name} className={classes.gridListTileBar} />*/}
                    </GridListTile>
                ))}
            </GridList>
        </Grid>
    );
}
