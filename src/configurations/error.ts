import { Response } from 'express';

export class BusinessError extends Error {
    constructor(code: number, message: string) {
        super(message);
        this.code = code;
    }

    public readonly code: number
}

export const HandleError = (res: Response, error: Error | unknown) => {
    if (error instanceof BusinessError) {
        res.status(error.code).json({ message: error.message });
    } else {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong! Please contact support' });
    }
}