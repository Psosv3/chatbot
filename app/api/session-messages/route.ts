import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';
import http from 'http';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    // const companyId = searchParams.get('company_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id manquant' }, { status: 400 });
    }

    // Créer un agent HTTP pour les requêtes non-sécurisées
    const httpAgent = new http.Agent({
      keepAlive: true,
    });

    // Appeler le backend Python pour récupérer les messages
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages_public/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      agent: httpAgent,
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
