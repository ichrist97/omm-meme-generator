import {ListItemIcon, ListItemText, MenuItem, Typography} from "@material-ui/core";
import React from "react";
import {MenuItemTypeMap} from "@material-ui/core/MenuItem/MenuItem";

interface CustomMenuItemProps {
    value: string | number;
    title: string;
    description: string;
    icon: JSX.Element;
    children?: React.ReactNode;
}

export function CustomMenuItem(
    props: CustomMenuItemProps & Partial<MenuItemTypeMap<{button?: boolean}, MenuItemTypeMap["defaultComponent"]>>
) {
    const {icon, title, description, children, ...menuItemProps} = props;
    return (
        <MenuItem {...menuItemProps}>
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText>
                <Typography>{title}</Typography>
                <Typography variant="caption">{description}</Typography>
            </ListItemText>
            {children}
        </MenuItem>
    );
}
