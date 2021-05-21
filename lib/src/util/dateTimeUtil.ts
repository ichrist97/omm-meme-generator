/**
 * https://stackoverflow.com/a/14509447/5164462
 * @param key
 * @param value
 */
const datePattern = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/;

export function dateTimeReviver(key: string, value: string | number): Date | number | string {
    const isDate = typeof value === "string" && datePattern.exec(value);
    return isDate ? new Date(value) : value;
}
