//ozcabaudit\src\lib\auth\readToken.ts
import jwt from 'jsonwebtoken';
import {IUser} from "@/app/(protected)/users/types/users.types";

const secret:string = process.env.JWT_KEY ?? "dev";

export const verifyJWT = (token: string):Promise<IUser> => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, secret, (err, decoded) => {
            if (err) return reject(err);
            resolve(decoded as IUser);
        });
    });
}
