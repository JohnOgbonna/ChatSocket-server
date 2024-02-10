const fs = require('fs')
const path = require('path');
import { connectedUser } from "./classes";


export function loadUsers() {
    try {
        const usersPath = path.join(__dirname, '../data/users.json');
        const users = fs.readFileSync(usersPath, 'utf-8');
        return JSON.parse(users);
    } catch (error) {
        // If the file doesn't exist or is invalid, return an empty array
        return [];
    }
}

export function saveUsers(users: any) {
    const usersPath = path.join(__dirname, '../data/users.json');
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf-8');
}

export function findUser(user: string) {
    const users: connectedUser[] = loadUsers()
    const findUser = users.find((person: connectedUser) => person.username === user)
    return findUser
}