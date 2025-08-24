// app/api/messenger/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN!;
const APP_SECRET = process.env.MESSENGER_APP_SECRET!;
const PAGE_TOKEN = process.env.MESSENGER_PAGE_TOKEN!;
const PUBLIC_ASK_URL = process.env.NEXT_PUBLIC_API_URL + "/ask_public/"; // même cible que ton code

// --- Vérification Webhook (GET) ---
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// --- Utilitaires Messenger ---
async function sendSenderAction(psid: string, action: "typing_on" | "typing_off" | "mark_seen") {
  await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: psid }, sender_action: action }),
  });
}

async function sendText(psid: string, text: string) {
  // (Facultatif) tronquer si trop long
  const safe = text?.slice(0, 1900) || "Désolé, je n'ai pas compris.";
  await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text: safe },
      messaging_type: "RESPONSE", // respecte la fenêtre 24h
    }),
  });
}

// --- Vérif signature HMAC de Meta ---
function verifySignature(req: NextRequest, rawBody: string) {
  const sig = req.headers.get("x-hub-signature-256") || "";
  const expected = "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(rawBody, "utf8").digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

// --- Ton call vers l’API publique /ask_public/ (ton code) ---
async function askBot(params: {
  question: string;
  company_id?: string;
  session_id?: string;
  external_user_id?: string; // on mettra le PSID ici
}) {
  const res = await fetch(PUBLIC_ASK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: params.question,
      company_id: params.company_id || "d6738c8d-7e4d-4406-a298-8a640620879c",
      session_id: params.session_id,
      external_user_id: params.external_user_id,
      langue: "Français",
    }),
    // ton http.Agent n'est pas nécessaire ici (Next est en HTTPS). Garde-le si ton infra l’exige.
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Backend error ${res.status}: ${JSON.stringify(data)}`);
  }
  // on suppose que ta réponse Python renvoie { answer: "...", ... }
  return (data?.answer as string) || "Désolé, je n'ai pas de réponse pour le moment.";
}

// --- Réception des events (POST) ---
export async function POST(req: NextRequest) {
  const rawBody = await req.text(); 

  // 1) Vérifier la signature Meta
  if (!verifySignature(req, rawBody)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const body = JSON.parse(rawBody);

  if (body.object !== "page") {
    return new NextResponse("Not Found", { status: 404 });
  }

  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const psid = event.sender?.id as string | undefined;

      // Message texte utilisateur
      const userText: string | undefined = event.message?.text;

      // Postback bouton (ex: "GET_STARTED")
      const postbackPayload: string | undefined = event.postback?.payload;

      if (!psid) continue;

      // Marquer vu + typing
      await sendSenderAction(psid, "mark_seen");

      // Si c'est un postback, on peut le transformer en "question" aussi
      const incoming = userText || postbackPayload;
      if (!incoming) {
        await sendText(psid, "Je suis là ! Posez-moi votre question 🙂");
        continue;
      }

      try {
        await sendSenderAction(psid, "typing_on");

        // 2) APPEL DE TON API : on passe le PSID dans external_user_id pour tracabilité
        const answer = await askBot({
          question: incoming,
          company_id: undefined, // ou mappage par Page si multi-tenant
          session_id: undefined, // ou un UUID basé sur le thread
          external_user_id: psid,
        });

        // 3) RÉPONDRE DANS MESSENGER avec la réponse de ton API
        await sendText(psid, answer);
      } catch (e: unknown) {
        const message = typeof e === "object" && e !== null && "message" in e
          ? (e as { message: string }).message
          : String(e);
        console.error("Messenger handler error:", message);
        await sendText(psid, "Oups, un souci côté serveur. Réessayez dans un instant svp.");
      } finally {
        await sendSenderAction(psid, "typing_off");
      }
    }
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
