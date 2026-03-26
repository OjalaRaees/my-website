import { useState } from "react";

function Button(){
    const[name, setname]= useState("");
/*     const [text, setText]= useState("");
    const[clicked, setClicked]= useState(false); */
    function handleClick(name){
        setname(`Helli ${name}`);

/*         setText("Ouuch");
        setClicked(true); */
    }

    return (
        <>
        <button className="bttn" onClick={()=>{handleClick("Bro")}}>Click</button>
        <p>{name}</p>
        </>
    );
}
export default Button