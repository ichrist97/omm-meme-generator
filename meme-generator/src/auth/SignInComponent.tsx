import React from "react";
import {Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, TextField,} from "@material-ui/core";

type SignInProps = {
    open: boolean,
    onClose: () => void,
    onSubmit: (username: string, password: string) => void,
}

class SignInComponent extends React.Component<SignInProps, {}> {
    username = '';
    password = '';

    constructor(props: any) {
        super(props);
        this.onSubmit = this.onSubmit.bind(this);
    }

    onSubmit() {
        this.props.onSubmit(this.username, this.password);
    }

    render() {
        return (
            <Dialog open={this.props.open} onClose={this.props.onClose} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title">Sign in</DialogTitle>
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
                    <Link href="#" variant="body2">Forgot Password?</Link>
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

export default SignInComponent;