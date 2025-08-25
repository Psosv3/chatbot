// app/api/messenger/test/route.ts
import { NextRequest, NextResponse } from "next/server";

const PAGE_TOKEN = process.env.MESSENGER_PAGE_TOKEN!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const psid = searchParams.get("psid");
  const message = searchParams.get("message") || "Test message";

  if (!psid) {
    return NextResponse.json({ error: "PSID requis" }, { status: 400 });
  }

  if (!PAGE_TOKEN) {
    return NextResponse.json({ error: "PAGE_TOKEN manquant" }, { status: 500 });
  }

  try {
    console.log("🧪 Test d'envoi de message à PSID:", psid);
    
    // Test 1: Envoyer une action "typing_on"
    console.log("1️⃣ Test de l'action typing_on...");
    const typingResponse = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        recipient: { id: psid }, 
        sender_action: "typing_on" 
      }),
    });
    
    const typingData = await typingResponse.text();
    console.log("Typing response:", typingResponse.status, typingData);
    
    // Attendre 2 secondes
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Envoyer un message
    console.log("2️⃣ Test d'envoi de message...");
    const messageResponse = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: psid },
        message: { text: message },
        messaging_type: "RESPONSE",
      }),
    });
    
    const messageData = await messageResponse.text();
    console.log("Message response:", messageResponse.status, messageData);
    
    // Test 3: Désactiver typing
    console.log("3️⃣ Test de l'action typing_off...");
    const typingOffResponse = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        recipient: { id: psid }, 
        sender_action: "typing_off" 
      }),
    });
    
    const typingOffData = await typingOffResponse.text();
    console.log("Typing off response:", typingOffResponse.status, typingOffData);

    return NextResponse.json({
      success: true,
      results: {
        typing_on: { status: typingResponse.status, data: typingData },
        message: { status: messageResponse.status, data: messageData },
        typing_off: { status: typingOffResponse.status, data: typingOffData }
      }
    });

  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
    return NextResponse.json({ 
      error: "Erreur lors du test", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
