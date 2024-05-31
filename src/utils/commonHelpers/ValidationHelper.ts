export const stringIsNullOrWhiteSpace = (str: any) => {
    if (str == null || str == undefined || str == "undefined") {
        return true;
    }
    
    if (!isNaN(parseFloat(str))) {
        str = str.toString();
    }

    return (!str || str?.trim() === '');
}
