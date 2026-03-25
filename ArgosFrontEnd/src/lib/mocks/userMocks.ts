import {IUser} from '@/app/(protected)/users/types/users.types';

const getMockUser = ():IUser => {
    const user:IUser = {
        id: 1,
        email: "admin@admin.com",
        name: "fernando",
        roles: ["Admin"]
    }
    return user;
};

export {getMockUser};
