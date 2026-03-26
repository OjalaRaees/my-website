import { useState } from "react";

function Input(){
    const[name, setName]= useState("");
    const value= (e)=>{
        setName(e.target.value);
    }
    return(
        <>
        <input value={name} onChange={(e)=>{value(e)}}></input>
        <p>Name: {name}</p>
        </>
    );
}
export default Input