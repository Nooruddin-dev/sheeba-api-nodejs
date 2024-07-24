export const stringIsNullOrWhiteSpace = (str: any) => {
    if (str == null || str == undefined || str == "undefined") {
        return true;
    }
    
    if (!isNaN(parseFloat(str))) {
        str = str.toString();
    }

    return (!str || str?.trim() === '');
}


export const convertToTwoDecimalFloat = (input: number | string | undefined | null): number => {
    if (input === null || input === undefined) {
      return 0;
    }
  
    // Check if the input is an array
    if (Array.isArray(input)) {
      return 0; 
    }
  
    let num: number;
  
    if (typeof input === 'number') {
      num = input;
    } else if (typeof input === 'string') {
      num = parseFloat(input);
      if (isNaN(num)) {
        return 0;
      }
    } else {
      return 0;
    }
  
    return parseFloat(num.toFixed(2));
  };
  
  