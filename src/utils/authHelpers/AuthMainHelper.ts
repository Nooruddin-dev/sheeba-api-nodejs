import { Request } from 'express';


export const encryptPassword = (password: string, shift: number = 5): string => {
    let originalText = password;
    let encryptedText = '';
  
    for (let i = 0; i < password.length; i++) {
      let char = password[i];
      let code = password.charCodeAt(i);
  
      // Encrypt uppercase letters
      if (code >= 65 && code <= 90) {
        char = String.fromCharCode(((code - 65 + shift) % 26) + 65);
      }
      // Encrypt lowercase letters
      else if (code >= 97 && code <= 122) {
        char = String.fromCharCode(((code - 97 + shift) % 26) + 97);
      }
      // Encrypt numbers
      else if (code >= 48 && code <= 57) {
        char = String.fromCharCode(((code - 48 + shift) % 10) + 48);
      }
  
      encryptedText += char;
    }
  
    return  encryptedText;
};




export const getBusnPartnerIdFromApiHeader = (req: Request): number => {
  try {
    if (!req.headers || !req.headers['busnpartnerid']) {
      return 0;
    }

    const busnPartnerId = req.headers['busnpartnerid'];
    if (busnPartnerId) {
      return parseInt(busnPartnerId as string, 10);
    } else {
      return 0;
    }
  } catch (error) {
    console.error(error);
    return 0;
  }
};

