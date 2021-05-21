import React, {useEffect, useState} from "react";
import logo from "./logo.svg";
import "./App.css";
import {getUserFromSession, SignIn, SignOut, SignUp} from "./auth/Authentication";
import {
    AppBar,
    Box,
    Button,
    Container,
    createMuiTheme,
    Dialog,
    DialogTitle,
    IconButton,
    MuiThemeProvider,
    ThemeOptions,
    Toolbar,
    Typography,
    useTheme,
} from "@material-ui/core";
import {CookiesProvider, useCookies} from "react-cookie";
import {AppUser, getUser, apiBaseUrl} from "meme-generator-lib";
import {MemeScreen} from "./memes/MemeScreen";
import {Switch, Route, BrowserRouter, NavLink} from "react-router-dom";
import {EditorScreen} from "./templates/EditorScreen";
import {Info} from "@material-ui/icons";
import {DialogProps} from "./components/DialogProps";

export const UserContext = React.createContext<AppUser | null>(null);

// THEME
export const mainThemeOptions: ThemeOptions = {
    palette: {
        primary: {
            main: "#282c34",
        },
        secondary: {
            main: "#9C27B0",
        },
    },
    overrides: {
        MuiGrid: {
            item: {
                flexGrow: 1,
            },
        },
        MuiAppBar: {
            root: {
                "& .MuiButton-root.Mui-disabled": {
                    color: "#CCC",
                },
            },
        },
    },
};
const mainTheme = createMuiTheme(mainThemeOptions);

const darkThemeOptions: ThemeOptions = {
    palette: {
        type: "dark",
        primary: {
            main: mainTheme.palette.primary.light,
        },
        secondary: {
            main: mainTheme.palette.secondary.light,
        },
    },
};
export const darkTheme = createMuiTheme(darkThemeOptions);

function AppContainer() {
    // set apiBaseUrl for shared library
    const apiHost = process.env.REACT_APP_API_HOST || "http://localhost:3000";
    apiBaseUrl.setUrl(apiHost);

    const [cookies, setCookie, removeCookie] = useCookies([]);
    const [user, setUser] = useState<AppUser | null>(null);
    const [isInfoDialogOpen, setInfoDialogOpen] = React.useState(false);

    const theme = useTheme();
    const activeLinkColor = {
        color: theme.palette.secondary.light,
    };

    useEffect(() => {
        /**
         * Load user from local session, but ask at server, if user is still logged in.
         * If not refresh tokens and save them in cookie. Then update user status.
         */
        const sessUser = getUserFromSession(cookies);
        if (sessUser) {
            (async () => {
                const sessAccessToken = sessUser.tokens.accessToken;
                try {
                    const currUser = await getUser(sessUser.tokens); // Token is altered
                    if (sessAccessToken !== currUser.tokens.accessToken) {
                        // Did refreshing, update session
                        setCookie("user", currUser);
                    }
                    setUser(currUser);
                } catch (e) {
                    // On failure remove cookie and reset user
                    removeCookie("user");
                    setUser(null);
                }
            })();
        }
    }, []);

    return (
        <UserContext.Provider value={user}>
            <BrowserRouter>
                <AppBar position="static">
                    <Container maxWidth="lg">
                        <Toolbar>
                            <Box display="flex" alignItems="center">
                                <Button component={NavLink} to="/" color="inherit">
                                    <img src={logo} className="App-logo" alt="logo" height="40px" />
                                </Button>
                            </Box>
                            <Box display="flex" marginX={1} height={1}>
                                <Button component={NavLink} to="/" color="inherit" activeStyle={activeLinkColor} exact>
                                    <Typography>Meme generator</Typography>
                                </Button>
                            </Box>
                            {user && (
                                <Box display="flex" alignItems="center" height={1} marginX={1}>
                                    <Button
                                        component={NavLink}
                                        to="/template"
                                        color="inherit"
                                        activeStyle={activeLinkColor}
                                    >
                                        <Box display="flex" alignItems="center">
                                            <Typography>Editor</Typography>
                                        </Box>
                                    </Button>
                                </Box>
                            )}
                            <Box flexGrow={1} />
                            <Box display="flex" alignItems="center" height={1}>
                                {user ? (
                                    <>
                                        <Typography variant="caption">Logged in as</Typography>
                                        <Typography variant="caption" color="secondary" style={{marginLeft: "8px"}}>
                                            {user.username}
                                        </Typography>
                                        <SignOut setUser={setUser} user={user} />
                                    </>
                                ) : (
                                    <>
                                        <SignIn setUser={setUser} />
                                        <SignUp setUser={setUser} />
                                    </>
                                )}
                            </Box>
                            <Box display="flex" height={1}>
                                <IconButton
                                    color="inherit"
                                    onClick={() => {
                                        setInfoDialogOpen(true);
                                    }}
                                >
                                    <Info />
                                </IconButton>
                            </Box>
                        </Toolbar>
                    </Container>
                </AppBar>
                <Box padding="16px">
                    <Switch>
                        {user && (
                            <Route
                                path={["/template/:urlTabStatus/:templateId", "/template"]}
                                component={EditorScreen}
                            />
                        )}
                        <Route path={["/", "/meme"]} component={MemeScreen} />
                    </Switch>
                </Box>
                <InfoDialog
                    open={isInfoDialogOpen}
                    onClose={() => {
                        setInfoDialogOpen(false);
                    }}
                />
            </BrowserRouter>
        </UserContext.Provider>
    );
}

function InfoDialog(props: DialogProps) {
    const {onClose, open} = props;

    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open} fullWidth={true}>
            <DialogTitle id="share-dialog-title">Imprint</DialogTitle>
            <Box m={3}>
                <Typography variant="h6">Contributors</Typography>
                <Typography variant="body1">
                    <ul>
                        <li>Ivo Christ</li>
                        <li>Sebastian Müller</li>
                        <li>Sophia Münch</li>
                        <li>August Oberhauser - info@reb0.org</li>
                    </ul>
                </Typography>
                Project of Online Multimedia Master Course - WiSe 2020 / 2021
            </Box>
        </Dialog>
    );
}

function App() {
    return (
        <MuiThemeProvider theme={mainTheme}>
            <CookiesProvider>
                <div className="App">
                    <AppContainer />
                </div>
            </CookiesProvider>
        </MuiThemeProvider>
    );
}

export default App;
