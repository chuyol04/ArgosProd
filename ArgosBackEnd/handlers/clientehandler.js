
import MysqlClient from '../connections/mysqldb.js';

// CREATE
export async function createCliente(req, res) {
  try {
    const { name, contact_person, email, phone_number } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ success: false, motive: 'Nombre y email son requeridos' });
    }

    // Check for duplicate email
    const [rows] = await MysqlClient.execute(
      'SELECT id FROM clients WHERE email = ? LIMIT 1',
      [email]
    );
    if (rows.length > 0) {
      return res.status(409).json({ success: false, motive: 'El email ya existe' });
    }

    // Insert
    const [result] = await MysqlClient.execute(
      'INSERT INTO clients (name, contact_person, email, phone_number) VALUES (?, ?, ?, ?)',
      [name, contact_person || null, email, phone_number || null]
    );

    return res.status(201).json({
      success: true,
      id: result.insertId,
      motive: 'Cliente creado',
    });
  } catch (error) {
    console.error('Error creating client:', error);
    return res.status(500).json({ success: false, motive: 'Error del servidor' });
  }
}

// UPDATE
export async function updateCliente(req, res) {
  try {
    const { id } = req.params;
    const { name, contact_person, email, phone_number } = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, motive: 'ID es requerido en la ruta' });
    }

    // Check if client exists
    const [exists] = await MysqlClient.execute(
      'SELECT id FROM clients WHERE id = ? LIMIT 1',
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Cliente no encontrado' });
    }

    // Check for duplicate email (if a new one is provided)
    if (email) {
      const [dup] = await MysqlClient.execute(
        'SELECT id FROM clients WHERE email = ? AND id <> ? LIMIT 1',
        [email, id]
      );
      if (dup.length > 0) {
        return res.status(409).json({ success: false, motive: 'El email ya está en uso por otro cliente' });
      }
    }

    // Execute update
    const [result] = await MysqlClient.execute(
      'UPDATE clients SET name = ?, contact_person = ?, email = ?, phone_number = ? WHERE id = ?',
      [name || null, contact_person || null, email || null, phone_number || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No se actualizó ningún registro' });
    }

    return res.status(200).json({ success: true, motive: 'Cliente actualizado' });
  } catch (error) {
    console.error('Error updating client:', error);
    return res.status(500).json({ success: false, motive: 'Error del servidor' });
  }
}

// DELETE
export async function deleteCliente(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, motive: 'ID es requerido en la ruta' });
    }

    // Check if client exists
    const [exists] = await MysqlClient.execute(
      'SELECT id FROM clients WHERE id = ? LIMIT 1',
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Cliente no encontrado' });
    }

    // Delete
    const [result] = await MysqlClient.execute(
      'DELETE FROM clients WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No se eliminó ningún registro' });
    }

    return res.status(200).json({ success: true, motive: 'Cliente eliminado' });
  } catch (error) {
    console.error('Error deleting client:', error);
    return res.status(500).json({ success: false, motive: 'Error del servidor' });
  }
}

// READ - list all clients with optional search and pagination
export async function getClientes(req, res) {
  try {
    const { search } = req.query;
    // Parse and validate pagination params (default: limit=100, offset=0)
    const limitNum = Math.max(1, Math.min(1000, parseInt(req.query.limit, 10) || 100));
    const offsetNum = Math.max(0, parseInt(req.query.offset, 10) || 0);

    let query = 'SELECT * FROM clients';
    const params = [];

    // Add search filter
    if (search) {
      query += ' WHERE name LIKE ? OR email LIKE ? OR contact_person LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Add ordering and pagination (safe integer interpolation)
    query += ` ORDER BY id DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [rows] = await MysqlClient.execute(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM clients';
    const countParams = [];
    if (search) {
      countQuery += ' WHERE name LIKE ? OR email LIKE ? OR contact_person LIKE ?';
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }
    const [countResult] = await MysqlClient.execute(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    return res.status(200).json({ success: true, data: rows, total });
  } catch (error) {
    console.error('Error getting clients:', error);
    return res.status(500).json({ success: false, motive: 'Error del servidor' });
  }
}

// READ - get client by id
export async function getClienteById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await MysqlClient.execute(
      'SELECT * FROM clients WHERE id = ? LIMIT 1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, motive: 'Cliente no encontrado' });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error getting client:', error);
    return res.status(500).json({ success: false, motive: 'Error del servidor' });
  }
}
