// app/api/messenger/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sessionService } from "../../../lib/sessionService";

const PUBLIC_ASK_URL = `${process.env.NEXT_PUBLIC_API_URL}/ask_public/`;

// Fonction pour extraire les tokens des paramètres URL
function getTokensFromUrl(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const verify_token = searchParams.get("verify_token");
  const app_secret = searchParams.get("app_secret");
  const page_token = searchParams.get("page_token");
  
  console.log("🔧 Configuration webhook (depuis paramètres URL):");
  console.log("✅ VERIFY_TOKEN:", verify_token ? "✓ Configuré" : "❌ Manquant");
  console.log("✅ APP_SECRET:", app_secret ? "✓ Configuré" : "❌ Manquant");
  console.log("✅ PAGE_TOKEN:", page_token ? "✓ Configuré" : "❌ Manquant");
  console.log("✅ PUBLIC_ASK_URL:", PUBLIC_ASK_URL ? "✓ Configuré" : "❌ Manquant");
  
  return { verify_token, app_secret, page_token };
}

// Cache pour éviter les doublons (en production, utilisez Redis)
const processedMessages = new Map<string, number>();
const userRateLimit = new Map<string, number>();

// Nettoyage du cache toutes les 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of processedMessages.entries()) {
    if (now - timestamp > 300000) { // 5 minutes
      processedMessages.delete(key);
    }
  }
  for (const [key, timestamp] of userRateLimit.entries()) {
    if (now - timestamp > 60000) { // 1 minute
      userRateLimit.delete(key);
    }
  }
}, 300000);

// --- Vérification Webhook (GET) ---
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Extraire les tokens depuis les paramètres URL
  const { verify_token } = getTokensFromUrl(req);
  
  if (!verify_token) {
    console.error("❌ verify_token manquant dans les paramètres URL");
    return new NextResponse("Missing verify_token parameter", { status: 400 });
  }

  if (mode === "subscribe" && token === verify_token) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// --- Utilitaires Messenger ---
async function sendSenderAction(psid: string, action: "typing_on" | "typing_off" | "mark_seen", pageToken: string) {
  try {
    console.log(`📤 Envoi de l'action ${action} pour PSID: ${psid}`);
    
    const response = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${pageToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: psid }, sender_action: action }),
    });
    
    const responseData = await response.text();
    console.log(`📤 Réponse de l'API Facebook pour ${action}:`, response.status, responseData);
    
    if (!response.ok) {
      throw new Error(`Facebook API error ${response.status}: ${responseData}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi de l'action ${action}:`, error);
    return false;
  }
}

async function sendText(psid: string, text: string, pageToken: string) {
  try {
    console.log(`📤 Envoi du message pour PSID: ${psid}:`, text.substring(0, 100) + "...");
    
    const safe = text?.slice(0, 1900) || "Désolé, je n'ai pas compris.";
    const response = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${pageToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: psid },
        message: { text: safe },
        messaging_type: "RESPONSE",
      }),
    });
    
    const responseData = await response.text();
    console.log(`📤 Réponse de l'API Facebook pour le message:`, response.status, responseData);
    
    if (!response.ok) {
      throw new Error(`Facebook API error ${response.status}: ${responseData}`);
    }
    
    return true;
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi du message:", error);
    return false;
  }
}

