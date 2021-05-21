// source: https://material-ui.com/components/tabs/
import React from "react";
import {Box} from "@material-ui/core";

export interface TabPanelProps {
    children?: React.ReactNode;
    index: any;
    value: any;
}

// source: https://material-ui.com/components/tabs/
export function TabPanel(props: TabPanelProps) {
    const {children, value, index, ...other} = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`wrapped-tabpanel-${index}`}
            aria-labelledby={`wrapped-tab-${index}`}
            {...other}
        >
            {value === index && <Box p={3}>{children}</Box>}
        </div>
    );
}
