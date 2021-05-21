import React from "react";
import {Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, TextField} from "@material-ui/core";

type SignUpProps = {
    open: boolean;
    onClose: () => void;
    onSubmit: (username: string, email: string, password: string) => void;
};

class SignUpComponent extends React.Component<SignUpProps, {}> {
    username = "";
    email = "";
    password = "";
    passwordRepeat = "";

    constructor(props: any) {
        super(props);
        this.onSubmit = this.onSubmit.bind(this);
    }

    onSubmit() {
        if (this.password && this.password == this.passwordRepeat) {
            this.props.onSubmit(this.username, this.email, this.password);
        } else {
            alert("Password not valid");
        }
    }

    render() {
        return (
            <Dialog open={this.props.open} onClose={this.props.onClose} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title">Sign up</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="username"
                        label="Username"
                        type="text"
                        fullWidth
                        onChange={(e) => {
                            this.username = e.target.value;
                        }}
                    />
                    {/*<TextField
                        autoFocus
                        margin="dense"
                        id="email"
                        label="Email"
                        type="email"
                        fullWidth
                        onChange={(e) => {
                            this.email = e.target.value;
                        }}
                    />*/}
                    <TextField
                        autoFocus
                        margin="dense"
                        id="password"
                        label="Password"
                        type="password"
                        fullWidth
                        onChange={(e) => {
                            this.password = e.target.value;
                        }}
                    />
                    <TextField
                        autoFocus
                        margin="dense"
                        id="password-repeat"
                        label="Repeat Password"
                        type="password"
                        fullWidth
                        onChange={(e) => {
                            this.passwordRepeat = e.target.value;
                        }}
                    />
                    <Link href="#" variant="body2">
                        Forgot Password?
                    </Link>
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.props.onClose} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={this.onSubmit} color="primary">
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default SignUpComponent;
