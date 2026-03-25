import admin from 'firebase-admin';
import mysql from 'mysql2/promise';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const EMAIL = 'admin@admin.com';
const PASSWORD = 'adminadmin';
const NAME = 'Admin';

async function main() {
  // 1. Crear usuario en Firebase
  let firebaseUser;
  try {
    firebaseUser = await admin.auth().createUser({ email: EMAIL, password: PASSWORD });
    console.log('Firebase user created:', firebaseUser.uid);
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      firebaseUser = await admin.auth().getUserByEmail(EMAIL);
      console.log('Firebase user already exists:', firebaseUser.uid);
    } else {
      throw err;
    }
  }

  // 2. Insertar o actualizar en MySQL
  const conn = await mysql.createConnection({
    host: process.env.DBHOST,
    port: process.env.DBPORT,
    user: process.env.DBUSER,
    password: process.env.DBPASS,
    database: process.env.DBDB,
  });

  const [existing] = await conn.execute('SELECT id FROM users WHERE email = ?', [EMAIL]);
  if (existing.length > 0) {
    await conn.execute('UPDATE users SET firebase_uid = ? WHERE email = ?', [firebaseUser.uid, EMAIL]);
    console.log('MySQL user updated');
  } else {
    await conn.execute(
      'INSERT INTO users (firebase_uid, name, email, is_active) VALUES (?, ?, ?, true)',
      [firebaseUser.uid, NAME, EMAIL]
    );
    console.log('MySQL user inserted');
  }

  // 3. Asignar rol Admin
  const [userRow] = await conn.execute('SELECT id FROM users WHERE email = ?', [EMAIL]);
  const userId = userRow[0].id;
  const [roles] = await conn.execute("SELECT id FROM roles WHERE name = 'Admin'");
  if (roles.length > 0) {
    await conn.execute(
      'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
      [userId, roles[0].id]
    );
    console.log('Admin role assigned');
  } else {
    console.log('Warning: Admin role not found in roles table');
  }

  await conn.end();
  console.log('\nDone. Login with:', EMAIL, '/', PASSWORD);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
