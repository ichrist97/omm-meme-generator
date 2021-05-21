import {
    Box,
    Button,
    Divider,
    Grid,
    IconButton,
    Input,
    InputAdornment,
    List,
    ListItem,
    Menu,
    MenuItem,
    Slider,
    TextField,
    Toolbar,
    Typography,
} from "@material-ui/core";
import KeyboardVoiceIcon from "@material-ui/icons/KeyboardVoice";
import React, {useEffect, useState} from "react";
import {Caption, getFontFamilies, ITemplate, MediaType} from "meme-generator-lib";
import DeleteIcon from "@material-ui/icons/Delete";
import AddIcon from "@material-ui/icons/Add";
import SwapHorizIcon from "@material-ui/icons/SwapHoriz";
import SwapVertIcon from "@material-ui/icons/SwapVert";
import {FontDownloadOutlined, FormatBold, FormatItalic, FormatSize, Timelapse} from "@material-ui/icons";
import {ColorPicker} from "material-ui-color";
import {IWindow} from "../types/types";
import {isChrome} from "../util/helper";

interface MemeEditorProps {
    template: ITemplate;
    captions: Caption[];
    memeTitle: string;
    tags: string | null;
    setTags: (tags: string | null) => void;
    setCaptions: (captions: Caption[]) => void;
    setMemeTitle: (title: string) => void;
}

export function MemeEditor(props: MemeEditorProps) {
    const setCaptions = props.setCaptions;
    const captions = props.captions;

    const dummyCaption: Caption = {
        text: "Caption 1",
        position: {
            top: 0.5,
            left: 0.4,
            right: 0,
            bottom: 0,
        },
        fontFace: {
            fontStyle: "normal",
            fontWeight: "bold",
            fontSize: 40,
            fontFamily: "Roboto",
            fontVariant: "normal",
            color: "white",
            textStrokeColor: "black",
            textStrokeWidth: "4px",
        },
        start: 0,
        end: 1,
    };

    useEffect(() => {
        setCaptions([dummyCaption]);
    }, []);

    return (
        <Box>
            <TextField
                value={props.memeTitle}
                autoFocus
                margin="dense"
                id={"meme-title-input"}
                label={"Title"}
                type="text"
                fullWidth
                onChange={(el) => {
                    props.setMemeTitle(el.target.value);
                }}
            />
            <TextField
                value={props.tags}
                autoFocus
                margin="dense"
                id={"meme-tags-input"}
                label={"Tags"}
                type="text"
                fullWidth
                onChange={(el) => {
                    props.setTags(el.target.value);
                }}
            />
            <Box my={2} bgcolor="#eee">
                <List>
                    {captions.map((c, index) => {
                        return (
                            <CaptionField
                                key={index}
                                index={index}
                                caption={c}
                                delete={() => {
                                    captions.splice(captions.indexOf(c), 1);
                                    setCaptions(captions);
                                }}
                                update={(updatedCaption) => {
                                    const itemIndex = captions.indexOf(c);
                                    captions[itemIndex] = updatedCaption;
                                    setCaptions([...captions]); // reassign array in order to force update
                                }}
                                mediaType={props.template.mediaType}
                            />
                        );
                    })}
                    <ListItem
                        button
                        aria-label="add"
                        onClick={() => {
                            // Deep copy caption + fontFace
                            const caption = Object.assign({}, dummyCaption);
                            caption.text = "Caption " + (captions.length + 1);
                            caption.fontFace = Object.assign({}, dummyCaption.fontFace);
                            captions.push(caption);
                            setCaptions(captions);
                        }}
                    >
                        <Box display="flex" width="100%" justifyContent="center">
                            <AddIcon />
                        </Box>
                    </ListItem>
                </List>
            </Box>
        </Box>
    );
}

/**
 * Can change caption directly via reference, but it is proposed to pass it via update function.
 * Anyways nested objects must be overwritten by a deep copy (here caption.fontFace).
 *
 * @param props
 * @constructor
 */
