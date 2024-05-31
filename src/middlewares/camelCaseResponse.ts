// middlewares/camelCaseResponse.ts
import { Request, Response, NextFunction } from 'express';
import { keysToCamelCase } from '../utils/commonHelpers/MiddleWareHelper';


export function camelCaseResponseKeys(req: Request, res: Response, next: NextFunction): void {
    const originalJson = res.json;

    res.json = function(data: any): Response {
        const camelCaseData = keysToCamelCase(data);
        return originalJson.call(this, camelCaseData);
    };

    next();
}
