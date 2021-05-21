import React from "react";
import {Box, Tab, TabProps} from "@material-ui/core";

export interface TabItemProps extends TabProps {
    hidden?: boolean;
}

export function TabItem(props: TabItemProps) {
    const {children, hidden, ...other} = props;
    return <>{!hidden && <Tab {...other}>{children}</Tab>}</>;
}
