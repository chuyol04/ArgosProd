'use client'
//ozcabaudit\src\contexts\users\userContext.tsx
import { createContext, useContext,useState, ReactNode} from 'react';
import {IUser} from "@/app/(protected)/users/types/users.types";

type UserContextType = {
    user: IUser|null;
    setUser: (user: IUser | null) => void;
}

export const UserContext = createContext<UserContextType|undefined>(undefined);

export const UserProvider = ({children}: {children : ReactNode}) =>{
    const [user, setUser] = useState<IUser | null>(null);

    const contextValue = {
        user,
        setUser,
    };

    return(
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
};
export const useUser = () =>{
    const context = useContext(UserContext);
    if(!context){
        throw new Error('useUser debe usasrse dentro de un provider');
    }
    return context;
};

