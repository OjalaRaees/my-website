import { useState } from "react";

function ColorPicker(){
    const[color, setColor]= useState("");
    const ChangeColor=(e)=>{
        setColor(e.target.value);
    }
    
    return(
        <div className="main">
            <h1>Color Picker</h1>
            <p>Color Selected</p>
            <div className="center" style={{backgroundColor:color}}>
                <p>Selected Color: {color}</p>
            </div>
            <p>Pick a Color</p>
            <input type="color" value={color} onChange={ChangeColor}></input>
        </div>
    );
}
export default ColorPicker