const express = require('express')
const router = express.Router();
const uuid = require('uuid')
const bcrypt = require('bcrypt');
const session = require('express-session')
import { connectedUser } from "../functions_and_classes/classes";
import { findUser, saveSession, saveUser } from "../functions_and_classes/userFunctionsDB";


router.use(session({
    secret: 'SuperSecret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 5 * 60 * 60 * 1000 }
}))

router.post('/register-login', async (req, res) => {
    const { username, password, mode, } = req.body
    //find user with the same username 
    const sameUser = await findUser(username)
    const { id } = sameUser as connectedUser

    if (mode.toLowerCase() === 'register') {
        if (sameUser) {
            console.log('user already exists')
            return res.status(400).send(JSON.stringify({
                type: 'userExists',
                message: 'User Already Exists, Choose a Different User Name'
            })
            );
        }
        //if mode === register and user not found

        try {
            //encrypt passqord 
            const hashedPassword: string = await bcrypt.hash(password, 10);
            // Register the user with the hashed password

            const newUser = new connectedUser(uuid.v4(), username, `${new Date()}`, hashedPassword);
            await saveUser(newUser)

            console.log('User successfully registered');
            return res.status(200).send(JSON.stringify("Successfully Registered"))
        }
        catch (err) {
            console.log('Error saving user')
            res.status(500).send((JSON.stringify("Problem saving user")))
        }
    }

    else if (mode.toLowerCase() === 'login') {
        if (!sameUser) {
            return res.status(400).send(JSON.stringify({
                type: 'userDoesNotExist',
                message: 'User Not Found'
            }))
        }
        //compare password
        const isMatch = await bcrypt.compare(password, sameUser.password)

        if (!isMatch) {
            return res.status(400).send(JSON.stringify({
                type: 'wrongPassword',
                message: 'Password or Username is Incorrect'
            }))
        }

        req.session.user = sameUser;
        req.session.expiration = req.session.cookie.expires.toString()
        saveSession(id, username, req.session)
        console.log('User successfully logged in');
        return res.status(200).json("Successfully Logged In");
    }

    else if (mode.toLowerCase() !== 'login' && mode.toLowerCase() !== 'register') {
        // Invalid mode
        console.log('Invalid mode');
        return res.status(400).send(JSON.stringify({
            type: 'invalidMode',
            message: 'Mode is Not Supported'
        }));
    }

    else {
        // Invalid mode
        console.log('Server error');
        res.status(500).json({
            type: 'serverError',
            message: 'Internal Error'
        });
    }
})

module.exports = router

