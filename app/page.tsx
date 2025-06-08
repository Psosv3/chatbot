import Chat from './components/Chat';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Mon Chatbot</h1>
        <Chat />
      </div>
    </main>
  );
} 