// --- Vérif signature HMAC de Meta ---
function verifySignature(req: NextRequest, rawBody: string, appSecret: string) {
  const sig = req.headers.get("x-hub-signature-256") || "";
  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

// --- Rate limiting par utilisateur ---
function isRateLimited(psid: string): boolean {
  const now = Date.now();
  const lastCall = userRateLimit.get(psid);
  
  if (lastCall && now - lastCall < 2000) { // 2 secondes entre appels
    return true;
  }
  
  userRateLimit.set(psid, now);
  return false;
}

// --- Vérification des doublons ---
function isDuplicateMessage(psid: string, messageId: string): boolean {
  const key = `${psid}:${messageId}`;
  const now = Date.now();
  
  if (processedMessages.has(key)) {
    return true;
  }
  
  processedMessages.set(key, now);
  return false;
}

// --- Appel vers l'API publique ---
async function askBot(params: {
  question: string;
  company_id?: string;
  session_id?: string;
  external_user_id?: string;
  langue?: string;
}) {
  // Détecter automatiquement la langue de la question
  const detectedLanguage = sessionService.detectLanguage(params.question);
  console.log(`🌍 Langue détectée pour "${params.question}": ${detectedLanguage}`);
  
  try {
    const res = await fetch(PUBLIC_ASK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: params.question,
        company_id: "b28cfe88-807b-49de-97f7-fd974cfd0d17",
        session_id: "xxx",
        external_user_id: params.external_user_id,
        langue: detectedLanguage
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Backend error ${res.status}: ${JSON.stringify(data)}`);
    }

   
    console.log("🤖 Appel de askBot avec:", params);
    console.log("🤖 Langue utilisée:", detectedLanguage);
    console.log("🤖 Réponse de l'API:", data);
    
    return (data?.answer as string) || "Désolé, je n'ai pas de réponse pour le moment.";
  } catch (error) {
    console.log("🤖 Appel de askBot avec:", params);
    console.error("❌ Erreur lors de l'appel à l'API:", error);
    
    // Fallback local pour les erreurs Mistral AI
    if (error instanceof Error && error.message.includes("429")) {
      return "Je suis temporairement surchargé. Voici une réponse de base : Je suis votre assistant virtuel. Comment puis-je vous aider aujourd'hui ? 🤖";
    }
    
    throw error;
  }
}

// --- Réception des events (POST) ---
export async function POST(req: NextRequest) {
  console.log("🔔 Webhook POST reçu");
  const rawBody = await req.text(); 
  console.log("📝 Body reçu:", rawBody.substring(0, 200) + "...");

  // Extraire les tokens depuis les paramètres URL
  const { app_secret, page_token } = getTokensFromUrl(req);
  
  if (!app_secret || !page_token) {
    console.error("❌ app_secret ou page_token manquant dans les paramètres URL");
    return new NextResponse("Missing required parameters (app_secret, page_token)", { status: 400 });
  }

  // 1) Vérifier la signature Meta
  if (!verifySignature(req, rawBody, app_secret)) {
    console.error("❌ Signature invalide");
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const body = JSON.parse(rawBody);

  if (body.object !== "page") {
    return new NextResponse("Not Found", { status: 404 });
  }

  console.log("📋 Entrées reçues:", body.entry?.length || 0);
  
  for (const entry of body.entry ?? []) {
    console.log("📨 Page ID:", entry.id);
    
    for (const event of entry.messaging ?? []) {
      const psid = event.sender?.id as string | undefined;
      const messageId = event.message?.mid || event.postback?.mid;
      
      console.log("👤 PSID:", psid);
      console.log("🆔 Message ID:", messageId);

      // Ignorer les événements sans PSID
      if (!psid) continue;

      // Vérifier le rate limiting
      if (isRateLimited(psid)) {
        console.log("⚠️ Rate limit atteint pour PSID:", psid);
        continue;
      }

      // Vérifier les doublons (seulement pour les messages texte)
      if (messageId && isDuplicateMessage(psid, messageId)) {
        console.log("🔄 Message en double détecté, ignoré");
        continue;
      }

      // Message texte utilisateur
      const userText: string | undefined = event.message?.text;
      console.log("💬 Message texte:", userText);

      // Postback bouton
      const postbackPayload: string | undefined = event.postback?.payload;
      console.log("🔘 Postback:", postbackPayload);

      // Marquer vu
      console.log("👁️ Tentative de marquage 'vu'...");
      const markSeenResult = await sendSenderAction(psid, "mark_seen", page_token);
      if (!markSeenResult) {
        console.error("❌ Échec du marquage 'vu' pour PSID:", psid);
      } else {
        console.log("✅ Marquage 'vu' réussi pour PSID:", psid);
      }

      // Traiter seulement les messages texte et postbacks significatifs
      const incoming = userText || (postbackPayload && postbackPayload !== "GET_STARTED" ? postbackPayload : null);
      
      if (!incoming) {
        // Réponse par défaut pour les postbacks GET_STARTED
        if (postbackPayload === "GET_STARTED") {
          console.log("🚀 Envoi du message de bienvenue GET_STARTED");
          const welcomeMessage = "Bonjour ! Je suis votre assistant virtuel. Posez-moi votre question et je ferai de mon mieux pour vous aider. 🤖";
          const welcomeResult = await sendText(psid, welcomeMessage, page_token);
          if (!welcomeResult) {
            console.error("❌ Échec de l'envoi du message de bienvenue");
          }
        }
        continue;
      }

      try {
        console.log("⌨️ Activation de l'indicateur de frappe...");
        const typingResult = await sendSenderAction(psid, "typing_on", page_token);
        if (!typingResult) {
          console.error("❌ Échec de l'activation de l'indicateur de frappe");
        }

        // Appel de l'API avec délai pour éviter la surcharge
        console.log("⏳ Attente de 1 seconde avant l'appel API...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log("🤖 Appel de l'API askBot...");
        const answer = await askBot({
          question: incoming,
          company_id: undefined,
          session_id: undefined,
          external_user_id: psid
        });

        console.log("📤 Envoi de la réponse à l'utilisateur...");
        const sendResult = await sendText(psid, answer, page_token);
        if (!sendResult) {
          console.error("❌ Échec de l'envoi de la réponse");
        } else {
          console.log("✅ Réponse envoyée avec succès");
        }
      } catch (e: unknown) {
        const message = typeof e === "object" && e !== null && "message" in e
          ? (e as { message: string }).message
          : String(e);
        console.error("Messenger handler error:", message);
        
        // Gestion spécifique des erreurs
        let errorMessage = "Désolé, une erreur inattendue s'est produite. Réessayez plus tard. 😔";
        
        if (message.includes("429") || message.includes("capacity exceeded")) {
          errorMessage = "Désolé, je suis temporairement surchargé. Réessayez dans quelques minutes. 🤖";
        } else if (message.includes("Backend error 500")) {
          errorMessage = "Oups, un souci côté serveur. Réessayez dans un instant svp. 🔧";
        }
        
        console.log("📤 Envoi du message d'erreur...");
        const errorResult = await sendText(psid, errorMessage, page_token);
        if (!errorResult) {
          console.error("❌ Échec de l'envoi du message d'erreur");
        }
      } finally {
        console.log("⌨️ Désactivation de l'indicateur de frappe...");
        const typingOffResult = await sendSenderAction(psid, "typing_off", page_token);
        if (!typingOffResult) {
          console.error("❌ Échec de la désactivation de l'indicateur de frappe");
        }
      }
    }
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
