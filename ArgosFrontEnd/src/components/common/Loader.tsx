'use client'
import {GridLoader} from "react-spinners";

import React from 'react';

interface messageProp{
    message?:string;
}

const Loader: React.FC<messageProp> = ({message}) => {
    return(
        <div className='flex flex-col w-full h-[100vh] justify-center items-center'><span className="my-4">{message}</span> <GridLoader color="#005B94" /></div>
    )
};

export default Loader;