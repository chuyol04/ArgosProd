import MysqlClient from '../connections/mysqldb.js';
import { sanitizeDateField } from '../lib/helpers/dateTimeHelpers.js';
import { resolveClientScope } from '../lib/helpers/clientScope.js';

function normalizeClientUserIds(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;

  const ids = [...new Set(value.map(Number))];
  return ids.every((id) => Number.isSafeInteger(id) && id > 0) ? ids : null;
}

async function validateClientUsers(connection, clientId, userIds) {
  if (userIds.length === 0) return true;

  const placeholders = userIds.map(() => '?').join(',');
  const [rows] = await connection.execute(
    `SELECT DISTINCT u.id
     FROM users u
     INNER JOIN user_roles ur ON ur.user_id = u.id
     INNER JOIN roles r ON r.id = ur.role_id AND r.name = 'Cliente'
     WHERE u.id IN (${placeholders}) AND u.client_id = ? AND u.is_active = 1`,
    [...userIds, clientId]
  );

  return rows.length === userIds.length;
}

async function replaceServiceClientUsers(connection, serviceId, userIds) {
  await connection.execute('DELETE FROM service_client_users WHERE service_id = ?', [serviceId]);
  if (userIds.length === 0) return;

  const placeholders = userIds.map(() => '(?, ?)').join(',');
  const params = userIds.flatMap((userId) => [serviceId, userId]);
  await connection.execute(
    `INSERT INTO service_client_users (service_id, user_id) VALUES ${placeholders}`,
    params
  );
}

// CREATE
export async function createServicio(req, res) {
  let connection;
  try {
    const { client_id, start_date, end_date, name, client_user_ids } = req.body || {};
    const safeClientUserIds = normalizeClientUserIds(client_user_ids);

    const safeStartDate = sanitizeDateField(start_date);
    if (!client_id || !safeStartDate) {
      return res.status(400).json({ success: false, motive: 'client_id and start_date are required' });
    }
    if (safeClientUserIds === null) {
      return res.status(400).json({ success: false, motive: 'client_user_ids must be an array of positive integers' });
    }
    const safeEndDate = sanitizeDateField(end_date) ?? null;

    connection = await MysqlClient.getConnection();
    await connection.beginTransaction();

    const [client] = await connection.execute('SELECT id FROM clients WHERE id = ? LIMIT 1', [client_id]);
    if (client.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, motive: 'Client not found' });
    }
    const assignedUsers = safeClientUserIds ?? [];
    if (!await validateClientUsers(connection, client_id, assignedUsers)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        motive: 'Every assigned portal user must be active and belong to the service client',
      });
    }

    const [result] = await connection.execute(
      'INSERT INTO services (client_id, start_date, end_date, name) VALUES (?, ?, ?, ?)',
      [client_id, safeStartDate, safeEndDate, name || null]
    );
    await replaceServiceClientUsers(connection, result.insertId, assignedUsers);
    await connection.commit();

    return res.status(201).json({ success: true, id: result.insertId, motive: 'Service created' });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error('Error creating service:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  } finally {
    connection?.release();
  }
}