function CaptionField(props: {
    index: number;
    caption: Caption;
    update: (caption: Caption) => void;
    delete: () => void;
    mediaType: MediaType;
}) {
    const [isFontSelectOpen, setFontSelectOpen] = useState(false);
    const fontSelectAnchorRef = React.useRef<HTMLButtonElement>(null);

    const caption = props.caption;
    const position = caption.position ?? {left: 0, top: 0, right: 1, bottom: 1};
    const isBold = caption.fontFace.fontWeight && caption.fontFace.fontWeight === "bold";
    const isItalic = caption.fontFace.fontStyle && caption.fontFace.fontStyle === "italic";
    const fontFamily = caption.fontFace.fontFamily;
    const fontColor = caption.fontFace.color;
    const fontSize =
        typeof caption.fontFace.fontSize === "string"
            ? parseInt(caption.fontFace.fontSize)
            : (caption.fontFace.fontSize as number);
    const textStrokeWidth =
        typeof caption.fontFace.textStrokeWidth === "string"
            ? parseInt(caption.fontFace.textStrokeWidth)
            : (caption.fontFace.textStrokeWidth as number);

    const textStrokeColor = caption.fontFace.textStrokeColor;

    function updateCaption() {
        const tmpCaption = Object.assign({}, caption);
        props.update(tmpCaption);
    }

    function speakCaption() {
        // use WebSpeech API from browser
        const {SpeechRecognition, webkitSpeechRecognition}: IWindow = window as any;
        const SpeechApi = SpeechRecognition || webkitSpeechRecognition;
        const recognition = new SpeechApi();
        recognition.lang = "en-US";

        // update caption when finished speech
        recognition.onresult = function (event: any) {
            const transcript = event.results[0][0].transcript;
            caption.text = transcript;
            updateCaption();
        };

        // start recognition
        recognition.start();
    }

    const customFontFamilies = getFontFamilies();

    // Todo hide elements from bar if mobile view:
    // see https://material-ui.com/components/app-bar/

    return (
        <>
            <ListItem>
                <Grid container>
                    <Grid item container alignItems="center">
                        <Grid container alignItems="center" spacing={2}>
                            <Grid item xs={10}>
                                <TextField
                                    value={caption.text}
                                    autoFocus
                                    margin="dense"
                                    id={"caption-input-" + props.index}
                                    label={"Caption " + (props.index + 1)}
                                    type="text"
                                    fullWidth
                                    onChange={(el) => {
                                        caption.text = el.target.value;
                                        updateCaption();
                                    }}
                                />
                            </Grid>
                            <Grid item xs={2}>
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<KeyboardVoiceIcon />}
                                    onClick={() => speakCaption()}
                                    disabled={!isChrome()}
                                >
                                    Talk
                                </Button>
                            </Grid>
                        </Grid>
                        <Grid item md={12}>
                            <Toolbar disableGutters={true} variant="dense">
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        if (isBold) {
                                            caption.fontFace.fontWeight = "normal";
                                        } else {
                                            caption.fontFace.fontWeight = "bold";
                                        }
                                        updateCaption();
                                    }}
                                >
                                    <FormatBold color={isBold ? "secondary" : "disabled"} />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        if (isItalic) {
                                            caption.fontFace.fontStyle = "normal";
                                        } else {
                                            caption.fontFace.fontStyle = "italic";
                                        }
                                        updateCaption();
                                    }}
                                >
                                    <FormatItalic color={isItalic ? "secondary" : "disabled"} />
                                </IconButton>
                                <Box width="75px" marginX={1}>
                                    <Input
                                        type="number"
                                        value={fontSize}
                                        inputProps={{min: 1, max: 100}}
                                        onChange={(el) => {
                                            caption.fontFace.fontSize = parseInt(el.target.value);
                                            updateCaption();
                                        }}
                                        startAdornment={
                                            <InputAdornment position="start">
                                                <FormatSize color="disabled" />
                                            </InputAdornment>
                                        }
                                    />
                                </Box>
                                <Box marginX={1}>
                                    <Button
                                        aria-controls="simple-menu"
                                        aria-haspopup="true"
                                        onClick={() => setFontSelectOpen(true)}
                                        ref={fontSelectAnchorRef}
                                    >
                                        {fontFamily}
                                    </Button>
                                    <Menu
                                        open={isFontSelectOpen}
                                        anchorEl={fontSelectAnchorRef.current}
                                        onClose={() => setFontSelectOpen(false)}
                                    >
                                        {customFontFamilies.map((f, index) => {
                                            return (
                                                <MenuItem
                                                    key={index}
                                                    value={f}
                                                    onClick={(event) => {
                                                        caption.fontFace.fontFamily = f;
                                                        updateCaption();
                                                        setFontSelectOpen(false);
                                                    }}
                                                >
                                                    <Typography style={{fontFamily: f}}>{f}</Typography>
                                                </MenuItem>
                                            );
                                        })}
                                    </Menu>
                                </Box>
                                <Box width="75px" marginX={1}>
                                    <Input
                                        type="number"
                                        value={textStrokeWidth}
                                        inputProps={{min: 0, max: 100}}
                                        onChange={(el) => {
                                            caption.fontFace.textStrokeWidth = el.target.value + "px";
                                            updateCaption();
                                        }}
                                        startAdornment={
                                            <InputAdornment position="start">
                                                <FontDownloadOutlined color="disabled" />
                                            </InputAdornment>
                                        }
                                    />
                                </Box>
                                <ColorPicker
                                    value={fontColor}
                                    hideTextfield
                                    onChange={(e) => {
                                        caption.fontFace.color = e.css.backgroundColor;
                                        updateCaption();
                                    }}
                                />
                                <ColorPicker
                                    value={textStrokeColor}
                                    hideTextfield
                                    onChange={(e) => {
                                        caption.fontFace.textStrokeColor = e.css.backgroundColor;
                                        updateCaption();
                                    }}
                                />
                            </Toolbar>
                        </Grid>
                    </Grid>
                    <Grid container item xs={12}>
                        <Box flexGrow={1}>
                            <Grid container>
                                <Grid container spacing={2} alignItems="center" item xs={12}>
                                    <Grid item style={{flexGrow: "unset"}}>
                                        <SwapHorizIcon />
                                    </Grid>
                                    <Grid item md>
                                        <Slider
                                            value={[position.left * 100, (1 - position.right) * 100]}
                                            color="secondary"
                                            min={0}
                                            max={100}
                                            onChange={(event, newValue: number | number[]) => {
                                                const newValues = newValue as number[];
                                                position.left = newValues[0] / 100;
                                                position.right = 1 - newValues[1] / 100;
                                                caption.position = position;
                                                updateCaption();
                                            }}
                                            valueLabelDisplay="auto"
                                            aria-labelledby="range-slider"
                                            getAriaValueText={(value) => {
                                                return `${value * 100}%`;
                                            }}
                                        />
                                    </Grid>
                                </Grid>
                                <Grid container spacing={2} alignItems="center" item xs={12}>
                                    <Grid item style={{flexGrow: "unset"}}>
                                        <SwapVertIcon />
                                    </Grid>
                                    <Grid item sm>
                                        <Slider
                                            value={[position.top * 100, (1 - position.bottom) * 100]}
                                            color="secondary"
                                            min={0}
                                            max={100}
                                            onChange={(event, newValue: number | number[]) => {
                                                const newValues = newValue as number[];
                                                position.top = newValues[0] / 100;
                                                position.bottom = 1 - newValues[1] / 100;
                                                caption.position = position;
                                                updateCaption();
                                            }}
                                            valueLabelDisplay="auto"
                                            aria-labelledby="range-slider"
                                            getAriaValueText={(value) => {
                                                return `${value * 100}%`;
                                            }}
                                        />
                                    </Grid>
                                </Grid>
                                {props.mediaType !== MediaType.Image && (
                                    <Grid container spacing={2} alignItems="center" item xs={12}>
                                        <Grid item style={{flexGrow: "unset"}}>
                                            <Timelapse />
                                        </Grid>
                                        <Grid item sm>
                                            <Slider
                                                value={[(caption.start ?? 0) * 100, (caption.end ?? 1) * 100]}
                                                color="secondary"
                                                min={0}
                                                max={100}
                                                onChange={(event, vals: number | number[]) => {
                                                    const times = vals as number[];
                                                    caption.start = times[0] / 100;
                                                    caption.end = times[1] / 100;
                                                    updateCaption();
                                                }}
                                                valueLabelDisplay="auto"
                                                aria-labelledby="range-slider"
                                                getAriaValueText={(value) => {
                                                    return `${value}%`;
                                                }}
                                            />
                                        </Grid>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                        <Box>
                            <IconButton edge="end" aria-label="delete" onClick={props.delete}>
                                <DeleteIcon />
                            </IconButton>
                        </Box>
                    </Grid>
                </Grid>
            </ListItem>
            <Divider key={props.index} />
        </>
    );
}
