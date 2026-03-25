
import MysqlClient from '../connections/mysqldb.js';

// CREATE role
export async function createRol(req, res) {
  try {
    const { name, description } = req.body || {};

    if (!name) {
      return res.status(400).json({ success: false, motive: 'Name is required' });
    }

    const [result] = await MysqlClient.execute(
      'INSERT INTO roles (name, description) VALUES (?, ?)',
      [name, description || null]
    );

    return res.status(201).json({
      success: true,
      id: result.insertId,
      motive: 'Role created'
    });
  } catch (error) {
    console.error('Error creating role:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ all
export async function getRoles(req, res) {
  try {
    const [rows] = await MysqlClient.execute('SELECT * FROM roles');
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getting roles:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ one by id
export async function getRolById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await MysqlClient.execute(
      'SELECT * FROM roles WHERE id = ? LIMIT 1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, motive: 'Role not found' });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error getting role:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// UPDATE
export async function updateRol(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, motive: 'ID is required in the path' });
    }

    const [exists] = await MysqlClient.execute(
      'SELECT id FROM roles WHERE id = ? LIMIT 1',
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Role not found' });
    }

    const [result] = await MysqlClient.execute(
      'UPDATE roles SET name = ?, description = ? WHERE id = ?',
      [name || null, description || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No role was updated' });
    }

    return res.status(200).json({ success: true, motive: 'Role updated' });
  } catch (error) {
    console.error('Error updating role:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// DELETE
export async function deleteRol(req, res) {
  try {
    const { id } = req.params;

    const [exists] = await MysqlClient.execute(
      'SELECT id FROM roles WHERE id = ? LIMIT 1',
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Role not found' });
    }

    const [result] = await MysqlClient.execute(
      'DELETE FROM roles WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No role was deleted' });
    }

    return res.status(200).json({ success: true, motive: 'Role deleted' });
  } catch (error) {
    console.error('Error deleting role:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}
