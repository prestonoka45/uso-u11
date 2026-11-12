// api/get-history.js
// Récupère l'historique de tous les matchs depuis la base de données

import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  try {
    const matches = await sql`
      SELECT 
        m.id,
        m.match_date,
        m.duration_seconds,
        m.created_at,
        COUNT(ps.id) as player_count,
        SUM(ps.goals) as total_goals,
        SUM(ps.assists) as total_assists
      FROM matches m
      LEFT JOIN player_stats ps ON ps.match_id = m.id
      GROUP BY m.id, m.match_date, m.duration_seconds, m.created_at
      ORDER BY m.match_date DESC
      LIMIT 20;
    `;

    return res.status(200).json({ matches: matches.rows });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
