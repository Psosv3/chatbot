import ChatWidget from '../components/ChatWidget';

export default function EmbedPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Intégrez votre ChatWidget partout
        </h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Méthode Script */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-blue-600">
              📜 Méthode Script (Recommandé)
            </h2>
            <p className="text-gray-600 mb-4">
              Ajoutez simplement ce code avant la fermeture de votre balise <code>&lt;/body&gt;</code>
            </p>
            <div className="bg-gray-100 rounded p-4 overflow-x-auto">
              <code className="text-sm">
                {`<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://votre-domaine.com'}/api/widget-script"></script>`}
              </code>
            </div>
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-green-700 text-sm">
                ✅ <strong>Avantages :</strong> Automatique, responsive, facile à maintenir
              </p>
            </div>
          </div>

          {/* Méthode iFrame */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-orange-600">
              🖼️ Méthode iFrame
            </h2>
            <p className="text-gray-600 mb-4">
              Intégrez directement avec un iframe
            </p>
            <div className="bg-gray-100 rounded p-4 overflow-x-auto">
              <code className="text-sm">
                {`<iframe
  src="${typeof window !== 'undefined' ? window.location.origin : 'https://votre-domaine.com'}/widget"
  style="position:fixed;bottom:0;right:0;width:100%;height:100%;border:none;pointer-events:none;z-index:999999;"
  allow="clipboard-write">
</iframe>`}
              </code>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-700 text-sm">
                ⚠️ <strong>Note :</strong> Moins flexible que la méthode script
              </p>
            </div>
          </div>
        </div>

        {/* Exemple d'usage */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-purple-600">
            🚀 Exemple complet
          </h2>
          <div className="bg-gray-100 rounded p-4 overflow-x-auto">
            <pre className="text-sm"><code>{`<!DOCTYPE html>
<html>
<head>
    <title>Mon Site Web</title>
</head>
<body>
    <h1>Bienvenue sur mon site</h1>
    <p>Contenu de votre site...</p>
    
    <!-- Votre ChatWidget -->
    <script src="${typeof window !== 'undefined' ? window.location.origin : 'https://votre-domaine.com'}/api/widget-script"></script>
</body>
</html>`}</code></pre>
          </div>
        </div>

        {/* Configuration */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-3 text-blue-800">
            ⚙️ Configuration personnalisée (Prochainement)
          </h3>
          <p className="text-blue-700">
                         Bientôt, vous pourrez personnaliser les couleurs, position, messages d&apos;accueil, etc. 
             via des paramètres dans l&apos;URL du script.
          </p>
        </div>

        {/* Testez maintenant */}
        <div className="mt-8 text-center">
          <p className="text-lg text-gray-600 mb-4">
            Le widget est déjà actif sur cette page ! Regardez en bas à droite 👀
          </p>
          <a 
            href="/widget" 
            target="_blank"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voir le widget seul
          </a>
        </div>
      </div>
      
      {/* Widget intégré pour la démonstration */}
      <ChatWidget />
    </div>
  );
} 