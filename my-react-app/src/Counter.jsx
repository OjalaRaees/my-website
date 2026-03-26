import React, { useState } from "react"

function Counter(){
    const[count, setCount]= useState(0);
    let x= ()=>{
        setCount((c)=> c+1);
        setCount((c)=> c+1);
        setCount((c)=> c+1);
    }
    let y= ()=>{
        setCount(count-1);
    }
    let z= ()=>{
        setCount(0);
    }
    return(
        <div className="dec">
        <h1 className="decc">{count}</h1>
        <button className="btn" onClick={x}>Increment</button>
        <button className="btn"onClick={y}>Decrement</button>
        <button className="btn"onClick={z}>Reset</button>
        </div>
    );
}
export default Counter