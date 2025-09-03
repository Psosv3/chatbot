import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const companyId = searchParams.get('company_id') || 'default-company-id'; // fallback
  
  const widgetScript = `
(function() {
  // Éviter les multiples chargements
  if (window.ChatWidgetLoaded) return;
  window.ChatWidgetLoaded = true;

  // Créer le conteneur du widget
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'onexus-chatwidget-container';
  widgetContainer.style.cssText = \`
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    height: 600px;
    z-index: 999999;
    pointer-events: auto;
  \`;

  // Créer l'iframe
  const iframe = document.createElement('iframe');
  iframe.src = '${origin}/widget?company_id=${companyId}';
  iframe.style.cssText = \`
    border: none;
    width: 100%;
    height: 100%;
    background: transparent;
    border-radius: 12px;
    // box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  \`;
  iframe.setAttribute('allow', 'clipboard-write');

  widgetContainer.appendChild(iframe);
  document.body.appendChild(widgetContainer);

  // Permettre la communication avec l'iframe si nécessaire
  window.addEventListener('message', function(event) {
    if (event.origin !== '${origin}') return;
    // Ici vous pouvez ajouter une logique de communication
  });

  console.log('Onexus ChatWidget chargé avec succès');
})();
`;

  return new NextResponse(widgetScript, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
} 