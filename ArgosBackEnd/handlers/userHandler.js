// controllers/userController.js  (ESM)
import 'dotenv/config';
import crypto from 'crypto';
import MysqlClient from '../connections/mysqldb.js';
import userHelper from '../lib/helpers/userHelpers.js';
import admin from '../lib/helpers/firebaseAdmin.js';

function generateTempPassword() {
    return crypto.randomBytes(6).toString('base64url'); // 8 chars, URL-safe
}
 
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
 
// POST /users/create — admin creates user (Firebase + MySQL + role)
export async function createUser(req, res) {
    const { name, email, phone_number, role_id } = req.body;
    if (!name || !email) {
        return res.status(400).json({ success: false, motive: 'Name and email are required' });
    }

    try {
        // Check email not already in MySQL
        const [existing] = await MysqlClient.execute(
            'SELECT 1 FROM users WHERE email = ? LIMIT 1', [email]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, motive: 'Email already exists' });
        }

        // Create Firebase Auth user with temp password
        const tempPassword = generateTempPassword();
        const firebaseUser = await admin.auth().createUser({
            email,
            password: tempPassword,
            displayName: name,
        });

        // Insert into MySQL
        const [result] = await MysqlClient.execute(
            'INSERT INTO users (name, phone_number, email, is_active, firebase_uid) VALUES (?, ?, ?, ?, ?)',
            [name, phone_number || null, email, true, firebaseUser.uid]
        );
        const userId = result.insertId;

        // Assign role if provided
        if (role_id) {
            await MysqlClient.execute(
                'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
                [userId, role_id]
            );
        }

        return res.status(201).json({
            success: true,
            id: userId,
            temp_password: tempPassword,
            motive: 'User created successfully',
        });
    } catch (error) {
        console.error('Creating user error:', error);
        // If Firebase user was created but MySQL failed, try to clean up
        if (error.code !== 'auth/email-already-exists') {
            // Don't clean up if Firebase itself failed
        }
        const motive = error.code === 'auth/email-already-exists'
            ? 'Email already exists in Firebase'
            : 'Server Error';
        return res.status(500).json({ success: false, motive });
    }
}

// POST /users/:id/reset-password — admin resets user password
export async function resetUserPassword(req, res) {
    const { id } = req.params;
    try {
        const [users] = await MysqlClient.execute(
            'SELECT firebase_uid FROM users WHERE id = ? LIMIT 1', [id]
        );
        if (users.length === 0 || !users[0].firebase_uid) {
            return res.status(404).json({ success: false, motive: 'User not found' });
        }

        const newPassword = generateTempPassword();
        await admin.auth().updateUser(users[0].firebase_uid, { password: newPassword });

        return res.status(200).json({
            success: true,
            new_password: newPassword,
            motive: 'Password reset successfully',
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
}

// POST /users/change-password — authenticated user changes own password
export async function changePassword(req, res) {
    const { uid } = res.locals.firebase_uid;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
        return res.status(400).json({ success: false, motive: 'Password must be at least 6 characters' });
    }

    try {
        await admin.auth().updateUser(uid, { password: new_password });
        return res.status(200).json({ success: true, motive: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
}
 
// GET /users — paginated list with roles
export async function getUsers(req, res) {
    try {
        const { search } = req.query;
        const limitNum = Math.max(1, Math.min(1000, parseInt(req.query.limit, 10) || 100));
        const offsetNum = Math.max(0, parseInt(req.query.offset, 10) || 0);

        let baseWhere = '';
        const params = [];

        if (search) {
            baseWhere = ' WHERE u.name LIKE ? OR u.email LIKE ? OR u.phone_number LIKE ?';
            const pattern = `%${search}%`;
            params.push(pattern, pattern, pattern);
        }

        const query = `
            SELECT u.id, u.name, u.email, u.phone_number, u.is_active,
                   GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ', ') AS roles
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            ${baseWhere}
            GROUP BY u.id
            ORDER BY u.id DESC
            LIMIT ${limitNum} OFFSET ${offsetNum}
        `;

        const countQuery = `SELECT COUNT(*) as total FROM users u ${baseWhere}`;
        const countParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];

        const [rows] = await MysqlClient.execute(query, params);
        const [countResult] = await MysqlClient.execute(countQuery, countParams);
        const total = countResult[0]?.total || 0;

        return res.status(200).json({ success: true, data: rows, total });
    } catch (error) {
        console.error('Get users error:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
}

// GET /users/:id — user with roles + work instructions
export async function getUserById(req, res) {
    const { id } = req.params;
    try {
        const [users] = await MysqlClient.execute(
            'SELECT id, name, email, phone_number, is_active FROM users WHERE id = ?',
            [id]
        );
        if (users.length === 0) {
            return res.status(404).json({ success: false, motive: 'User not found' });
        }

        const [roles] = await MysqlClient.execute(
            `SELECT r.id, r.name FROM user_roles ur
             INNER JOIN roles r ON r.id = ur.role_id
             WHERE ur.user_id = ?`,
            [id]
        );

        const [workInstructions] = await MysqlClient.execute(
            `SELECT wi.id, wi.description, wi.inspection_rate_per_hour,
                    p.name AS part_name, s.name AS service_name, c.name AS client_name
             FROM work_instruction_collaborators wic
             INNER JOIN work_instructions wi ON wi.id = wic.work_instruction_id
             INNER JOIN parts p ON p.id = wi.part_id
             INNER JOIN services s ON s.id = wi.service_id
             INNER JOIN clients c ON c.id = s.client_id
             WHERE wic.user_id = ?`,
            [id]
        );

        return res.status(200).json({
            success: true,
            data: {
                ...users[0],
                roles,
                work_instructions: workInstructions,
            },
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
}

// PUT /users/:id — update user info + role
export async function updateUser(req, res) {
    const { id } = req.params;
    const { name, email, phone_number, is_active, role_id } = req.body;
    try {
        const [existing] = await MysqlClient.execute('SELECT id FROM users WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, motive: 'User not found' });
        }

        await MysqlClient.execute(
            'UPDATE users SET name = ?, email = ?, phone_number = ?, is_active = ? WHERE id = ?',
            [name, email, phone_number, is_active ?? true, id]
        );

        // Update role if provided
        if (role_id !== undefined) {
            await MysqlClient.execute('DELETE FROM user_roles WHERE user_id = ?', [id]);
            if (role_id) {
                await MysqlClient.execute(
                    'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
                    [id, role_id]
                );
            }
        }

        return res.status(200).json({ success: true, motive: 'User updated successfully' });
    } catch (error) {
        console.error('Update user error:', error);
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