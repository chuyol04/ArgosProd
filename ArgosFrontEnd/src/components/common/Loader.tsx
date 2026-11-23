'use client'
import {GridLoader} from "react-spinners";

import React from 'react';

interface messageProp{
    message?:string;
}

const Loader: React.FC<messageProp> = ({message}) => {
    return(
        <div role="status" aria-live="polite" className="flex min-h-[50vh] w-full flex-col items-center justify-center px-4 text-center">
            <span className="my-4">{message || "Cargando…"}</span>
            <div data-slot="loading-indicator" aria-hidden="true"><GridLoader color="#005B94" /></div>
        </div>
    )
};

export default Loader;
