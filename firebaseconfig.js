const admin = require('firebase-admin');
// Usa el nombre que le pusiste al archivo
const serviceAccount = require('./firebase-key.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;