// READ - all services with client data, search, and pagination
export async function getServicios(req, res) {
  try {
    const { search } = req.query;
    const limitNum = Math.max(1, Math.min(1000, parseInt(req.query.limit, 10) || 100));
    const offsetNum = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const scope = resolveClientScope(req, res);

    if (scope.invalid) {
      return res.status(400).json({ success: false, motive: 'client_id must be a positive integer' });
    }
    if (scope.denyAll) {
      return res.status(200).json({ success: true, data: [], total: 0 });
    }

    let query = `
      SELECT s.id, s.start_date, s.end_date, s.name,
             c.id AS client_id, c.name AS client_name, c.email AS client_email
      FROM services s
      INNER JOIN clients c ON s.client_id = c.id
    `;
    const params = [];
    const conditions = [];

    if (scope.clientId) {
      conditions.push('s.client_id = ?');
      params.push(scope.clientId);
    }
    if (search) {
      conditions.push('(s.name LIKE ? OR c.name LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY s.id DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [rows] = await MysqlClient.execute(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM services s
      INNER JOIN clients c ON s.client_id = c.id
    `;
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }
    const [countResult] = await MysqlClient.execute(countQuery, params);
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

// READ - active client-portal users eligible for assignment to a service
export async function getClientUsersForService(req, res) {
  try {
    const clientId = Number(req.query.client_id);
    if (!Number.isSafeInteger(clientId) || clientId <= 0) {
      return res.status(400).json({ success: false, motive: 'client_id must be a positive integer' });
    }

    const [rows] = await MysqlClient.execute(
      `SELECT DISTINCT u.id, u.name, u.email
       FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id
       INNER JOIN roles r ON r.id = ur.role_id AND r.name = 'Cliente'
       WHERE u.client_id = ? AND u.is_active = 1
       ORDER BY u.name, u.email`,
      [clientId]
    );

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getting client users for service:', error);
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

    const [[work_instructions], [users], [client_users]] = await Promise.all([
      MysqlClient.execute(
        `SELECT wi.id, wi.inspection_mode, wi.inspection_rate_per_hour, wi.start_date, wi.description, wi.part_id, p.name AS part_name
         FROM work_instructions wi
         INNER JOIN parts p ON p.id = wi.part_id
         WHERE wi.service_id = ?`,
        [id]
      ),
      // Operational collaborators: work-instruction collaborators and inspectors.
      MysqlClient.execute(`
        SELECT DISTINCT u.id, u.name, u.email, COALESCE(r.name, 'Sin rol') AS role
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.is_active = 1
          AND (
            u.id IN (
              SELECT wic.user_id
              FROM work_instruction_collaborators wic
              INNER JOIN work_instructions wi ON wi.id = wic.work_instruction_id
              WHERE wi.service_id = ?
            )
            OR
            u.id IN (
              SELECT id.inspector_id
              FROM inspection_details id
              INNER JOIN inspection_reports ir ON ir.id = id.inspection_report_id
              INNER JOIN work_instructions wi ON wi.id = ir.work_instruction_id
              WHERE wi.service_id = ?
            )
          )
        ORDER BY u.name
      `, [id, id]),
      MysqlClient.execute(
        `SELECT u.id, u.name, u.email
         FROM service_client_users scu
         INNER JOIN users u ON u.id = scu.user_id
         WHERE scu.service_id = ? AND u.is_active = 1
         ORDER BY u.name, u.email`,
        [id]
      ),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        service,
        client: { id: service.client_id, name: service.client_name, email: service.client_email },
        work_instructions,
        collaborators: users,
        client_users,
      }
    });
  } catch (error) {
    console.error('Error getting service by ID:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
}

// UPDATE - a service
export async function updateServicio(req, res) {
  let connection;
  try {
    const { id } = req.params;
    const { client_id, start_date, end_date, name, client_user_ids } = req.body || {};
    const safeClientUserIds = normalizeClientUserIds(client_user_ids);
    if (safeClientUserIds === null) {
      return res.status(400).json({ success: false, motive: 'client_user_ids must be an array of positive integers' });
    }

    connection = await MysqlClient.getConnection();
    await connection.beginTransaction();

    const [exists] = await connection.execute('SELECT id, client_id FROM services WHERE id = ? LIMIT 1', [id]);
    if (exists.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, motive: 'Service not found' });
    }

    const targetClientId = client_id ?? exists[0].client_id;
    if (client_id) {
      const [client] = await connection.execute('SELECT id FROM clients WHERE id = ? LIMIT 1', [client_id]);
      if (client.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, motive: 'Client not found' });
      }
    }
    if (safeClientUserIds !== undefined
      && !await validateClientUsers(connection, targetClientId, safeClientUserIds)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        motive: 'Every assigned portal user must be active and belong to the service client',
      });
    }

    const fieldsToUpdate = [], params = [];
    if (client_id !== undefined) { fieldsToUpdate.push('client_id = ?'); params.push(client_id); }
    if (start_date !== undefined) { fieldsToUpdate.push('start_date = ?'); params.push(sanitizeDateField(start_date)); }
    if (end_date !== undefined) { fieldsToUpdate.push('end_date = ?'); params.push(sanitizeDateField(end_date)); }
    if (name !== undefined) { fieldsToUpdate.push('name = ?'); params.push(name); }

    if (fieldsToUpdate.length === 0 && safeClientUserIds === undefined) {
      await connection.rollback();
      return res.status(400).json({ success: false, motive: 'No fields to update' });
    }

    if (fieldsToUpdate.length > 0) {
      params.push(id);
      await connection.execute(`UPDATE services SET ${fieldsToUpdate.join(', ')} WHERE id = ?`, params);
    }

    if (safeClientUserIds !== undefined) {
      await replaceServiceClientUsers(connection, id, safeClientUserIds);
    } else if (client_id !== undefined && Number(client_id) !== Number(exists[0].client_id)) {
      // Never retain access for users belonging to the previous client.
      await replaceServiceClientUsers(connection, id, []);
    }

    await connection.commit();
    return res.status(200).json({ success: true, motive: 'Service updated' });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error('Error updating service:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  } finally {
    connection?.release();
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

    const [workInstructions] = await MysqlClient.execute(
      'SELECT COUNT(*) AS total FROM work_instructions WHERE service_id = ?',
      [id]
    );
    if (workInstructions[0].total > 0) {
      return res.status(409).json({
        success: false,
        motive: `No se puede eliminar este servicio porque tiene ${workInstructions[0].total} instrucción(es) de trabajo asociada(s). Primero elimina las incidencias, luego los detalles de inspección, los reportes y finalmente las instrucciones de trabajo.`,
      });
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
