declare namespace Tampermonkey {
    type ContentType = string | { type?: string; mimetype?: string };
}
declare function GM_setClipboard(
    data: string,
    info?: Tampermonkey.ContentType,
    callback?: () => void,
): void;
declare var GM: Readonly<{
    setClipboard(data: string, info?: Tampermonkey.ContentType): Promise<void>;
}>;