import { NextRequest, NextResponse } from 'next/server';

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
    formData.append('openai_api_key', apiKey);

    // Appeler le backend Python
    const response = await fetch('https://api-rag.onexus.tech:8443/ask/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 