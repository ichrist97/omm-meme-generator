/**
 * Interface for wrapping the global window object
 */
export interface IWindow extends Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    speechSynthesis: any;
    webkitSpeechSynthesis: any;
    chrome: any;
    opr: any;
}

/**
 * Interface for all speakable information of a meme
 */
export interface MemeSpeechInformation {
    name?: string;
    captions?: string;
    likes?: string;
    views?: string;
    comments?: string;
    tags?: string;
    template?: string;
    creator?: string;
    createdAt?: string;
}
