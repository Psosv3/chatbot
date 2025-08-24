// Script de test pour l'API /ask
const testAskAPI = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: 'Bonjour, comment allez-vous ?',
        company_id: 'd6738c8d-7e4d-4406-a298-8a640620879c',
        external_user_id: 'test-user-123',
        langue: 'Français'
      }),
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Réponse:', data);
  } catch (error) {
    console.error('Erreur:', error);
  }
};

// Exécuter le test
testAskAPI();
