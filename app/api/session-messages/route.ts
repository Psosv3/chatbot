import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';
import http from 'http';
import https from 'https';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    // const companyId = searchParams.get('company_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id manquant' }, { status: 400 });
    }

    // Déterminer l'URL du backend (enlever le @ au début si présent)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/^@/, '') || 'http://localhost:8000';
    const backendUrl = `${apiUrl}/messages_public/${sessionId}`;
    
    // Créer l'agent approprié selon le protocole
    const isHttps = backendUrl.startsWith('https://');
    const agent = isHttps 
      ? new https.Agent({ keepAlive: true, rejectUnauthorized: false })
      : new http.Agent({ keepAlive: true });

    // Appeler le backend Python pour récupérer les messages
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      agent: agent,
    });

    if (!response.ok) {
      return NextResponse.json({
        error: 'Erreur du backend',
        status: response.status,
        statusText: response.statusText
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Convertir le format backend vers le format frontend
    const messages = (data as Array<{ content: string; role: string; created_at: string }>).map((msg) => ({
      text: msg.content,
      isUser: msg.role === 'user',
      timestamp: msg.created_at
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
