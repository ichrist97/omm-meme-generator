import {Container, Grid} from "@material-ui/core";
import React, {useContext, useEffect, useState} from "react";
import {UserContext} from "../App";
import {MemeScroll} from "./MemeScroll";
import {SingleMeme} from "./SingleMeme";
import {FilterSortSearch} from "./FilterSortSearch";
import {FilterProps, getPublicMemes, getUserMemes, IMemeRelations} from "meme-generator-lib";
import {Route, RouteComponentProps, useHistory} from "react-router-dom";

export enum MemeTabStatus {
    Private = "private",
    Public = "public",
}

export function MemeScreen(props: RouteComponentProps) {
    const [memesPublic, setMemesPublic] = useState<IMemeRelations[] | null>(null);
    const [memesPrivate, setMemesPrivate] = useState<IMemeRelations[] | null>(null);
    const [currentSlide, setCurrentSlide] = useState<number | null>(null);
    const [tabStatus, setTabStatus] = useState<MemeTabStatus>(MemeTabStatus.Public);

    const history = useHistory();
    const user = useContext(UserContext);

    async function loadPrivateMemes(filterProps: FilterProps) {
        if (!user) return;
        let memes: IMemeRelations[];
        try {
            memes = await getUserMemes(user.tokens, user?.id!, filterProps);
        } catch (e) {
            memes = [];
        }
        setMemesPrivate(memes);
    }

    async function loadPublicMemes(filterProps: FilterProps) {
        let memes: IMemeRelations[];
        try {
            memes = await getPublicMemes(filterProps);
        } catch (e) {
            memes = [];
        }
        setMemesPublic(memes);
    }

    useEffect(() => {
        // Check if all resources are loaded, to avoid changing the route multiple times
        if ((memesPrivate || !user) && memesPublic && currentSlide !== null && currentSlide >= 0) {
            if (memesPrivate && tabStatus === MemeTabStatus.Private) {
                history.push(`/meme/${memesPrivate[currentSlide].id}`);
            } else if (tabStatus === MemeTabStatus.Public) {
                history.push(`/meme/${memesPublic[currentSlide].id}`);
            }
        }
    }, [currentSlide, tabStatus]);

    useEffect(() => {
        // Handle stuff on first load or after signing in or out

        loadPublicMemes({createdSort: true}).then();
        loadPrivateMemes({createdSort: true}).then();
    }, [user]);

    return (
        <Container id={"selection-container"} maxWidth="lg">
            <Grid container spacing={2}>
                <Grid item md={8}>
                    <Route path={`${props.match.path}meme/:memeId`}>
                        {memesPublic && (
                            <SingleMeme
                                memesPrivate={memesPrivate}
                                memesPublic={memesPublic}
                                tabStatus={tabStatus}
                                setTabStatus={setTabStatus}
                                currentSlide={currentSlide}
                                setCurrentSlide={setCurrentSlide}
                            />
                        )}
                    </Route>
                    <Route path={[`${props.match.path}`, "meme"]} exact>
                        <MemeScroll
                            memesPrivate={memesPrivate}
                            memesPublic={memesPublic}
                            onClick={(el, index, _tabStatus) => {
                                setTabStatus(_tabStatus);
                                setCurrentSlide(index);
                            }}
                        />
                    </Route>
                </Grid>
                <Grid item md={4}>
                    <FilterSortSearch loadPrivateMemes={loadPrivateMemes} loadPublicMemes={loadPublicMemes} />
                </Grid>
            </Grid>
        </Container>
    );
}
