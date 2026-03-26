const jwt = require("jsonwebtoken");

const authmiddleware = (req, res, next) => {
    const authHeader = req.header("Authorization"); // grab full header

    // 1️⃣ Check if header exists
    if (!authHeader) {
        return res.status(401).json({ message: "No token, authorization needed" });
    }

    // 2️⃣ Remove "Bearer" safely
    const token = authHeader.split(" ")[1]; 

    // 3️⃣ Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;

        next();
    } catch (err) {
        res.status(401).json({ message: "Token is not valid" });
    }
};

module.exports = authmiddleware;