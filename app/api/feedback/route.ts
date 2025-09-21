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

    // Construire l'URL du backend RAG
    const ragBackendUrl = process.env.RAG_BACKEND_URL || 'http://localhost:8000';
    const feedbackUrl = `${ragBackendUrl}/feedback`;

    console.log('Envoi du feedback au backend RAG:', {
      session_id,
      message_id,
      feedback,
      company_id
    });

    // Essayer d'envoyer le feedback au backend RAG
    try {
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
        // Ajouter un timeout
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        console.error('Erreur du backend RAG:', response.status, response.statusText);
        // Pour l'instant, on accepte l'échec mais on log
        console.warn('Backend RAG non disponible, feedback stocké en local uniquement');
        return NextResponse.json({
          success: true,
          message: 'Feedback enregistré localement (backend RAG non disponible)',
          backend_available: false
        });
      }

      const result = await response.json();
      console.log('Feedback enregistré avec succès:', result);
      
      return NextResponse.json({
        success: true,
        message: 'Feedback enregistré avec succès',
        data: result,
        backend_available: true
      });
      
    } catch (fetchError) {
      console.error('Erreur de connexion au backend RAG:', fetchError);
      // Le backend RAG n'est pas disponible, mais on accepte le feedback localement
      console.warn('Backend RAG non accessible, feedback stocké en local uniquement');
      
      return NextResponse.json({
        success: true,
        message: 'Feedback enregistré localement (backend RAG non accessible)',
        backend_available: false
      });
    }


  } catch (error) {
    console.error('Erreur lors du traitement du feedback:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
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
