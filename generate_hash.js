const bcrypt = require('bcrypt-nodejs');

const password = "bhul gya"; // ✅ The actual password to hash
bcrypt.hash(password, null, null, (err, hash) => {
    if (err) {
        console.error("Error hashing password:", err);
    } else {
        console.log("New Hashed Password:", hash); // ✅ Copy this hash
    }
});
