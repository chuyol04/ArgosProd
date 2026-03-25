// lib/helpers/userHelpers.js  (ESM)
import 'dotenv/config';
import MysqlClient from '../../connections/mysqldb.js';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function firebaseSignIn(email, password) {
    try {
        if (!FIREBASE_API_KEY) {
            throw new Error('Firebase API key not configured.');
        }
        if (!email || !password) throw new Error('Email and password are required.');

        const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        });

        if (!resp.ok) {
            const detail = await resp.text().catch(() => '');
            return { success: false, value: detail };
        }
        const { idToken, refreshToken, localId } = await resp.json();
        return { success: true, value: { idToken, firebaseUid: localId, refreshToken } };
    } catch (error) {
        return { success: false, value: error };
    }
}

export async function getValidUser(email) {
    try {
        console.log('Getting valid user:');
        const [rows] = await MysqlClient.execute(
            `SELECT 1 FROM users
         WHERE email = ? AND is_active = ? LIMIT 1`,
            [email, 1]
        );
        if (!rows[0]) {
            throw new Error('No active users with this email exist.');
        }
        return { success: true, value: rows[0] };
    } catch (error) {
        return { success: false, value: error.message };
    }
}

export async function getUserDetails(firebase_uid) {
    try {
        const [userRows] = await MysqlClient.execute(
            `SELECT u.id, u.name, u.phone_number, u.email
             FROM users u
             WHERE u.firebase_uid = ? LIMIT 1`,
            [firebase_uid]
        );

        if (userRows.length === 0) {
            throw new Error('User not found.');
        }

        const user = userRows[0];

        const [roleRows] = await MysqlClient.execute(
            `SELECT r.name
             FROM roles r
             INNER JOIN user_roles ur ON r.id = ur.role_id
             WHERE ur.user_id = ?`,
            [user.id]
        );

        const roles = roleRows.map(r => r.name);

        return {
            success: true,
            value: {
                ...user,
                roles,
            }
        };
    } catch (error) {
        console.error(error);
        return { success: false, value: error.message };
    }
}

// Default export
export default {
    firebaseSignIn,
    getValidUser,
    getUserDetails,
};
