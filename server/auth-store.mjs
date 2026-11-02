export async function createMysqlStore(env) {
  const { default: mysql } = await import('mysql2/promise');
  const pool = mysql.createPool({
    host: env.MYSQL_HOST || 'jingfa-mysql', port: Number(env.MYSQL_PORT || 3306),
    user: env.MYSQL_USER, password: env.MYSQL_PASSWORD, database: env.MYSQL_DATABASE || 'jingfa_smartfit',
    connectionLimit: 4, charset: 'utf8mb4', timezone: 'Z', dateStrings: false, enableKeepAlive: true,
  });
  const workspaceSlug = env.WORKSPACE_SLUG || 'jingfa-smartfit';
  const userFields = 'u.id,u.public_id,u.username,u.display_name,u.role_code,u.status,u.password_hash';
  return {
    async ping() { await pool.query('SELECT 1'); },
    async findUser(username) {
      const [rows] = await pool.execute(`SELECT ${userFields} FROM app_users u JOIN workspaces w ON w.id=u.workspace_id WHERE w.slug=? AND w.status='active' AND u.username=? LIMIT 1`, [workspaceSlug, username]);
      return rows[0] || null;
    },
    async attempt(key, limit) {
      await pool.execute(`INSERT INTO auth_rate_limits (bucket_key,attempts,expires_at) VALUES (?,1,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 15 MINUTE)) ON DUPLICATE KEY UPDATE attempts=IF(expires_at<=UTC_TIMESTAMP(3),1,attempts+1),expires_at=IF(expires_at<=UTC_TIMESTAMP(3),DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 15 MINUTE),expires_at)`, [key]);
      const [rows] = await pool.execute('SELECT attempts FROM auth_rate_limits WHERE bucket_key=?', [key]);
      return rows[0].attempts <= limit;
    },
    async resetAttempt(key) { await pool.execute('DELETE FROM auth_rate_limits WHERE bucket_key=?', [key]); },
    async createSession(tokenHash, userId, expiresAt) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute('INSERT INTO auth_sessions (token_hash,user_id,expires_at) VALUES (?,?,?)', [tokenHash,userId,expiresAt]);
        await conn.execute('UPDATE app_users SET last_login_at=UTC_TIMESTAMP(3) WHERE id=?', [userId]);
        await conn.commit();
      } catch(e) { await conn.rollback(); throw e; } finally { conn.release(); }
    },
    async session(tokenHash) {
      const [rows] = await pool.execute(`SELECT ${userFields},s.expires_at FROM auth_sessions s JOIN app_users u ON u.id=s.user_id JOIN workspaces w ON w.id=u.workspace_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP(3) AND u.status='active' AND w.status='active' AND w.slug=? LIMIT 1`,[tokenHash,workspaceSlug]);
      return rows[0] || null;
    },
    async logout(tokenHash) { await pool.execute('DELETE FROM auth_sessions WHERE token_hash=?',[tokenHash]); },
    async changePassword(userId, previousHash, newHash) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [result] = await conn.execute('UPDATE app_users SET password_hash=? WHERE id=? AND password_hash=? AND status=\'active\'',[newHash,userId,previousHash]);
        if (!result.affectedRows) { await conn.rollback(); return false; }
        await conn.execute('DELETE FROM auth_sessions WHERE user_id=?',[userId]);
        await conn.commit();
        return true;
      } catch(e) { await conn.rollback(); throw e; } finally { conn.release(); }
    },
    async cleanup() {
      await pool.query('DELETE FROM auth_sessions WHERE expires_at<=UTC_TIMESTAMP(3)');
      await pool.query('DELETE FROM auth_rate_limits WHERE expires_at<=UTC_TIMESTAMP(3)');
    },
    async close() { await pool.end(); },
  };
}
