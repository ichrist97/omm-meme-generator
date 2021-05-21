import {IWindow} from "../types/types";
import {Access, MemeProvider} from "meme-generator-lib";

// please note,
// that IE11 now returns undefined again for window.chrome
// and new Opera 30 outputs true for window.chrome
// but needs to check if window.opr is not undefined
// and new IE Edge outputs to true now for window.chrome
// and if not iOS Chrome check
// so use the below updated condition
const iWindow: IWindow = window as any;
const isChromium = iWindow.chrome;
const winNav = iWindow.navigator;
const vendorName = winNav.vendor;
const isOpera = typeof iWindow.opr !== "undefined";
const isIEedge = winNav.userAgent.indexOf("Edge") > -1;

/**
 * Returns whether browser from client is Chrome or other
 */
export function isChrome() {
    // is Google Chrome
    if (
        isChromium !== null &&
        typeof isChromium !== "undefined" &&
        vendorName === "Google Inc." &&
        !isOpera &&
        !isIEedge
    ) {
        return true;
    }
    // not Google Chrome
    return false;
}

export function getAccessString(access: Access): string {
    switch (access) {
        case Access.Private:
            return "Private";
        case Access.Public:
            return "Public";
        case Access.Unlisted:
            return "Unlisted";
    }
    return "Unknown";
}

export function getProviderString(provider: MemeProvider): string {
    switch (provider) {
        case MemeProvider.Client:
            return "Client";
        case MemeProvider.Server:
            return "Server";
        case MemeProvider.ImgFlip:
            return "ImgFlip";
    }
    return "Unknown";
}
