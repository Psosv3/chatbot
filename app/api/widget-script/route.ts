import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  
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
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999999;
  \`;

  // Créer l'iframe
  const iframe = document.createElement('iframe');
  iframe.src = '${origin}/widget';
  iframe.style.cssText = \`
    border: none;
    width: 100%;
    height: 100%;
    background: transparent;
    pointer-events: auto;
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