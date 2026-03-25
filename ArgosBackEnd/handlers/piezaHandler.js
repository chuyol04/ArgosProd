import MysqlClient from '../connections/mysqldb.js';

// CREATE
export async function createPieza(req, res) {
  try {
    const { name, description } = req.body || {};
    if (!name) {
      return res.status(400).json({ success: false, motive: 'Name is required' });
    }

    const [result] = await MysqlClient.execute(
      'INSERT INTO parts (name, description) VALUES (?, ?)',
      [name, description || null]
    );

    return res.status(201).json({
      success: true,
      id: result.insertId,
      motive: 'Part created successfully',
    });
  } catch (error) {
    console.error('Error creating part:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ ALL
export async function getPiezas(req, res) {
  try {
    const [rows] = await MysqlClient.execute('SELECT * FROM parts');
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getting parts:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ ONE
export async function getPiezaById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await MysqlClient.execute('SELECT * FROM parts WHERE id = ? LIMIT 1', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, motive: 'Part not found' });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error getting part:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// UPDATE
export async function updatePieza(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, motive: 'ID is required in the path' });
    }

    const [exists] = await MysqlClient.execute('SELECT * FROM parts WHERE id = ? LIMIT 1', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Part not found' });
    }

    // Build dynamic update
    const fields = [];
    const params = [];

    if (name !== undefined) {
      fields.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      params.push(description);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, motive: 'No fields to update' });
    }

    params.push(id);

    const [result] = await MysqlClient.execute(
      `UPDATE parts SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No part was updated' });
    }

    return res.status(200).json({ success: true, motive: 'Part updated' });
  } catch (error) {
    console.error('Error updating part:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// DELETE
export async function deletePieza(req, res) {
  try {
    const { id } = req.params;

    const [exists] = await MysqlClient.execute('SELECT id FROM parts WHERE id = ? LIMIT 1', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Part not found' });
    }

    const [result] = await MysqlClient.execute('DELETE FROM parts WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No part was deleted' });
    }

    return res.status(200).json({ success: true, motive: 'Part deleted' });
  } catch (error) {
    console.error('Error deleting part:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}
