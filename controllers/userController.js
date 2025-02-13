const getUser = (req, res) => {
    const user = req.params.id ?? "Guest";
    console.log(user);
    res.send(`Hello, ${user}!`);
};

module.exports = getUser;