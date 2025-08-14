import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';
import http from 'http';
import https from 'https';

export async function POST(req: NextRequest) {
  try {
    const { question, company_id, session_id, external_user_id } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Question manquante' }, { status: 400 });
    }

    // Préparer les données au format JSON pour l'API publique
    const requestBody = {
      question: question,
      company_id: company_id || 'd6738c8d-7e4d-4406-a298-8a640620879c',
      session_id: session_id,
      external_user_id: external_user_id,
      langue: 'Français'
    };

    // Déterminer l'URL du backend (enlever le @ au début si présent)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/^@/, '') || 'http://localhost:8000';
    const backendUrl = `${apiUrl}/ask_public/`;
    
    // Créer l'agent approprié selon le protocole
    const isHttps = backendUrl.startsWith('https://');
    const agent = isHttps 
      ? new https.Agent({ keepAlive: true, rejectUnauthorized: false }) // rejectUnauthorized: false pour les certificats auto-signés si nécessaire
      : new http.Agent({ keepAlive: true });

    // Appeler le backend Python
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      agent: agent,
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({
        error: 'Erreur du backend',
        status: response.status,
        statusText: response.statusText,
        details: data
      }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 