const express = require('express')
const router = express.Router();
const fs = require('fs').promises;
const uuid = require('uuid')
import { connectedUser } from "../functions_and_classes/classes";

import { loadUsers, saveUsers } from "../functions_and_classes/userFunctions";


interface User {
    username: string;
    dateJoined: string
    // add other properties here if needed
}

router.post('/register', async (req, res) => {
    const { username : string } = req.body
   
    //find user with the same username 
   
    const users = loadUsers()
    const sameUser: any = users.find(user => user.username === req.body.username)
    if (sameUser) {
        console.log('user already exists')
        return res.status(400).send('user already exists');
    }
    //push to user array
    users.push(
        new connectedUser(uuid.v4(), req.body.username, new Date()))

    //write to fs file
    saveUsers(users)
    res.status(200).send("Successfully Registered")
})
module.exports = router