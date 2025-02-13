require('dotenv').config();
const jwt = require('jsonwebtoken');
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

const authJWT = async (req, res, next) => {
    if(req.path !== "/login" && req.path !== "/refresh" && req.path !== "/logout"){
        const reqToken = req.cookies.accessToken;
        if(!reqToken) return res.sendStatus(401);
        jwt.verify(reqToken, ACCESS_TOKEN, (err, decoded) => {
            if(err) {
                console.error(err);
                return res.sendStatus(403);
            };
            req.user = decoded;
            console.log(decoded, "from authJWT.js");
            next();
        });
    }else{
        next();
    }
}

module.exports = authJWT;