const authRole = (req, res, next) => {
    if(req.path !== '/login' && req.path !== "/refresh" && req.path !== "/logout"){
        const validRoles = /(^User$|^Admin$)/g;
        const reqRole = req.user.role;
        if(!validRoles.test(reqRole)){
            return res.status(404).send('Role not found');
        }else{
            const path = req.path;
            if(path === "/admin" && reqRole === "Admin"){
                next();
            }else if(path !== "/admin"){
                next();
            }else{
                res.sendStatus(403);
            }
        }
    }else{
        next();
    }
} 

module.exports = authRole;