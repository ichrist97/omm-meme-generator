import {Box, Button} from "@material-ui/core";
import {useState} from "react";
import SignInComponent from "./SignInComponent";
import SignUpComponent from "./SignUpComponent";
import {useCookies} from "react-cookie";
import {signIn, signOut, signUp, AppUser, RestError} from "meme-generator-lib";
import {useHistory} from "react-router-dom";

export function isSignedIn(cookies: any): boolean {
    return false;
}

export interface SignProps {
    setUser: (user: AppUser | null) => void;
}

export function getUserFromSession(cookies: any): AppUser | null {
    if (cookies && cookies.user) {
        return cookies.user;
    }
    return null;
}

export function SignIn(props: SignProps) {
    const [cookies, setCookie, removeCookie] = useCookies();
    const [open, setOpen] = useState(false);

    const onSubmit = async (username: string, password: string) => {
        try {
            const user = await signIn(username, password);
            setCookie("user", user);
            props.setUser(user);
            setOpen(false);
        } catch (e: any) {
            const restErr = e as RestError;
            alert(restErr.message ?? restErr.statusText);
        }
    };

    return (
        <>
            <Box m={1}>
                <Button color="inherit" onClick={() => setOpen(true)}>
                    Sign In
                </Button>
            </Box>
            <SignInComponent open={open} onClose={() => setOpen(false)} onSubmit={onSubmit} />
        </>
    );
}

export function SignUp(props: SignProps) {
    const [cookies, setCookie, removeCookie] = useCookies();
    const [open, setOpen] = useState(false);

    const onSubmit = async (username: string, email: string, password: string) => {
        await signUp(username, password, email);
        const user = await signIn(username, password);
        setCookie("user", user);
        props.setUser(user);
        setOpen(false);
    };

    return (
        <>
            <Box m={1}>
                <Button color="inherit" onClick={() => setOpen(true)}>
                    Sign Up
                </Button>
            </Box>
            <SignUpComponent open={open} onClose={() => setOpen(false)} onSubmit={onSubmit} />
        </>
    );
}

export function SignOut(props: SignProps & {user: AppUser}) {
    const [cookies, setCookie, removeCookie] = useCookies();
    const history = useHistory();

    const onClick = async () => {
        await signOut(props.user.tokens);
        removeCookie("user");
        props.setUser(null);
        history.push("/");
    };

    return (
        <Box m={1}>
            <Button color="inherit" onClick={onClick}>
                Sign Out
            </Button>
        </Box>
    );
}
