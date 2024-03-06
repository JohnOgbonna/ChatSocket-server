"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeValid = exports.getCurrentDateTime = void 0;
function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    return formattedDateTime;
}
exports.getCurrentDateTime = getCurrentDateTime;
function timeValid(dateTime) {
    const targetDateTime = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    const currentDateTime = new Date();
    return targetDateTime > currentDateTime;
}
exports.timeValid = timeValid;
//# sourceMappingURL=tools.js.map