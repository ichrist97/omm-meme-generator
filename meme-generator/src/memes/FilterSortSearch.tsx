import React, {useContext, useEffect, useState} from "react";
import {
    createMemeFilterCollection,
    FilterProps,
    getImgFlipTemplates,
    getPublicTemplates,
    getUserTemplates,
    ITemplate,
    MediaType,
} from "meme-generator-lib";
import {
    AppBar,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    FormControl,
    FormControlLabel,
    Grid,
    InputLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    TextField,
    Toolbar,
    Typography,
} from "@material-ui/core";
import {createStyles, makeStyles, Theme} from "@material-ui/core/styles";
import DateFnsUtils from "@date-io/date-fns";
import {KeyboardDatePicker, MuiPickersUtilsProvider} from "@material-ui/pickers";
import {UserContext} from "../App";

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        container: {
            display: "flex",
            flexWrap: "wrap",
        },
        textField: {
            marginLeft: theme.spacing(1),
            marginRight: theme.spacing(1),
            width: 200,
        },
        button: {
            margin: theme.spacing(1),
        },
    })
);

export function FilterSortSearch(props: {
    loadPrivateMemes: (filterSortProps: FilterProps) => Promise<void>;
    loadPublicMemes: (filterSortProps: FilterProps) => Promise<void>;
}) {
    const [privateTemplates, setPrivateTemplates] = useState<ITemplate[]>([]);
    const [publicTemplates, setPublicTemplates] = useState<ITemplate[]>([]);
    const [thirdPartyTemplates, setThirdPartyTemplates] = useState<ITemplate[]>([]);
    const user = useContext(UserContext);
    const [sortBy, setSortBy] = useState<string>("created");
    const [selectedMediaType, setSelectedMediaType] = useState<MediaType | undefined>(undefined);
    const defaultDateAfter = new Date();
    defaultDateAfter.setMonth(defaultDateAfter.getMonth() - 1); // From last month
    const [selectedDateAfter, setSelectedDateAfter] = useState<Date>(defaultDateAfter);
    const [selectedDateBefore, setSelectedDateBefore] = useState<Date>(new Date());
    const [selectedViews, setSelectedViews] = useState<string>("5");
    const [selectedLikes, setSelectedLikes] = useState<string>("5");
    const [selectedTemplate, setSelectedTemplate] = useState<string>("");
    const [selectedTitle, setSelectedTitle] = useState<string>("");
    const [searchTitle, setSearchTitle] = useState<boolean>(false);
    const [selectedLimit, setSelectedLimit] = useState<string | null>(null);
    const [pendingMemeCollection, setPendingMemeCollection] = useState<boolean>(false);

    const defaultCheckedState = {
        checkedCreatedAfter: false,
        checkedCreatedBefore: false,
        checkedViews: false,
        checkedLikes: false,
        checkedTemplate: false,
        checkedMediaType: false,
    };
    const [checkedState, setCheckedState] = React.useState(defaultCheckedState);

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

    useEffect(() => {
        handleFilter();
    }, [checkedState]);

    useEffect(() => {
        if (checkedState.checkedCreatedAfter) handleFilter();
    }, [selectedDateAfter]);

    useEffect(() => {
        if (checkedState.checkedCreatedBefore) handleFilter();
    }, [selectedDateBefore]);

    useEffect(() => {
        if (checkedState.checkedViews) handleFilter();
    }, [selectedViews]);

    useEffect(() => {
        if (checkedState.checkedLikes) handleFilter();
    }, [selectedLikes]);

    useEffect(() => {
        if (checkedState.checkedTemplate) handleFilter();
    }, [selectedTemplate]);

    useEffect(() => {
        if (checkedState.checkedMediaType) handleFilter();
    }, [selectedMediaType]);

    useEffect(() => {
        handleFilter();
    }, [sortBy, selectedTitle]);

    useEffect(() => {
        // Handle stuff on first load or after signing in or out
        loadThirdPartyTemplates().then(loadPublicTemplates).then(loadPrivateTemplates);
    }, [user]);

    const handleChangeChecked = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCheckedState({...checkedState, [event.target.name]: event.target.checked});
    };

    function getFilterProps(): FilterProps {
        return {
            createdBefore: checkedState.checkedCreatedBefore ? selectedDateBefore : undefined,
            createdAfter: checkedState.checkedCreatedAfter ? selectedDateAfter : undefined,
            views: checkedState.checkedViews ? selectedViews : undefined,
            likes: checkedState.checkedLikes ? selectedLikes : undefined,
            mediaType: checkedState.checkedMediaType ? selectedMediaType : undefined,
            template: checkedState.checkedTemplate ? selectedTemplate : undefined,
            viewsSort: sortBy === "views" ? true : undefined,
            likesSort: sortBy === "likes" ? true : undefined,
            createdSort: sortBy === "created" ? true : undefined,
            commentsSort: sortBy === "comments" ? true : undefined,
            name: searchTitle ? selectedTitle : undefined,
        };
    }

    function handleFilter() {
        const filterProps = getFilterProps();
        props.loadPublicMemes(filterProps);
        props.loadPrivateMemes(filterProps);
    }

    const handleSortChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSortBy(event.target.value);
    };
    const classes = useStyles();

    return (
        <>
            <Grid container direction="column">
                <AppBar position="relative">
                    <Box p={1}>Filter</Box>
                </AppBar>
                <Grid item>
                    <Toolbar>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={checkedState.checkedCreatedAfter}
                                    onChange={handleChangeChecked}
                                    name="checkedCreatedAfter"
                                />
                            }
                            label=""
                        />
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <KeyboardDatePicker
                                disableToolbar
                                variant="inline"
                                format="dd.MM.yyyy"
                                margin="normal"
                                id="date-picker-inline"
                                label="Created after"
                                value={selectedDateAfter}
                                onChange={(date?: Date | null) => {
                                    if (date) {
                                        setSelectedDateAfter(date);
                                    }
                                }}
                                KeyboardButtonProps={{
                                    "aria-label": "change date",
                                }}
                            />
                        </MuiPickersUtilsProvider>
                    </Toolbar>
                </Grid>
                <Grid item>
                    <Toolbar>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={checkedState.checkedCreatedBefore}
                                    onChange={handleChangeChecked}
                                    name="checkedCreatedBefore"
                                />
                            }
                            label=""
                        />
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <KeyboardDatePicker
                                disableToolbar
                                variant="inline"
                                format="dd.MM.yyyy"
                                margin="normal"
                                id="date-picker-inline"
                                label="Created before"
                                value={selectedDateBefore}
                                onChange={(date?: Date | null) => {
                                    if (date) {
                                        setSelectedDateBefore(date);
                                    }
                                }}
                                KeyboardButtonProps={{
                                    "aria-label": "change date",
                                }}
                            />
                        </MuiPickersUtilsProvider>
                    </Toolbar>
                </Grid>
                <Grid item>
                    <Toolbar>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={checkedState.checkedViews}
                                    onChange={handleChangeChecked}
                                    name="checkedViews"
                                />
                            }
                            label=""
                        />
                        <TextField
                            placeholder="views"
                            value={selectedViews}
                            label="Views"
                            inputProps={{"aria-label": "description"}}
                            onChange={(e) => {
                                setSelectedViews(e.target.value);
                            }}
                            fullWidth={true}
                        />
                    </Toolbar>
                </Grid>
                <Grid item>
                    <Toolbar>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={checkedState.checkedLikes}
                                    onChange={handleChangeChecked}
                                    name="checkedLikes"
                                />
                            }
                            label=""
                        />
                        <TextField
                            placeholder="likes"
                            value={selectedLikes}
                            inputProps={{"aria-label": "description"}}
                            onChange={(e) => {
                                setSelectedLikes(e.target.value);
                            }}
                            label="Likes"
                            fullWidth={true}
                        />
                    </Toolbar>
                </Grid>
                <Grid item>
                    <Toolbar>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={checkedState.checkedTemplate}
                                    onChange={handleChangeChecked}
                                    name="checkedTemplate"
                                />
                            }
                            label=""
                        />
                        <FormControl fullWidth={true}>
                            <InputLabel>Used Template</InputLabel>
                            <Select
                                labelId="demo-simple-select-helper-label"
                                id="demo-simple-select-helper"
                                value={selectedTemplate}
                                onChange={(e) => {
                                    setSelectedTemplate(e.target.value as string);
                                }}
                            >
                                {privateTemplates.map((el) => {
                                    return (
                                        <MenuItem key={el.id} value={el.id?.toString()}>
                                            {el.name}
                                        </MenuItem>
                                    );
                                })}
                                {publicTemplates.map((el) => {
                                    return (
                                        <MenuItem key={el.id} value={el.id?.toString()}>
                                            {el.name}
                                        </MenuItem>
                                    );
                                })}
                                {thirdPartyTemplates.map((el) => {
                                    return (
                                        <MenuItem key={el.id} value={el.id?.toString()}>
                                            {el.name}
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>
                    </Toolbar>
                </Grid>
                <Grid item>
                    <Toolbar>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={checkedState.checkedMediaType}
                                    onChange={handleChangeChecked}
                                    name="checkedMediaType"
                                />
                            }
                            label=""
                        />
                        <FormControl fullWidth={true}>
                            <InputLabel>File Format</InputLabel>
                            <Select
                                labelId="demo-simple-select-helper-label"
                                id="demo-simple-select-helper"
                                value={selectedMediaType}
                                onChange={(a) => {
                                    setSelectedMediaType(a.target.value as MediaType);
                                }}
                            >
                                <MenuItem value={undefined}>all</MenuItem>
                                <MenuItem value={MediaType.Image}>image</MenuItem>
                                <MenuItem value={MediaType.GIF}>gif</MenuItem>
                                <MenuItem value={MediaType.Video}>video</MenuItem>
                            </Select>
                        </FormControl>
                    </Toolbar>
                </Grid>
                <Grid item>
                    <Button
                        className={classes.button}
                        onClick={() => {
                            setSelectedDateAfter(defaultDateAfter);
                            setSelectedDateBefore(new Date());
                            setSelectedViews("5");
                            setSelectedLikes("5");
                            setSelectedMediaType(undefined);
                            setSelectedTemplate("");
                            setCheckedState(defaultCheckedState);
                            handleFilter();
                        }}
                        color="secondary"
                        variant="contained"
                    >
                        <Typography>reset</Typography>
                    </Button>
                </Grid>
            </Grid>
            <Grid container direction="column">
                <AppBar position="relative">
                    <Box p={1}>Sort</Box>
                </AppBar>
                <Toolbar>
                    <RadioGroup aria-label="sort" name="sort" value={sortBy} onChange={handleSortChange}>
                        <FormControlLabel value="created" control={<Radio />} label="creation date" />
                        <FormControlLabel value="views" control={<Radio />} label="views" />
                        <FormControlLabel value="likes" control={<Radio />} label="likes" />
                        <FormControlLabel value="comments" control={<Radio />} label="comments" />
                    </RadioGroup>
                </Toolbar>
                <div>
                    <Button
                        className={classes.button}
                        onClick={() => {
                            setSortBy("");
                            handleFilter();
                        }}
                        color="secondary"
                        variant="contained"
                    >
                        <Typography>reset</Typography>
                    </Button>
                </div>
            </Grid>
            <Grid container direction="column">
                <AppBar position="relative">
                    <Box p={1}>Search</Box>
                </AppBar>
                <Toolbar>
                    <TextField
                        placeholder="search title"
                        value={selectedTitle}
                        inputProps={{"aria-label": "description"}}
                        onChange={(e) => {
                            setSearchTitle(true);
                            setSelectedTitle(e.target.value);
                        }}
                        fullWidth={true}
                        label="Title"
                    />
                </Toolbar>
                <div>
                    <Button
                        className={classes.button}
                        onClick={() => {
                            setSelectedTitle("");
                            setSearchTitle(false);
                            handleFilter();
                        }}
                        color="secondary"
                        variant="contained"
                    >
                        <Typography>reset</Typography>
                    </Button>
                </div>
            </Grid>
            <Grid container direction="column">
                <AppBar position="relative">
                    <Box p={1}>Generate Collection of Public Memes</Box>
                </AppBar>
                <Toolbar>
                    <TextField
                        placeholder="∞"
                        value={selectedLimit}
                        onChange={(e) => {
                            setSelectedLimit(e.target.value);
                        }}
                        label="Limit"
                        fullWidth={true}
                    />
                </Toolbar>
                <div>
                    <Button
                        className={classes.button}
                        onClick={async () => {
                            setPendingMemeCollection(true);
                            const filterProps = getFilterProps();
                            if (selectedLimit) {
                                filterProps.limit = parseInt(selectedLimit);
                            }
                            await createMemeFilterCollection(filterProps, user?.tokens);
                            setPendingMemeCollection(false);
                        }}
                        color="secondary"
                        variant="contained"
                    >
                        {pendingMemeCollection ? (
                            <CircularProgress color="inherit" />
                        ) : (
                            <Typography>generate</Typography>
                        )}
                    </Button>
                </div>
            </Grid>
        </>
    );
}
