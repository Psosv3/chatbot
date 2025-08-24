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
        company_id: 'b28cfe88-807b-49de-97f7-fd974cfd0d17',
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
