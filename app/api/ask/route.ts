import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';
import https from 'https';

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!question || !apiKey) {
      return NextResponse.json({ error: 'question ou clé API manquante' }, { status: 400 });
    }

    // Préparer les données au format x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('question', question);
    formData.append('company_id', 'd6738c8d-7e4d-4406-a298-8a640620879c');
    formData.append('langue', 'Français');
    // formData.append('openai_api_key', apiKey);

    // Créer un agent HTTPS pour ignorer les erreurs de certificat
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // ✅ ignore les erreurs de certificat
    });

    // Appeler le backend Python
    const response = await fetch('http://api-rag.onexus.tech:8000/ask_public/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      agent: httpsAgent,
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