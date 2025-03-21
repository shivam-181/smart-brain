const bcrypt = require('bcrypt-nodejs');

const password = "cricket"; // Password you are trying to verify
const storedHash = "$2a$10$9bAksJ2t9x6jXkdOpT9l0OeJp.Wfw1kH.EwO/yzlN7yrhRsR8Zo/W"; // Your stored hash

const isMatch = bcrypt.compareSync(password, storedHash);
console.log("Does password match?", isMatch);
