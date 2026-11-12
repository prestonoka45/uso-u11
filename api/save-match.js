// api/save-match.js
// API Vercel Serverless Function
// Reçoit les données du match depuis l'app iPhone et les stocke dans Vercel Postgres

import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Autoriser les requêtes depuis l'app (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Répondre aux requêtes preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utiliser POST.' });
  }

  try {
    const { matchDate, matchDuration, players } = req.body;

    if (!players || !Array.isArray(players)) {
      return res.status(400).json({ error: 'Données de joueurs invalides.' });
    }

    // 1. Créer les tables si elles n'existent pas encore
    await sql`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        match_date DATE NOT NULL,
        duration_seconds INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS player_stats (
        id SERIAL PRIMARY KEY,
        match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
        player_name VARCHAR(100) NOT NULL,
        time_played INTEGER NOT NULL,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        was_on_pitch BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 2. Insérer le match
    const matchResult = await sql`
      INSERT INTO matches (match_date, duration_seconds)
      VALUES (${matchDate}, ${matchDuration})
      RETURNING id;
    `;

    const matchId = matchResult.rows[0].id;

    // 3. Insérer les stats de chaque joueur
    for (const player of players) {
      await sql`
        INSERT INTO player_stats (match_id, player_name, time_played, goals, assists, was_on_pitch)
        VALUES (
          ${matchId},
          ${player.name},
          ${player.timePlayed},
          ${player.goals},
          ${player.assists},
          ${player.isOnPitch}
        );
      `;
    }

    return res.status(200).json({
      success: true,
      matchId,
      message: `Match du ${matchDate} sauvegardé ! ${players.length} joueurs enregistrés.`
    });

  } catch (error) {
    console.error('Erreur sauvegarde match:', error);
    return res.status(500).json({
      error: 'Erreur serveur lors de la sauvegarde.',
      details: error.message
    });
  }
}
