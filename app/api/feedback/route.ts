import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, message_id, feedback, company_id } = body;
    // Validation des paramètres
    if (!session_id || !message_id || !feedback || !company_id) {
      return NextResponse.json(
        { error: 'Paramètres manquants: session_id, message_id, feedback et company_id sont requis' },
        { status: 400 }
      );
    }

    if (!['like', 'dislike'].includes(feedback)) {
      return NextResponse.json(
        { error: 'Le feedback doit être "like" ou "dislike"' },
        { status: 400 }
      );
    }

    console.log('Envoi du feedback au backend RAG:', {
      session_id,
      message_id,
      feedback,
      company_id
    });

    // Appeler le backend RAG comme pour /ask
    const ragBackendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const feedbackUrl = `${ragBackendUrl}/feedback/`;

    const response = await fetch(feedbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id,
        message_id,
        feedback,
        company_id
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erreur du backend RAG:', response.status, response.statusText, errorData);
      return NextResponse.json({
        error: 'Erreur du backend RAG',
        status: response.status,
        statusText: response.statusText,
        details: errorData
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('Feedback enregistré avec succès:', result);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Erreur lors du traitement du feedback:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
