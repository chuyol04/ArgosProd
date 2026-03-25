import MysqlClient from '../connections/mysqldb.js';

// CREATE
export async function createServicio(req, res) {
  try {
    const { client_id, start_date, end_date, name } = req.body || {};

    if (!client_id || !start_date) {
      return res.status(400).json({ success: false, motive: 'client_id and start_date are required' });
    }

    const [client] = await MysqlClient.execute('SELECT id FROM clients WHERE id = ? LIMIT 1', [client_id]);
    if (client.length === 0) {
      return res.status(404).json({ success: false, motive: 'Client not found' });
    }

    const [result] = await MysqlClient.execute(
      'INSERT INTO services (client_id, start_date, end_date, name) VALUES (?, ?, ?, ?)',
      [client_id, start_date, end_date || null, name || null]
    );

    return res.status(201).json({ success: true, id: result.insertId, motive: 'Service created' });
  } catch (error) {
    console.error('Error creating service:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ - all services with client data, search, and pagination
export async function getServicios(req, res) {
  try {
    const { search } = req.query;
    const limitNum = Math.max(1, Math.min(1000, parseInt(req.query.limit, 10) || 100));
    const offsetNum = Math.max(0, parseInt(req.query.offset, 10) || 0);

    let query = `
      SELECT s.id, s.start_date, s.end_date, s.name,
             c.id AS client_id, c.name AS client_name, c.email AS client_email
      FROM services s
      INNER JOIN clients c ON s.client_id = c.id
    `;
    const params = [];

    if (search) {
      query += ' WHERE s.name LIKE ? OR c.name LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ` ORDER BY s.id DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [rows] = await MysqlClient.execute(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM services s
      INNER JOIN clients c ON s.client_id = c.id
    `;
    const countParams = [];
    if (search) {
      countQuery += ' WHERE s.name LIKE ? OR c.name LIKE ?';
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern);
    }
    const [countResult] = await MysqlClient.execute(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    return res.status(200).json({ success: true, data: rows, total });
  } catch (error) {
    console.error('Error getting services:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ - services by client
export async function getServiciosByCliente(req, res) {
  try {
    const { client_id } = req.query;
    if (!client_id) {
      return res.status(400).json({ success: false, motive: 'client_id is required in query' });
    }

    const [rows] = await MysqlClient.execute(`
      SELECT s.id, s.start_date, s.end_date, s.name,
             c.id AS client_id, c.name AS client_name, c.email AS client_email
      FROM services s
      INNER JOIN clients c ON s.client_id = c.id
      WHERE s.client_id = ?
      ORDER BY s.id DESC
    `, [client_id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, motive: 'No services found for this client' });
    }
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getting services by client:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// READ - service by ID (with client, work instructions, and users)
export async function getServicioById(req, res) {
  try {
    const { id } = req.params;

    const [servRows] = await MysqlClient.execute(`
      SELECT s.id, s.client_id, s.start_date, s.end_date, s.name,
             c.name AS client_name, c.email AS client_email
      FROM services s
      INNER JOIN clients c ON s.client_id = c.id
      WHERE s.id = ? LIMIT 1
    `, [id]);

    if (servRows.length === 0) {
      return res.status(404).json({ success: false, motive: 'Service not found' });
    }
    const service = servRows[0];

    const [work_instructions] = await MysqlClient.execute(
      `SELECT wi.id, wi.inspection_rate_per_hour, wi.description, wi.part_id, p.name AS part_name
       FROM work_instructions wi
       INNER JOIN parts p ON p.id = wi.part_id
       WHERE wi.service_id = ?`,
      [id]
    );

    const [users] = await MysqlClient.execute(`
      SELECT u.id, u.name, u.email, r.name AS role
      FROM user_roles ur
      INNER JOIN users u ON ur.user_id = u.id
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE u.is_active = 1
    `);

    return res.status(200).json({
      success: true,
      data: {
        service,
        client: { id: service.client_id, name: service.client_name, email: service.client_email },
        work_instructions,
        collaborators: users
      }
    });
  } catch (error) {
    console.error('Error getting service by ID:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// UPDATE - a service
export async function updateServicio(req, res) {
  try {
    const { id } = req.params;
    const { client_id, start_date, end_date, name } = req.body || {};

    const [exists] = await MysqlClient.execute('SELECT id FROM services WHERE id = ? LIMIT 1', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Service not found' });
    }

    if (client_id) {
        const [client] = await MysqlClient.execute('SELECT id FROM clients WHERE id = ? LIMIT 1', [client_id]);
        if (client.length === 0) return res.status(404).json({ success: false, motive: 'Client not found' });
    }

    const fieldsToUpdate = [], params = [];
    if (client_id !== undefined) { fieldsToUpdate.push('client_id = ?'); params.push(client_id); }
    if (start_date !== undefined) { fieldsToUpdate.push('start_date = ?'); params.push(start_date); }
    if (end_date !== undefined) { fieldsToUpdate.push('end_date = ?'); params.push(end_date); }
    if (name !== undefined) { fieldsToUpdate.push('name = ?'); params.push(name); }

    if (fieldsToUpdate.length === 0) return res.status(400).json({ success: false, motive: 'No fields to update' });
    params.push(id);

    const [result] = await MysqlClient.execute(`UPDATE services SET ${fieldsToUpdate.join(', ')} WHERE id = ?`, params);
    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No service was updated' });
    }
    return res.status(200).json({ success: true, motive: 'Service updated' });
  } catch (error) {
    console.error('Error updating service:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// UPDATE DETAIL - Update with extended info
export async function updateServicioDetalle(req, res) {
  try {
    const { id } = req.params;
    const { name, collaborators } = req.body || {};

    const [serv] = await MysqlClient.execute('SELECT id FROM services WHERE id = ? LIMIT 1', [id]);
    if (serv.length === 0) {
      return res.status(404).json({ success: false, motive: 'Service not found' });
    }

    if (name) {
      await MysqlClient.execute('UPDATE services SET name = ? WHERE id = ?', [name, id]);
    }

    if (Array.isArray(collaborators) && collaborators.length > 0) {
      for (const collab of collaborators) {
        await MysqlClient.execute(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)',
          [collab.user_id, collab.role_id]
        );
      }
    }

    return res.status(200).json({ success: true, motive: 'Service updated with detail (collaborators, name)' });
  } catch (error) {
    console.error('Error updating service detail:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// DELETE
export async function deleteServicio(req, res) {
  try {
    const { id } = req.params;
    const [exists] = await MysqlClient.execute('SELECT id FROM services WHERE id = ? LIMIT 1', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, motive: 'Service not found' });
    }

    const [result] = await MysqlClient.execute('DELETE FROM services WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, motive: 'No service was deleted' });
    }
    return res.status(200).json({ success: true, motive: 'Service deleted' });
  } catch (error) {
    console.error('Error deleting service:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}
