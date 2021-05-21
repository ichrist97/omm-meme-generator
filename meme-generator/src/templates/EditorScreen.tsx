import {MemeEditor} from "./MemeEditor";
import {
    AppBar,
    Box,
    Container,
    createStyles,
    Grid,
    GridList,
    GridListTile,
    GridListTileBar,
    makeStyles,
    Paper,
    Tabs,
    Theme,
    Typography,
} from "@material-ui/core";
import React, {useContext, useEffect, useState} from "react";
import {
    Access,
    addMemeView,
    addTemplateView,
    Caption,
    getImgFlipTemplates,
    getPublicTemplates,
    getSingleTemplate,
    getUserDraftMemes,
    getUserTemplates,
    IMeme,
    ITemplate,
    ITempMeme,
    MediaType,
} from "meme-generator-lib";
import {UserContext} from "../App";
import {TemplateView} from "./TemplateView";
import {TabPanel} from "../components/TabPanel";
import {UploadForm} from "./UploadForm";
import {useHistory, useParams} from "react-router-dom";
import {GenerateForm} from "./GenerateForm";
import {HybridTempMeme} from "../types/tempMeme";
import {TabItem} from "../components/TabItem";

enum TabStatus {
    Private = "private",
    Public = "public",
    Third = "third",
    Drafts = "drafts",
}

