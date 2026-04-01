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

// READ ALL with search and pagination
export async function getPiezas(req, res) {
  try {
    const { search } = req.query;
    const limitNum = Math.max(1, Math.min(1000, parseInt(req.query.limit, 10) || 100));
    const offsetNum = Math.max(0, parseInt(req.query.offset, 10) || 0);

    let query = 'SELECT * FROM parts';
    const params = [];

    if (search) {
      query += ' WHERE name LIKE ? OR description LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ` ORDER BY id DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [rows] = await MysqlClient.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM parts';
    const countParams = [];
    if (search) {
      countQuery += ' WHERE name LIKE ? OR description LIKE ?';
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern);
    }
    const [countResult] = await MysqlClient.execute(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    return res.status(200).json({ success: true, data: rows, total });
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
