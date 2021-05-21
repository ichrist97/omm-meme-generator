import {
    Access,
    AppUser,
    Caption,
    createMeme,
    createMemeCollection,
    IMeme,
    ITemplate,
    ITempMeme,
    LibMeme,
    MediaType,
    MemeProvider,
} from "meme-generator-lib";
import {
    Box,
    Button,
    CircularProgress,
    createStyles,
    FormControl,
    InputLabel,
    makeStyles,
    Select,
    Theme,
    Tooltip,
    Typography,
} from "@material-ui/core";
import React, {useContext, useEffect, useState} from "react";
import PublicIcon from "@material-ui/icons/Public";
import LinkIcon from "@material-ui/icons/Link";
import LockIcon from "@material-ui/icons/Lock";
import {UserContext} from "../App";
import {getAccessString, getProviderString} from "../util/helper";
import {HybridTempMeme} from "../types/tempMeme";
import {CustomMenuItem} from "../components/CustomMenuItem";
import StorageIcon from "@material-ui/icons/Storage";
import WebIcon from "@material-ui/icons/Web";

interface GenerateFormProps {
    name: string;
    tags: string | null;
    template: ITemplate;
    setTempMeme: (template: ITempMeme) => void;
    captions: Caption[];
    addDraft: (meme: HybridTempMeme) => void;
}

const useFormStyles = makeStyles((theme: Theme) =>
    createStyles({
        margin: {
            margin: theme.spacing(1),
        },
    })
);

export function GenerateForm(props: GenerateFormProps) {
    const classes = useFormStyles();

    const user = useContext(UserContext) as AppUser;
    // Split tags by whitespace, hashtags and punctuation
    const tags = props.tags ? props.tags.split(/[\s\,#\;]+/).filter(Boolean) : [];
    const captions = props.captions;
    const template = props.template;
    const imageSource = props.template?.url ?? "";

    const [access, setAccess] = useState<Access>(Access.Private);
    const [pending, setPending] = useState<boolean>(false);
    const [pendingMemeCollection, setPendingMemeCollection] = useState<boolean>(false);
    const [provider, setProvider] = useState<MemeProvider>(MemeProvider.Client);

    useEffect(() => {
        if (template.mediaType !== MediaType.Image) {
            setProvider(MemeProvider.Server);
        }
    }, [template.mediaType]);

    async function generate() {
        setPending(true);
        let meme: IMeme | null = null;
        if (provider === MemeProvider.Client) {
            const data = await LibMeme.render(
                imageSource, // Use the unrendered image source
                captions.map((c) => c)
            );
            meme = {
                access: Access.Private,
                captions: captions,
                createdAt: new Date(),
                mediaType: template.mediaType,
                name: props.name,
                tags: tags,
                template: template.id ?? null,
                views: 0,
                url: data,
            };
        } else if (provider === MemeProvider.Server) {
            meme = await createMeme(props.name, template, captions, tags, false, access, user.tokens);
        } else if (provider === MemeProvider.ImgFlip) {
            // TODO & handover Access
        }
        if (meme) {
            props.setTempMeme(new HybridTempMeme(template, meme));
        }
        setPending(false);
    }

    async function saveDraft() {
        const meme: IMeme = await createMeme(props.name, template, captions, tags, true, access, user.tokens);
        props.addDraft(new HybridTempMeme(template, meme));
    }

    return (
        <Box>
            <FormControl className={classes.margin}>
                <InputLabel>Method</InputLabel>
                <Select
                    labelId="demo-simple-select-helper-label"
                    id="demo-simple-select-helper"
                    value={provider}
                    onChange={(a) => {
                        setProvider(a.target.value as MemeProvider);
                    }}
                    renderValue={(value) => {
                        return getProviderString(provider);
                    }}
                >
                    {template.mediaType === MediaType.Image && (
                        <CustomMenuItem
                            value={MemeProvider.Client}
                            icon={<WebIcon />}
                            title="Client"
                            description="Render only on client, won't be saved on server"
                        />
                    )}
                    <CustomMenuItem
                        value={MemeProvider.Server}
                        icon={<StorageIcon />}
                        title="Server"
                        description="Render and publish your meme on the server"
                    />
                    {/*<MenuItem value={MemeProvider.ImgFlip}>ImgFlip</MenuItem>*/}
                </Select>
            </FormControl>
            {provider !== MemeProvider.Client && (
                <FormControl className={classes.margin}>
                    <InputLabel>Access</InputLabel>
                    <Select
                        labelId="demo-simple-select-helper-label"
                        id="demo-simple-select-helper"
                        value={access}
                        onChange={(a) => {
                            setAccess(a.target.value as Access);
                        }}
                        renderValue={(value) => {
                            return getAccessString(access);
                        }}
                        autoWidth={true}
                    >
                        <CustomMenuItem
                            value={Access.Private}
                            icon={<LockIcon />}
                            title="Private"
                            description="Only visible for you"
                        />
                        <CustomMenuItem
                            value={Access.Public}
                            icon={<PublicIcon />}
                            title="Public"
                            description="Unrestricted findable and retrievable"
                        />
                        <CustomMenuItem
                            value={Access.Unlisted}
                            icon={<LinkIcon />}
                            title="Unlisted"
                            description="Visible to everyone who has the link"
                        />
                    </Select>
                </FormControl>
            )}
            <FormControl className={classes.margin}>
                <Button onClick={generate} color="secondary" variant="contained">
                    {pending ? (
                        <CircularProgress color="inherit" />
                    ) : (
                        <Typography>{provider === MemeProvider.Client ? "Preview" : "Publish"}</Typography>
                    )}
                </Button>
            </FormControl>
            {provider !== MemeProvider.Client && (
                <>
                    {access === Access.Private && (
                        <FormControl className={classes.margin}>
                            <Tooltip
                                title={
                                    template.provider === MemeProvider.Server
                                        ? "Save meme as draft"
                                        : "Drafts are not supported for third party template providers"
                                }
                            >
                                <div>
                                    <Button
                                        onClick={saveDraft}
                                        color="secondary"
                                        variant="outlined"
                                        disabled={template.provider !== MemeProvider.Server}
                                    >
                                        <Typography>Save Draft</Typography>
                                    </Button>
                                </div>
                            </Tooltip>
                        </FormControl>
                    )}
                    <FormControl className={classes.margin}>
                        <Button
                            onClick={async () => {
                                setPendingMemeCollection(true);
                                await createMemeCollection(template, captions, user.tokens);
                                setPendingMemeCollection(false);
                            }}
                            color="secondary"
                            variant="outlined"
                        >
                            {pendingMemeCollection ? (
                                <CircularProgress color="inherit" />
                            ) : (
                                <Typography>Generate Collection</Typography>
                            )}
                        </Button>
                    </FormControl>
                </>
            )}
        </Box>
    );
}
