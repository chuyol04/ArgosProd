import MysqlClient from '../connections/mysqldb.js';

// CREATE
export async function createDefecto(req, res) {
  try {
    const { name, description } = req.body || {};

    if (!name) {
      return res.status(400).json({ success: false, motive: 'Name is required' });
    }

    const [result] = await MysqlClient.execute(
      'INSERT INTO defects (name, description) VALUES (?, ?)',
      [name, description || null]
    );

    return res.status(201).json({
      success: true,
      id: result.insertId,
      motive: 'Defect created successfully',
    });
  } catch (error) {
    console.error('Error creating defect:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ ALL
export async function getDefectos(req, res) {
  try {
    const [rows] = await MysqlClient.execute('SELECT * FROM defects');
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getting defects:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ ONE
export async function getDefectoById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await MysqlClient.execute(
      'SELECT * FROM defects WHERE id = ? LIMIT 1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, motive: 'Defect not found' });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error getting defect:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// UPDATE
export async function updateDefecto(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, motive: 'ID is required in the path' });
    }

    const [exists] = await MysqlClient.execute(
      'SELECT id FROM defects WHERE id = ? LIMIT 1',
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Defect not found' });
    }

    const [result] = await MysqlClient.execute(
      'UPDATE defects SET name = ?, description = ? WHERE id = ?',
      [name || null, description || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No defect was updated' });
    }

    return res.status(200).json({ success: true, motive: 'Defect updated' });
  } catch (error) {
    console.error('Error updating defect:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// DELETE
export async function deleteDefecto(req, res) {
  try {
    const { id } = req.params;

    const [exists] = await MysqlClient.execute(
      'SELECT id FROM defects WHERE id = ? LIMIT 1',
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Defect not found' });
    }

    const [result] = await MysqlClient.execute(
      'DELETE FROM defects WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No defect was deleted' });
    }

    return res.status(200).json({ success: true, motive: 'Defect deleted' });
  } catch (error) {
    console.error('Error deleting defect:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}
