import {
    Access,
    AppUser,
    ITemplate,
    uploadTemplateFile,
    uploadTemplateImageUrl,
    uploadTemplateScreenShotUrl,
} from "meme-generator-lib";
import {
    Box,
    Button,
    createStyles,
    FormControl,
    InputLabel,
    makeStyles,
    Select,
    TextField,
    Theme,
    Typography,
} from "@material-ui/core";
import React, {useContext, useState} from "react";
import {UserContext} from "../App";
import {PhotoCamera} from "@material-ui/icons";
import Webcam from "react-webcam";
import LockIcon from "@material-ui/icons/Lock";
import PublicIcon from "@material-ui/icons/Public";
import {getAccessString} from "../util/helper";
import {CustomMenuItem} from "../components/CustomMenuItem";

interface UploadFormProps {
    setCurrentTemplate: (template: ITemplate) => void;
}

const useFormStyles = makeStyles((theme: Theme) =>
    createStyles({
        margin: {
            margin: theme.spacing(1),
        },
    })
);

export function UploadForm(props: UploadFormProps) {
    const user = useContext(UserContext) as AppUser;
    // Upload
    const [templateName, setTemplateName] = React.useState<string>("");
    const [uploadFileName, setUploadFileName] = React.useState<string>("No file selected");
    const [uploadFileData, setUploadFileData] = React.useState<File | null>(null);
    const [uploadImageUrl, setUploadImageUrl] = React.useState<string | null>(null);
    const [uploadScreenShotUrl, setUploadScreenShotUrl] = React.useState<string | null>(null);
    const [uploadSnapshot, setUploadSnapshot] = React.useState<string>("");
    const webcamRef = React.useRef<Webcam>(null);
    const capture = React.useCallback(() => {
        const uploadSnapshot = webcamRef.current?.getScreenshot();
        if (uploadSnapshot) {
            setUploadSnapshot(uploadSnapshot);
        }
    }, [webcamRef, setUploadSnapshot]);
    const [access, setAccess] = useState<Access>(Access.Private);
    const classes = useFormStyles();

    async function uploadTemplates() {
        const tokens = user.tokens;

        let currentTemplate;
        if (uploadFileData) {
            currentTemplate = await uploadTemplateFile(uploadFileData, templateName, access, tokens);
        }

        if (uploadImageUrl) {
            currentTemplate = await uploadTemplateImageUrl(uploadImageUrl, templateName, access, tokens);
        }

        if (uploadSnapshot) {
            const blob = await (await fetch(uploadSnapshot)).blob();
            const file = new File([blob], new Date().toISOString() + ".png", {type: "image/png"});
            currentTemplate = await uploadTemplateFile(file, templateName, access, tokens);
        }

        if (uploadScreenShotUrl) {
            currentTemplate = await uploadTemplateScreenShotUrl(uploadScreenShotUrl, templateName, access, tokens);
        }
        if (currentTemplate) {
            props.setCurrentTemplate(currentTemplate);
        }
    }

    return (
        <Box>
            <Box className={classes.margin}>
                <TextField
                    autoFocus
                    margin="dense"
                    id={"meme-title-input"}
                    label={"Template name"}
                    type="text"
                    fullWidth
                    onChange={(el) => {
                        setTemplateName(el.target.value);
                    }}
                />
                <TextField
                    autoFocus
                    margin="dense"
                    id={"meme-title-input"}
                    label={"Media URL (jpg, jpeg, png, gif, mp4)"}
                    type="text"
                    fullWidth
                    onChange={(el) => {
                        setUploadImageUrl(el.target.value);
                    }}
                />
                <TextField
                    autoFocus
                    margin="dense"
                    id={"meme-title-input"}
                    label={"Screenshot from Website URL"}
                    type="text"
                    fullWidth
                    onChange={(el) => {
                        setUploadScreenShotUrl(el.target.value);
                    }}
                />
                <Box display="flex" alignItems="center" minHeight="64px">
                    <input
                        id="templateFileUploadInput"
                        accept="image/*,video/mp4"
                        onChange={(event) => {
                            const fileData = event.target.files && event.target.files[0];
                            setUploadFileData(fileData);
                            setUploadFileName(fileData?.name ?? "No file selected");
                        }}
                        type="file"
                        style={{display: "none"}}
                    />
                    <label htmlFor="templateFileUploadInput">
                        <Button color="primary" variant="contained" component="span" startIcon={<PhotoCamera />}>
                            <Typography>Select File</Typography>
                        </Button>
                    </label>
                    <Box ml={2}>
                        <Typography>{uploadFileName}</Typography>
                    </Box>
                </Box>
                <hr />
                <Box display="flex" alignItems="center">
                    <Box mr={2}>
                        <Button
                            color="primary"
                            variant="contained"
                            component="span"
                            startIcon={<PhotoCamera />}
                            onClick={capture}
                        >
                            <Typography>Snapshot</Typography>
                        </Button>
                    </Box>
                    <Webcam audio={false} height={180} ref={webcamRef} screenshotFormat="image/jpeg" />
                    <img src={uploadSnapshot} height={180} />
                </Box>
            </Box>
            <hr />
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
                </Select>
            </FormControl>
            <FormControl>
                <Button onClick={() => uploadTemplates()} color="secondary" variant="contained">
                    <Typography>Upload</Typography>
                </Button>
            </FormControl>
        </Box>
    );
}
