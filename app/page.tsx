import ChatWidget from './components/ChatWidget';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-red-500">Mon Chatbot</h1>
        <ChatWidget />
      </div>
    </main>
  );
} 