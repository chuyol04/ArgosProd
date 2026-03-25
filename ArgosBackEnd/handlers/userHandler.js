// controllers/userController.js  (ESM)
import 'dotenv/config';
import MysqlClient from '../connections/mysqldb.js';
import userHelper from '../lib/helpers/userHelpers.js';
 
export async function userLogin(req, res) {
    const { email, password } = req.body;
    const requestedUser = await userHelper.getValidUser(email);
    if (!requestedUser.success) {
        return res.status(404).json({ success: false, motive: requestedUser.value });
    } else {
        try {
            const signedIn = await userHelper.firebaseSignIn(email, password);
            if (signedIn.success) {
                return res.status(200).json({ success: requestedUser.success, firebaseAccess: signedIn });
            }
        } catch (e) {
            return res.status(401).json({ success: false, motive: 'Unsuccessful authentication.' });
        }
    }
}
 
export async function createUser(req, res) {
    const { firebase_uid, name, email, phone_number } = req.body;
    try {
        const [rows] = await MysqlClient.execute(
            'SELECT 1 FROM users WHERE email = ? OR firebase_uid = ? LIMIT 1',
            [email, firebase_uid]
        );
        if (rows.length > 0) {
            return res.status(409).json({ success: false, motive: 'Email or Firebase UID already exists' });
        } else {
            const result = await MysqlClient.execute(
                `INSERT INTO users (name, phone_number, email, is_active, firebase_uid) VALUES (?, ?, ?, ?, ?) `,
                [name, phone_number, email, true, firebase_uid]
            );
            if (result[0].affectedRows > 0)
                return res.status(201).json({ success: true, motive: 'User created successfully' });
            return res.status(500).json({ success: false, motive: 'No user was created' });
        }
    } catch (error) {
        console.error('Creating user error:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
}
 
export async function getUserDetails(req, res) {
    const { uid } = res.locals.firebase_uid;
    const firebase_uid = uid; // Renamed for clarity
    const {success, value} = await userHelper.getUserDetails(firebase_uid);
    if (success) {
        return res.status(200).json({success, user: value});
    }
    else {
        return res.status(404).json({success, message: value});
    }
}