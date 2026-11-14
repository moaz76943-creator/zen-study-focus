const fs = require('fs');
console.log(fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8').substring(78000, 79000));
