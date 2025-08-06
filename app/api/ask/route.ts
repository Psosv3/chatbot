import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';
import http from 'http';

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Question manquante' }, { status: 400 });
    }

    // Préparer les données au format JSON pour l'API publique
    const requestBody = {
      question: question,
      company_id: 'd6738c8d-7e4d-4406-a298-8a640620879c',
      langue: 'Français'
    };

    // Créer un agent HTTP pour les requêtes non-sécurisées
    const httpAgent = new http.Agent({
      keepAlive: true,
    });

    // Appeler le backend Python
    const response = await fetch('http://api-rag.onexus.tech:8000/ask_public/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      agent: httpAgent,
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