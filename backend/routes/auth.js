const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User= require("../models/User");


//Register
router.post("/register", async(req, res)=>{
    const {name, email, password} = req.body;

    try{
        let user= await User.findOne({email});
        if(user) return res.status(400).json({
            message: "User alraedy exits"
        });
        user = new User({name, email, password});
        const salt= await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload= {user: {id: user.id}};
        const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn : "1h"});

        res.json({token, 
            user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePic: user.profilePic || ""
            }
        });
    }catch(err){
    console.error(err.message);
    res.status(500).send("Server Error");
    }
});

//Login
router.post("/login", async(req, res)=>{
    const {email, password} = req.body;

    try{
        const user = await User.findOne({email});
        if(!user) return res.status(400).json({message: "Invalid Credentials"});

        const isMatch= await bcrypt.compare(password, user.password);
        if(!isMatch) return res.status(400).json({message:"Invalid Credentials"});
        
        const payload = {user: {id: user.id}};
        const token= jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: "1h"});
        res.json({token,

            user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePic: user.profilePic || ""
        }
        });

    }catch(err){
        console.log(err.message);
        res.status(400).send("Server error");
    }
});

module.exports = router;

