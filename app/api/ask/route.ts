import { NextRequest, NextResponse } from 'next/server';
// import http from 'http';

export async function POST(req: NextRequest) {
  try {
    const { question, company_id, session_id, external_user_id, langue } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Question manquante' }, { status: 400 });
    }

    // Préparer les données au format JSON pour l'API publique
    const requestBody = {
      question: question,
      company_id: company_id || 'd6738c8d-7e4d-4406-a298-8a640620879c',
      session_id: session_id,
      external_user_id: external_user_id,
      langue: langue || 'français'
    };

    // Appeler le backend Python en streaming
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ask_public/`, {
    // const response = await fetch('http://localhost:8000/ask_public/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('requestBody.langue', requestBody.langue);
    
    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json({
        error: 'Erreur du backend',
        status: response.status,
        statusText: response.statusText,
        details: errorData
      }, { status: response.status });
    }

    // Créer un stream pour proxy les événements SSE
    const stream = new ReadableStream({
      start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader!.read();
              
              if (done) {
                controller.close();
                break;
              }

              // Décoder et transmettre les chunks
              const chunk = decoder.decode(value, { stream: true });
              controller.enqueue(new TextEncoder().encode(chunk));
            }
          } catch (error) {
            console.error('Erreur lors du streaming:', error);
            controller.error(error);
          }
        };

        pump();
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 