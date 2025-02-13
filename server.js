//storage
require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const user = require('./routes/api/user');
const logger = require('./middleware/logger');
const path = require('path');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const authJWT = require('./middleware/authJWT');
const authRole = require('./middleware/authRole');
const fsPromises = require('fs/promises');
const fs = require('fs');
const tokenPath = path.join(__dirname, 'data', 'refreshToken.txt');
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const mongoose = require('mongoose');
const connectDB = require('./config/dbConn');
const User = require('./data/User');
const Employee = require('./data/Employee');

// Connect to mongodb
connectDB();

//route handlers
app.use(logger);
//post request supporters

app.use(cookieParser());
app.use(session({
    secret: "example",
    saveUninitialized: false,
    resave: false,
    cookie: { httpOnly: true, secure: false }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static('public'));

// verifies JWT
app.use(authJWT);
app.use(authRole);

app.use('/user', user);

app.get('/', (req, res) => {
    res.send(`Hello, World!`);
});
app.get('/about', (req, res) => {
    res.send("About Us");
});
app.get('/contact', (req, res) => {
    res.send("Contact Page");
});
app.get('/services', (req, res) => {
    res.send("Our Services");
});
app.get('/profile', (req, res) => {
    if (!req.user) return res.sendStatus(401);
    res.status(200).send(`Welcome, ${req.user.username}`);
});
app.get('/admin', (req, res) => {
    res.status(200).send("Welcome, Admin!");
});
app.get('/employees', async (req, res) => {
    const employees = await Employee.find();
    if(!employees) return res.sendStatus(204);
    res.json(employees);
});
app.post('/employees', async (req, res) => {
    const { firstname, lastname } = req.body;
    await Employee.create({
        "firstname": firstname,
        "lastname": lastname
    });
    res.status(201).send(req.body);
});
app.put('/employees', async (req, res) => {
    const { firstname, lastname, id } = req.body;
    const employee = Employee.findOne({ _id: id }).exec();
    if(firstname) employee.firstname = firstname;
    if(lastname) employee.lastname = lastname;
    const result = await employee.save();
    res.json(result);
});
app.delete('/employees', async (req,res) => {
    const employee = await Employee.findOne({ _id: req.body.id }).exec();
    const result = await employee.deleteOne({ _id:req.body.id });
    res.json(result);
});
app.get('/employees/:id', async (req, res) => {
    const employee = await Employee.findOne({ _id: req.params.id }).exec();
    res.json(employee);
});
//post requests
//user logs in
app.post('/login', async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) return res.status(406).send("Missing credentials");
    const regexp = new RegExp("(^Admin$|^User$)", "g");
    if (!regexp.test(role)) return res.status(404).send("Role not found");
    const userData = {
        "username": username,
        "role": role
    };
    const accessToken = jwt.sign(userData, ACCESS_TOKEN, { expiresIn: '30s' });
    const refreshToken = jwt.sign(userData, REFRESH_TOKEN);
    const duplicate = await User.findOne({ username: username }).exec();
    if (duplicate) {
        return res.sendStatus(409);

    }
    const result = await User.create({
        "username": username,
        "password": password,
        "refreshToken": refreshToken
    });

    console.log(result);

    await fsPromises.writeFile(tokenPath, refreshToken);
    await fsPromises.writeFile(tokenPath.replace("refreshToken.txt", "accessToken.txt"), accessToken);
    res.cookie('accessToken', accessToken, { httpOnly: true });
    res.cookie('refreshToken', refreshToken, { httpOnly: true });
    res.status(201).send(accessToken);
});
app.post('/refresh', (req, res) => {
    const refreshToken = req.headers.authorization;
    if (!refreshToken) return res.sendStatus(404);
    jwt.verify(refreshToken.replace("Bearer ", ""), REFRESH_TOKEN, async (err, decoded) => {
        if (err || !decoded) return res.sendStatus(403);
        const newToken = jwt.sign({
            username: decoded.username,
            role: decoded.role
        }, ACCESS_TOKEN, { expiresIn: '30s' });
        await fsPromises.writeFile(tokenPath.replace("refreshToken.txt", "accessToken.txt"), newToken);
        res.cookie('accessToken', newToken, { httpOnly: true });
        res.status(201).send(newToken);
    });
});
app.get('/logout', async (req, res) => {
    if (fs.existsSync(tokenPath)) {
        await fsPromises.unlink(tokenPath);
        await fsPromises.unlink(tokenPath.replace("refreshToken.txt", "accessToken.txt"));
    }
    const refreshToken = req.cookies.refreshToken;
    const foundUser = await User.findOne({
        "refreshToken": refreshToken
    }).exec();
    foundUser.refreshToken = "";
    const result = await foundUser.save();
    console.log(result);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.status(200).send('Logged out successfully!');
});

//no results
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'html', '404.html'));
});

//server listener
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
