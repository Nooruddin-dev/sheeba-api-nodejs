import _ from 'lodash';


function toLowerCaseFirstChar(key: string): string {
    if (key.length === 0) return key;
    return key.charAt(0).toLowerCase() + key.slice(1);
}


export function keysToCamelCase(obj: any): any {
    if (_.isArray(obj)) {
        return obj.map(v => keysToCamelCase(v));
    } else if (_.isObject(obj)) {
        if (_.isDate(obj)) {
            return obj; // Return the date object as is
        }
        // return _.reduce(obj, (result, value, key) => {
        //     (result as Record<string, any>)[_.camelCase(key)] = keysToCamelCase(value);
        //     return result;
        // }, {} as Record<string, any>);

        return _.reduce(obj, (result, value, key) => {
            const newKey = toLowerCaseFirstChar(key);
            (result as Record<string, any>)[newKey] = keysToCamelCase(value);
            return result;
        }, {} as Record<string, any>);
    }
    return obj;
}