import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
    user: {
        id: number;
    };
}

export function auth(req: Request, res: Response, next: NextFunction): void {
    // const authHeader = req.headers.authorization

    // if (!authHeader) {
    //     res.status(401).json({ message: 'Unauthorized' });
    //     return;
    // }

    // try {
    //     const payload = jwt.verify(authHeader, process.env.JWT_SECRET || 'secret') as jwt.JwtPayload
    //     (req as AuthRequest).user  = {
    //         id: payload.id,
    //     }
    //     next();
    // } catch (error) {
    //     console.error(error);
    //     res.status(401).json({ message: 'Unauthorized' });
    //     return;
    // }

    const authHeader = req.headers.authorization
    if (!authHeader) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    try {
        (req as AuthRequest).user  = {
            id: parseInt(authHeader as string, 10),
        }
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
}
