"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUser = exports.saveUsers = exports.loadUsers = void 0;
const fs = require('fs');
const path = require('path');
function loadUsers() {
    try {
        const usersPath = path.join(__dirname, '../data/users.json');
        const users = fs.readFileSync(usersPath, 'utf-8');
        return JSON.parse(users);
    }
    catch (error) {
        // If the file doesn't exist or is invalid, return an empty array
        return [];
    }
}
exports.loadUsers = loadUsers;
function saveUsers(users) {
    const usersPath = path.join(__dirname, '../data/users.json');
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf-8');
}
exports.saveUsers = saveUsers;
function findUser(user) {
    const users = loadUsers();
    const findUser = users.find((person) => person.username === user);
    return findUser;
}
exports.findUser = findUser;
//# sourceMappingURL=userFunctions.js.map