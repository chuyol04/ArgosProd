import MysqlClient from '../connections/mysqldb.js';

// CREATE
export async function createRolUsuario(req, res) {
  try {
    const { user_id, role_id } = req.body || {};
    if (!user_id || !role_id) {
      return res.status(400).json({ success: false, motive: 'user_id and role_id are required' });
    }

    // Validate FK: user
    const [u] = await MysqlClient.execute(
      'SELECT id FROM users WHERE id = ? LIMIT 1',
      [user_id]
    );
    if (u.length === 0) {
      return res.status(404).json({ success: false, motive: 'User not found' });
    }

    // Validate FK: role
    const [r] = await MysqlClient.execute(
      'SELECT id FROM roles WHERE id = ? LIMIT 1',
      [role_id]
    );
    if (r.length === 0) {
      return res.status(404).json({ success: false, motive: 'Role not found' });
    }

    // Avoid duplicate (same user-role pair)
    const [dup] = await MysqlClient.execute(
      'SELECT user_id FROM user_roles WHERE user_id = ? AND role_id = ? LIMIT 1',
      [user_id, role_id]
    );
    if (dup.length > 0) {
      return res.status(409).json({ success: false, motive: 'User already has this role assigned' });
    }

    const [result] = await MysqlClient.execute(
      'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
      [user_id, role_id]
    );

    return res.status(201).json({
      success: true,
      motive: 'Role assigned to user',
      user_id: user_id,
      role_id: role_id
    });
  } catch (error) {
    console.error('Error creating user role:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ - all
export async function getRolesUsuarios(req, res) {
  try {
    const [rows] = await MysqlClient.execute(`
      SELECT ur.user_id, u.name AS user_name, u.email,
             ur.role_id, ro.name AS role_name
      FROM user_roles ur
      INNER JOIN users u ON u.id = ur.user_id
      INNER JOIN roles ro    ON ro.id = ur.role_id
    `);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getting user roles:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ - by user ID
export async function getRolUsuarioById(req, res) {
  try {
    const { user_id } = req.params; // Changed to expect user_id in params
    const [rows] = await MysqlClient.execute(`
      SELECT ur.user_id, u.name AS user_name, u.email,
             ur.role_id, ro.name AS role_name
      FROM user_roles ur
      INNER JOIN users u ON u.id = ur.user_id
      INNER JOIN roles ro    ON ro.id = ur.role_id
      WHERE ur.user_id = ?
    `, [user_id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, motive: 'No roles found for this user' });
    }
    return res.status(200).json({ success: true, data: rows }); // Return all roles for the user
  } catch (error) {
    console.error('Error getting user roles by user ID:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// DELETE
export async function deleteRolUsuario(req, res) {
  try {
    const { user_id, role_id } = req.body; // Expect user_id and role_id in body

    if (!user_id || !role_id) {
        return res.status(400).json({ success: false, motive: 'user_id and role_id are required for deletion' });
    }

    const [ex] = await MysqlClient.execute(
      'SELECT user_id FROM user_roles WHERE user_id = ? AND role_id = ? LIMIT 1',
      [user_id, role_id]
    );
    if (ex.length === 0) {
      return res.status(404).json({ success: false, motive: 'User role assignment not found' });
    }

    const [result] = await MysqlClient.execute(
      'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?',
      [user_id, role_id]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No user role assignment was deleted' });
    }
    return res.status(200).json({ success: true, motive: 'User role assignment deleted' });
  } catch (error) {
    console.error('Error deleting user role:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// The UPDATE function is removed as managing user roles will now rely on create and delete operations for the composite key.