export function EditorScreen() {
    const {templateId, urlTabStatus} = useParams<{templateId: string | undefined; urlTabStatus: string | undefined}>();
    const history = useHistory();
    const user = useContext(UserContext);

    const [privateTemplates, setPrivateTemplates] = useState<ITemplate[] | null>(null);
    const [publicTemplates, setPublicTemplates] = useState<ITemplate[] | null>(null);
    const [thirdPartyTemplates, setThirdPartyTemplates] = useState<ITemplate[] | null>(null);
    const [drafts, setDrafts] = useState<HybridTempMeme[] | null>(null);
    const [currentTemplate, setCurrentTemplate] = useState<ITempMeme | null>(null);
    const [captions, setCaptions] = useState<Caption[]>([]);
    const [memeTitle, setMemeTitle] = useState<string>("My meme title");
    const [tags, setTags] = useState<string | null>(null);
    const [forceUpdate, setForceUpdate] = useState<number>(0);
    const [tabStatus, setTabStatus] = useState<TabStatus>((urlTabStatus as TabStatus) ?? TabStatus.Public);
    const [tabState, setTabState] = React.useState(
        tabStatus === TabStatus.Public ? 0 : tabStatus === TabStatus.Third ? 1 : tabStatus === TabStatus.Private ? 2 : 3
    );
    const [currentSlide, setCurrentSlide] = useState<number | null>(null);

    function setCurrentTemplateAndImgSource(tempMeme: ITempMeme) {
        const tmpMeme = tempMeme as IMeme;
        if (tmpMeme.template) {
            // This is a meme
            getSingleTemplate(tmpMeme.template, user?.tokens).then((t) => {
                if (t) {
                    // Use template of draft meme, if no preview available
                    setCurrentTemplate(new HybridTempMeme(t, tmpMeme));
                }
            });
        } else {
            // This is a template
            setCurrentTemplate(tempMeme as ITemplate);
        }
    }

    async function loadPublicTemplates() {
        if (!user) return;

        let newTemplates: ITemplate[];
        try {
            newTemplates = await getPublicTemplates(user.tokens);
        } catch (e) {
            newTemplates = [];
        }
        setPublicTemplates(newTemplates);
    }

    async function loadPrivateTemplates() {
        if (!user) return;

        let newTemplates: ITemplate[];
        try {
            newTemplates = await getUserTemplates(user.tokens);
        } catch (e) {
            newTemplates = [];
        }
        setPrivateTemplates(newTemplates);
    }

    async function loadThirdPartyTemplates() {
        if (!user) return;

        let newTemplates: ITemplate[];
        try {
            newTemplates = await getImgFlipTemplates(user.tokens);
        } catch (e) {
            newTemplates = [];
        }
        setThirdPartyTemplates(newTemplates);
    }

    async function loadUserDrafts() {
        if (!user) return;

        let newMemes: IMeme[];
        try {
            newMemes = await getUserDraftMemes(user.tokens, user.id ?? "");
        } catch (e) {
            newMemes = [];
        }
        const hybridMemes = await Promise.all(
            // Get template and meme in one object
            newMemes.map(
                async (m) =>
                    await HybridTempMeme.createAsync(m, async (template: string) => {
                        return await getSingleTemplate(template, user?.tokens);
                    })
            )
        );
        setDrafts(hybridMemes as HybridTempMeme[]);
    }

    function previous() {
        if (currentSlide !== null && publicTemplates && privateTemplates && thirdPartyTemplates && drafts) {
            let tmpSlide = 0;
            if (tabStatus === TabStatus.Private) {
                tmpSlide = (currentSlide + privateTemplates.length - 1) % privateTemplates.length;
            } else if (tabStatus === TabStatus.Public) {
                tmpSlide = (currentSlide + publicTemplates.length - 1) % publicTemplates.length;
            } else if (tabStatus === TabStatus.Third) {
                tmpSlide = (currentSlide + thirdPartyTemplates.length - 1) % thirdPartyTemplates.length;
            } else if (tabStatus === TabStatus.Drafts) {
                tmpSlide = (currentSlide + drafts.length - 1) % drafts.length;
            }
            setCurrentSlide(tmpSlide);
        }
    }

    function next() {
        if (currentSlide !== null && publicTemplates && privateTemplates && thirdPartyTemplates && drafts) {
            let tmpSlide = 0;
            if (tabStatus === TabStatus.Private) {
                tmpSlide = (currentSlide + 1) % privateTemplates.length;
            } else if (tabStatus === TabStatus.Public) {
                tmpSlide = (currentSlide + 1) % publicTemplates.length;
            } else if (tabStatus === TabStatus.Third) {
                tmpSlide = (currentSlide + 1) % thirdPartyTemplates.length;
            } else if (tabStatus === TabStatus.Drafts) {
                tmpSlide = (currentSlide + 1) % drafts.length;
            }
            setCurrentSlide(tmpSlide);
        }
    }

    useEffect(() => {
        // Handle the current slide, in case of a page reload / fresh page.
        // Only set if all three resources are loaded to ensure a slide is set.
        if (privateTemplates && publicTemplates && thirdPartyTemplates && !currentTemplate && currentSlide == null) {
            if (templateId) {
                if (tabStatus === TabStatus.Private) {
                    const template = privateTemplates.find((m) => m.id === templateId);
                    if (template) {
                        setCurrentSlide(privateTemplates.indexOf(template));
                    } else {
                        setCurrentSlide(0);
                    }
                } else if (tabStatus === TabStatus.Public) {
                    const template = publicTemplates.find((m) => m.id === templateId);
                    if (template) {
                        setCurrentSlide(publicTemplates.indexOf(template));
                    } else {
                        setCurrentSlide(0);
                    }
                } else if (tabStatus === TabStatus.Third) {
                    setCurrentSlide(parseInt(templateId));
                }
            } else {
                setCurrentSlide(0);
            }
        }

        // Cleanup on unmount component
        return () => {
            setCurrentSlide(null);
        };
    }, [privateTemplates, publicTemplates, thirdPartyTemplates]);

    useEffect(() => {
        // Handle selections or set source if already on the right url
        if (publicTemplates && privateTemplates && thirdPartyTemplates && drafts && currentSlide !== null) {
            let tmpCurrentTemplate: ITempMeme;
            if (tabStatus === TabStatus.Private) {
                tmpCurrentTemplate = privateTemplates[currentSlide];
                if (tmpCurrentTemplate) {
                    if (templateId === tmpCurrentTemplate.id) {
                        // Set template if already on the right route, but slide was updated
                        setCurrentTemplateAndImgSource(tmpCurrentTemplate);
                    } else {
                        history.push(`/template/${TabStatus.Private}/${privateTemplates[currentSlide].id}`);
                    }
                }
            } else if (tabStatus === TabStatus.Public) {
                tmpCurrentTemplate = publicTemplates[currentSlide];
                if (tmpCurrentTemplate) {
                    if (templateId === tmpCurrentTemplate.id) {
                        // Set template if already on the right route, but slide was updated
                        setCurrentTemplateAndImgSource(tmpCurrentTemplate);
                    } else {
                        history.push(`/template/${TabStatus.Public}/${publicTemplates[currentSlide].id}`);
                    }
                }
            } else if (tabStatus === TabStatus.Third) {
                tmpCurrentTemplate = thirdPartyTemplates[currentSlide];
                if (tmpCurrentTemplate) {
                    if (templateId && parseInt(templateId) === currentSlide) {
                        setCurrentTemplateAndImgSource(tmpCurrentTemplate);
                    } else {
                        history.push(`/template/${TabStatus.Third}/${currentSlide}`);
                    }
                }
            } else if (tabStatus === TabStatus.Drafts) {
                tmpCurrentTemplate = drafts[currentSlide];
                if (tmpCurrentTemplate) {
                    if (templateId === tmpCurrentTemplate.id) {
                        // Set template if already on the right route, but slide was updated
                        setCurrentTemplateAndImgSource(tmpCurrentTemplate);
                    } else {
                        history.push(`/template/${TabStatus.Drafts}/${publicTemplates[currentSlide].id}`);
                    }
                }
            }
        }
    }, [currentSlide, tabStatus]);

    useEffect(() => {
        // Handle stuff on changing template
        if (
            currentSlide != null &&
            templateId &&
            tabStatus &&
            privateTemplates &&
            publicTemplates &&
            thirdPartyTemplates &&
            drafts
        ) {
            let template;
            if (tabStatus === TabStatus.Private) {
                template = privateTemplates[currentSlide];
            } else if (tabStatus === TabStatus.Public) {
                template = publicTemplates[currentSlide];
            } else if (tabStatus === TabStatus.Third) {
                template = thirdPartyTemplates[currentSlide];
            } else if (tabStatus === TabStatus.Drafts) {
                const hybridMeme = drafts[currentSlide];
                const meme = hybridMeme.meme;
                template = hybridMeme.template;
                if (meme) {
                    setCaptions(meme.captions);
                    setTags(meme.tags.join(", "));
                    setMemeTitle(meme.name);
                }
            }
            if (template) {
                setCurrentTemplateAndImgSource(template);
            }
        }
    }, [templateId, tabStatus]);

    useEffect(() => {
        // Handle stuff on first load or after signing in or out
        loadThirdPartyTemplates().then(loadPublicTemplates).then(loadPrivateTemplates);
        loadUserDrafts();
    }, [user]);

    async function setTemplateView(el: ITempMeme, index: number, tabStatus: TabStatus) {
        if (user) {
            setTabStatus(tabStatus);
            setCurrentSlide(index);
            if (tabStatus !== TabStatus.Third) {
                if (el instanceof HybridTempMeme) {
                    // This is a meme
                    const hybridTempMeme = el as HybridTempMeme;
                    if (hybridTempMeme.meme && hybridTempMeme.meme.id) {
                        await addMemeView(hybridTempMeme.meme.id, user.tokens);
                    }
                } else {
                    // This is a template
                    await addTemplateView(el.id ?? "", user.tokens);
                }
            }
        }
    }

    return (
        <Container id={"selection-container"} maxWidth="lg">
            <Grid container spacing={2}>
                <Grid item md={6}>
                    <TemplateView
                        memeTitle={memeTitle}
                        captions={captions}
                        tempMeme={currentTemplate}
                        next={next}
                        previous={previous}
                    />
                </Grid>
                <Grid container item md={6} spacing={2}>
                    <Grid item xs={12}>
                        <Paper>
                            <AppBar position="relative">
                                <Tabs
                                    value={tabState}
                                    onChange={(event, val) => {
                                        setTabState(val);
                                    }}
                                    aria-label="simple tabs example"
                                    variant="scrollable"
                                    scrollButtons="auto"
                                >
                                    <TabItem label="Public" hidden={!publicTemplates} />
                                    <TabItem label="Third Party" hidden={!thirdPartyTemplates} />
                                    <TabItem label="My Templates" hidden={!privateTemplates} />
                                    <TabItem label="My Drafts" hidden={!drafts} />
                                    <TabItem label="Upload" />
                                </Tabs>
                            </AppBar>
                            {publicTemplates && (
                                <TemplateTabPanel
                                    templates={publicTemplates}
                                    index={0}
                                    tabStatus={TabStatus.Public}
                                    tabState={tabState}
                                    setTemplateView={setTemplateView}
                                />
                            )}
                            {thirdPartyTemplates && (
                                <TemplateTabPanel
                                    templates={thirdPartyTemplates}
                                    index={1}
                                    tabStatus={TabStatus.Third}
                                    tabState={tabState}
                                    setTemplateView={setTemplateView}
                                />
                            )}
                            {privateTemplates && (
                                <TemplateTabPanel
                                    templates={privateTemplates}
                                    index={2}
                                    tabStatus={TabStatus.Private}
                                    tabState={tabState}
                                    setTemplateView={setTemplateView}
                                />
                            )}
                            {drafts && (
                                <TemplateTabPanel
                                    templates={drafts}
                                    index={3}
                                    tabStatus={TabStatus.Drafts}
                                    tabState={tabState}
                                    setTemplateView={setTemplateView}
                                />
                            )}
                            <TabPanel value={tabState} index={4}>
                                <UploadForm
                                    setCurrentTemplate={(template) => {
                                        setTabStatus(TabStatus.Private); // Its the users template
                                        if (template.access === Access.Private) {
                                            privateTemplates?.unshift(template);
                                            setPrivateTemplates(privateTemplates);
                                        } else if (template.access === Access.Public) {
                                            publicTemplates?.unshift(template);
                                            setPublicTemplates(publicTemplates);
                                        }
                                        setCurrentSlide(0);
                                    }}
                                />
                            </TabPanel>
                        </Paper>
                    </Grid>
                    <Grid item xs={12}>
                        <Paper>
                            <AppBar position="relative">
                                <Box p={1}>
                                    <Typography>Edit</Typography>
                                </Box>
                            </AppBar>
                            <Box padding={3}>
                                {currentTemplate && (
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <MemeEditor
                                                captions={captions}
                                                template={
                                                    currentTemplate instanceof HybridTempMeme
                                                        ? (currentTemplate as HybridTempMeme).template
                                                        : (currentTemplate as ITemplate)
                                                }
                                                tags={tags}
                                                setTags={setTags}
                                                setCaptions={(captions) => {
                                                    setCaptions(captions);
                                                    setForceUpdate(forceUpdate + 1);
                                                }}
                                                setMemeTitle={(title) => {
                                                    setMemeTitle(title);
                                                }}
                                                memeTitle={memeTitle}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <GenerateForm
                                                name={memeTitle}
                                                captions={captions}
                                                tags={tags}
                                                setTempMeme={setCurrentTemplate}
                                                template={
                                                    currentTemplate instanceof HybridTempMeme
                                                        ? (currentTemplate as HybridTempMeme).template
                                                        : (currentTemplate as ITemplate)
                                                }
                                                addDraft={(meme: HybridTempMeme) => {
                                                    drafts?.push(meme);
                                                    if (drafts) {
                                                        setDrafts([...drafts]);
                                                    }
                                                }}
                                            />
                                        </Grid>
                                    </Grid>
                                )}
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Grid>
        </Container>
    );
}

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        gridListTileBar: {
            height: "auto",
        },
        gridList: {
            flexWrap: "nowrap",
            maxHeight: 250,
        },
    })
);

function TemplateTabPanel(props: {
    templates: ITempMeme[];
    index: number;
    tabStatus: TabStatus;
    tabState: number;
    setTemplateView: (el: ITempMeme, index: number, tabStatus: TabStatus) => Promise<void>;
}) {
    const classes = useStyles();
    return (
        <TabPanel value={props.tabState} index={props.index}>
            <GridList className={classes.gridList} cellHeight={100} cols={6}>
                {props.templates.map((el, index) => (
                    <GridListTile key={"template" + el.id}>
                        {el.mediaType !== MediaType.Video ? (
                            <img
                                src={el.url ?? ""}
                                alt={el.name}
                                onClick={async () => {
                                    await props.setTemplateView(el, index, props.tabStatus);
                                }}
                            />
                        ) : (
                            <video
                                src={el.url ?? ""}
                                onClick={async () => {
                                    await props.setTemplateView(el, index, props.tabStatus);
                                }}
                            />
                        )}
                        <GridListTileBar title={`${el.name} (${el.mediaType})`} className={classes.gridListTileBar} />
                    </GridListTile>
                ))}
            </GridList>
        </TabPanel>
    );
}
