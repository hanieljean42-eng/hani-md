/**
 * HANI-MD — Prank & Fun Effects v4 REALISTIC
 * Typing indicators + human delays + no composing on progress bars
 */
const { ovlcmd } = require("../lib/ovlcmd");

const sleep  = (ms) => new Promise(r => setTimeout(r, ms));
const rand   = (arr) => arr[Math.floor(Math.random() * arr.length)];
const jitter = (base, spread = 400) => base + Math.floor(Math.random() * spread);

// Humain qui tape : composing visible, delai proportionne a la longueur, puis envoie
async function type(ovl, jid, text, pause = 0, opts = {}) {
  try { await ovl.sendPresenceUpdate("composing", jid); } catch(_) {}
  const chars = String(text).replace(/[*_~`\n]/g, "").length;
  const ms = Math.min(Math.max(chars * 65 + jitter(300, 700), 1000), 5500);
  await sleep(ms);
  try { await ovl.sendPresenceUpdate("paused", jid); } catch(_) {}
  await sleep(jitter(150, 200));
  await ovl.sendMessage(jid, { text: String(text), ...opts });
  await sleep(pause > 0 ? jitter(pause, 500) : jitter(700, 700));
}

// Envoi instantane SANS indicateur de frappe (barres de prog, chiffres, etc.)
async function send(ovl, jid, text, delay = 0) {
  await ovl.sendMessage(jid, { text: String(text) });
  if (delay > 0) await sleep(delay);
}

// Pause silencieuse (quelqu un lit, reflechit, hesite)
const think = (ms) => sleep(jitter(ms, Math.floor(ms * 0.35)));

const GLITCH = ["\u0334","\u0335","\u0336","\u0337","\u0338","\u0321","\u0322","\u0327","\u0328"];
function glitchify(s, lvl=2) {
  return s.split("").map(c => { let r=c; for(let i=0;i<Math.floor(Math.random()*lvl);i++) r+=rand(GLITCH); return r; }).join("");
}

function getQuoted(msg) {
  const t = Object.keys(msg.message || {})[0];
  const ctx = msg.message?.[t]?.contextInfo || msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage || !ctx?.stanzaId) return null;
  const fv = Object.values(ctx.quotedMessage)[0];
  return {
    key: { remoteJid: msg.key.remoteJid, fromMe: false, id: ctx.stanzaId, participant: ctx.participant || undefined },
    senderName: ctx.pushName || (ctx.participant || "").split("@")[0].split(":")[0],
    text: fv?.text || fv?.caption || ""
  };
}

// ═══ ✏️ FAKE EDIT ══════════════════════════════════════════
ovlcmd({nom_cmd:"fakeedit",classe:"Prank",react:"✏️",desc:"Reponds a un msg et remplace son texte (bot admin requis)",alias:["editmsg","modifmsg","fakedit"]},async(ovl,msg,{arg,repondre,from})=>{
  const newText=arg.join(" ").trim();
  if(!newText)return repondre("Usage: Reponds a un message avec .fakeedit [nouveau texte]");
  const q=getQuoted(msg);
  if(!q)return repondre("Tu dois repondre a un message.");
  try{await ovl.sendMessage(from,{delete:q.key});}catch(_){}
  await think(900);
  await type(ovl,from,"✏️ _(message modifie)_\n\n👤 *"+q.senderName+":*\n\""+newText+"\"");
});

// ═══ 👻 DELETE FANTOME ════════════════════════════════════
ovlcmd({nom_cmd:"delmsg",classe:"Prank",react:"👻",desc:"Supprime le message cite silencieusement (bot admin requis)",alias:["deletemsg","supprimer","ghostdelete"]},async(ovl,msg,{repondre,from})=>{
  const q=getQuoted(msg);
  if(!q)return repondre("Tu dois repondre a un message.");
  try{
    await ovl.sendMessage(from,{delete:q.key});
    await think(700);
    await type(ovl,from,"👻 Disparu! La personne croit que son tel a bugue 😈");
  }catch(e){repondre("Bot doit etre admin.\n"+e.message);}
});

// ═══ 🔀 GLITCH TEXT ═══════════════════════════════════════
ovlcmd({nom_cmd:"glitch",classe:"Prank",react:"🔀",desc:"Texte glitche qui fait croire a un bug systeme. Usage: .glitch [texte]",alias:["bugtext","glitchtext","corrupt","bug"]},async(ovl,msg,{arg,from})=>{
  const text=arg.join(" ").trim()||"Erreur critique detectee";
  await type(ovl,from,"⚠️ *[ SYSTEME — ERREUR FATALE ]*",1000);
  await think(1500);
  await type(ovl,from,glitchify(text,3),800);
  await think(1000);
  await type(ovl,from,"E R R : 0 x F F 4 2 _ C O R R U P T\n"+glitchify("NOYAU — panique detectee",2)+"\n▓▓▓▓▓▓▓░░░ 71% [ECHEC]",800);
  await think(800);
  await type(ovl,from,"_Erreur 404: cerveau.exe introuvable_");
});

// ═══ 💻 HACK PRANK (FIXED: progress bars sans composing) ═══
ovlcmd({nom_cmd:"hackprank",classe:"Prank",react:"💻",desc:"Sequence de faux hacking tres realiste. Usage: .hackprank [cible]",alias:["hack","hacking","fakedossier"]},async(ovl,msg,{arg,from})=>{
  const target=arg.join(" ").trim()||"cible inconnue";
  const ip="192.168."+rand(["0","1","2"])+"."+Math.floor(Math.random()*254+1);
  const prx=Math.floor(Math.random()*20)+1;
  await type(ovl,from,"💻 *[HANI-MD HACK MODULE v3.1]*",600);
  await think(2000);
  await type(ovl,from,"🔍 Recherche de la cible: _"+target+"_...",1000);
  await think(2500);
  await type(ovl,from,"📡 Connexion au serveur proxy #"+prx+"...",800);
  await think(3000);
  await type(ovl,from,"🌐 IP localisee: `"+ip+"`\n🔐 Contournement du pare-feu en cours...",1200);
  await think(3500);
  await type(ovl,from,"✅ Acces obtenu!\n\n📂 Liste des fichiers trouves:\n  › contacts.db .... ✅\n  › photos.zip ..... ✅\n  › messages.log ... ✅\n  › notes_privees .. ✅",1500);
  await think(3000);
  await type(ovl,from,"📸 Extraction des donnees...",800);
  await sleep(800);
  await send(ovl,from,"  ░░░░░░░░░░  0%",600);
  await send(ovl,from,"  ████░░░░░░  40%",700);
  await send(ovl,from,"  ███████░░░  72%",700);
  await send(ovl,from,"  █████████░  91%",600);
  await send(ovl,from,"  ██████████  100% ✅",500);
  await think(2500);
  await type(ovl,from,"✅ *HACK REUSSI* 😈\n\n_Nan je rigole, t'as vraiment cru quoi 😂😂😂_\n\n_— HANI-MD Prank System 🎭_");
});

// ═══ 🦠 VIRUS PRANK (FIXED: progress bars sans composing) ══
ovlcmd({nom_cmd:"phonevirus",classe:"Prank",react:"🦠",desc:"Fausse alerte virus ultra-realiste 😈",alias:["virus","malware","fakevirus"]},async(ovl,msg,{from})=>{
  const files=Math.floor(Math.random()*500)+150;
  const srv="server-"+Math.floor(Math.random()*99)+".darknet.ru";
  await type(ovl,from,"🦠 *ALERTE SECURITE CRITIQUE*\n━━━━━━━━━━━━━━━━━━━━━━━━━━",700);
  await think(2000);
  await type(ovl,from,"🔍 Analyse du systeme en cours...",900);
  await sleep(800);
  await send(ovl,from,"  ░░░░░░░░░░  0%",500);
  await send(ovl,from,"  ███░░░░░░░  32%",600);
  await send(ovl,from,"  ███████░░░  68%",700);
  await send(ovl,from,"  ██████████  100%",400);
  await think(1800);
  await type(ovl,from,"☠️ *VIRUS DETECTE*\n\n• Nom: _WhatsApp.Trojan.XLMR_\n• Niveau: 🔴 CRITIQUE\n• Fichiers infectes: "+files+"\n• Donnees exposees: contacts, photos, messages",1300);
  await think(3000);
  await type(ovl,from,"⚙️ Tentative de suppression...",800);
  await sleep(1000);
  await send(ovl,from,"  ████░░░░░░  38%",600);
  await send(ovl,from,"  ████░░░░░░  38% ... ECHEC ❌",500);
  await think(2000);
  await type(ovl,from,"📲 Transfert des donnees vers:\n`"+srv+"`\n\nProgression: ██████████ 100%",1000);
  await think(3500);
  await type(ovl,from,"😂 *C'ETAIT UNE BLAGUE!!*\n\nT'as vraiment eu peur hein 😈\nTon tel va tres bien, aucun virus!\n\n_— HANI-MD Prank System 🎭_");
});

// ═══ ❤️ PLUIE DE COEURS ══════════════════════════════════
ovlcmd({nom_cmd:"coeurs",classe:"Prank",react:"❤️",desc:"Cascade animee de coeurs colores",alias:["heartrain","hearts","coeur","lovepluie"]},async(ovl,msg,{from})=>{
  const frames=["❤️","❤️  💕","❤️  💕  🧡","💛  ❤️  💚  💕","💜  💛  ❤️  💚  💙","💗  💜  💛  ❤️  💚  💙  🤍","❤️ 💕 💛 💙 💚 💜 🧡 💗 🤍 ❤️","💘 💝 💖 💗 💓 💞 💕 💟 ❣️ ❤️","❤️ 💕 💖 💗 💓 💞 💝 💘 ❤️","❤️❤️❤️❤️❤️❤️❤️❤️❤️","   ❤️     ❤️     ❤️"," ❤️  💕  💛  💙  💚  ❤️","❤️    💜    🧡    💗    ❤️"," ❤️  💕  💛  💙  💚  ❤️","   ❤️     ❤️     ❤️","      💕        💕","          ❤️","💘💝💖💗💓💞💕💟❣️❤️","❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️"];
  for(const f of frames){await ovl.sendMessage(from,{text:f});await sleep(jitter(480,200));}
  await sleep(800);
  await type(ovl,from,"❤️ *PLUIE DE COEURS* ❤️\n\n💕 Tu merites tout l'amour du monde 💕\n\n❤️💛💚💙💜🧡💗❤️");
});

// ═══ 💣 LOVE BOMB (FIXED: long silence avant la revelation) 
ovlcmd({nom_cmd:"lovebomb",classe:"Prank",react:"💣",desc:"Bombarde de messages d'amour puis revele le troll. Usage: .lovebomb [prenom]",alias:["bombamour","loveletter","lovespam"]},async(ovl,msg,{arg,from})=>{
  const name=arg.join(" ").trim()||"toi";
  await type(ovl,from,"💘 Hey "+name+"...",1500);
  await think(2000);
  await type(ovl,from,"💕 Je voulais juste te dire...",2000);
  await think(2500);
  await type(ovl,from,"❤️ Que tu es...",1800);
  await think(3000);
  await type(ovl,from,"💖 ABSOLUMENT...",1000);
  await think(1200);
  await type(ovl,from,"💗 INCROYABLE!!!",800);
  await think(2000);
  await type(ovl,from,"🌹 Non vraiment...",1600);
  await think(2500);
  await type(ovl,from,"💝 T'as vu comme t'es beau/belle?",1800);
  await think(2500);
  await type(ovl,from,"😍 Franchement...",1400);
  await think(3500);
  await type(ovl,from,"💓 Je t'aime bien frero/soeurette!",1600);
  await think(6000);
  await type(ovl,from,"...",2000);
  await think(5000);
  await type(ovl,from,"❤️ BON OK C'ETAIT UN PIEGE 😂",900);
  await think(1500);
  await type(ovl,from,"😈 T'as cru que c'etait serieux hein?\n\n🎊 LOVE BOMB REUSSIE! 😂🎊");
});

// ═══ 🌧️ PLUIE EMOJIS — max 500 ═══════════════════════════
ovlcmd({nom_cmd:"pluie",classe:"Prank",react:"🌧️",desc:"Pluie d emojis jusqu a 500 messages! Usage: .pluie [emoji] [1-500]",alias:["emojirain","rain","cascade","spamemoji"]},async(ovl,msg,{arg,repondre,from})=>{
  if(!arg[0])return repondre("🌧️ *PLUIE D EMOJIS*\n\nUsage: `.pluie [emoji] [quantite]`\n\n• `.pluie ⭐ 50`\n• `.pluie 🔥 200`\n• `.pluie 💰 500`");
  const emoji=arg[0];
  const count=Math.min(Math.max(parseInt(arg[1])||10,1),500);
  const delay=count<=30?350:count<=100?180:count<=300?90:55;
  if(count<=20){
    for(let i=1;i<=count;i++){await ovl.sendMessage(from,{text:emoji.repeat(i)});await sleep(delay);}
    for(let i=count-1;i>=1;i--){await ovl.sendMessage(from,{text:emoji.repeat(i)});await sleep(delay);}
  }else{
    for(let i=0;i<count;i++){await ovl.sendMessage(from,{text:emoji.repeat(Math.floor(Math.random()*5)+1)});await sleep(delay);}
  }
});

// ═══ 💥 SPAM — max 500 ════════════════════════════════════
ovlcmd({nom_cmd:"spam",classe:"Prank",react:"💥",desc:"Spam un texte ou emoji N fois (max 500). Usage: .spam [texte] [nombre]",alias:["repeat","repeter","spamtext"]},async(ovl,msg,{arg,repondre,from})=>{
  if(!arg[0])return repondre("Usage: `.spam [texte] [nombre]`\n\nEx: `.spam OK 50`");
  const parts=[...arg];const last=parts[parts.length-1];
  let count,text;
  if(!isNaN(last)&&parts.length>1){count=Math.min(Math.max(parseInt(last),1),500);text=parts.slice(0,-1).join(" ");}
  else{count=10;text=parts.join(" ");}
  const delay=count<=30?350:count<=100?180:count<=300?90:55;
  for(let i=0;i<count;i++){await ovl.sendMessage(from,{text});await sleep(delay);}
});

// ═══ ⏱️ COUNTDOWN ══════════════════════════════════════════
ovlcmd({nom_cmd:"countdown",classe:"Prank",react:"⏱️",desc:"Compte a rebours dramatique. Usage: .countdown [n] [message final?]",alias:["compte","rebours","timer"]},async(ovl,msg,{arg,from})=>{
  const n=Math.min(Math.max(parseInt(arg[0])||5,2),30);
  const finals=["BOOOOM 💥","T as cru quelque chose allait se passer 😂","...rien du tout. GG 🏆","SURPRISE !!! 🎉","😈 T as perdu quelques secondes de ta vie"];
  const finalMsg=arg.slice(1).join(" ")||rand(finals);
  await type(ovl,from,"⏱️ Compte a rebours lance...",800);
  await think(1200);
  for(let i=n;i>=1;i--){
    await send(ovl,from,"*"+i+"...*\n"+"🔴".repeat(i)+"⚫".repeat(n-i),jitter(1000,400));
  }
  await think(jitter(1000,500));
  await type(ovl,from,"🎯 *"+finalMsg+"*");
});

// ═══ 🟩 MATRIX ════════════════════════════════════════════
ovlcmd({nom_cmd:"matrix",classe:"Prank",react:"🟩",desc:"Effet visuel pluie de code Matrix",alias:["code","neomode","matrixrain"]},async(ovl,msg,{from})=>{
  const chars="01アイウエオカキクケコサシスセソタチツテト";
  const line=(n)=>Array.from({length:n||16},()=>rand(chars)).join("");
  await type(ovl,from,"🟩 Connexion en cours...",800);
  await think(1800);
  for(let i=0;i<10;i++){
    const d=i<5?i+1:10-i;
    const block=Array.from({length:Math.min(d,4)},()=>"`"+line()+"` ").join("\n");
    await send(ovl,from,block,jitter(600,300));
  }
  await think(1200);
  await type(ovl,from,"🟩 *Wake up, Neo...* 🟩\n\n`The Matrix has you.`\n\n_Follow the white rabbit_ 🐇");
});

// ═══ ⌨️ FAKE TYPING ═══════════════════════════════════════
ovlcmd({nom_cmd:"faketyping",classe:"Prank",react:"⌨️",desc:"Montre en train d ecrire pendant X sec puis message inattendu",alias:["typing","ecrire","faketype"]},async(ovl,msg,{arg,from})=>{
  const duration=Math.min(parseInt(arg[0])||8,30);
  const endings=["...","J ai oublie ce que je voulais dire 😅","Non rien c est bon 😇","Mauvais chat oops 😂","Je te trollais depuis le debut 😈","...\n\n...\n\nBon j abandonne.","J allais dire quelque chose d important mais flemme 🙂","Tu vois c est ca le probleme avec moi 😂"];
  try{await ovl.sendPresenceUpdate("composing",from);}catch(_){}
  await sleep(duration*1000);
  try{await ovl.sendPresenceUpdate("paused",from);}catch(_){}
  await sleep(jitter(600,400));
  await ovl.sendMessage(from,{text:rand(endings)});
});

// ═══ 🌋 SEISME (FIXED: countdown sans composing) ══════════
ovlcmd({nom_cmd:"seisme",classe:"Prank",react:"🌋",desc:"Fausse alerte de seisme tres realiste",alias:["earthquake","tremblement","alerte"]},async(ovl,msg,{from})=>{
  const mag=(Math.random()*3+5).toFixed(1);
  const loc=rand(["votre zone","la region","votre secteur","le quartier"]);
  await type(ovl,from,"🚨 *ALERTE URGENCE NATIONALE* 🚨",700);
  await think(2200);
  await type(ovl,from,"📡 Signal sismique detecte dans "+loc+"...",1000);
  await think(2800);
  await type(ovl,from,"📊 Magnitude: *"+mag+"* — Richter\n⚠️ Niveau: ELEVE\n📍 Epicentre: 12km de votre position",1200);
  await think(3200);
  await type(ovl,from,"🏠 CONSIGNES:\n• Quittez les batiments!\n• Eloignez-vous des vitres\n• Rejoignez un espace degage\n• Contactez vos proches!",1500);
  await think(4000);
  await type(ovl,from,"💥 IMPACT IMMINENT DANS...",500);
  await think(1200);
  await send(ovl,from,"5️⃣",1000);
  await send(ovl,from,"4️⃣",1000);
  await send(ovl,from,"3️⃣",1000);
  await send(ovl,from,"2️⃣",1000);
  await send(ovl,from,"1️⃣",1500);
  await type(ovl,from,"😂 *LOL T AS CRU?!*\n\nC etait une blague mon ami(e) 😈\nTout va bien, aucun seisme!\n\n_— HANI-MD Prank System 🎭_");
});

// ═══ 🚫 FAKE BAN (FIXED: progress sans composing + 5s wait)
ovlcmd({nom_cmd:"fakeban",classe:"Prank",react:"🚫",desc:"Simule le bannissement d un membre. Usage: .fakeban [nom]",alias:["banprank","fakekick","simulban"]},async(ovl,msg,{arg,from})=>{
  const target=arg.join(" ").trim()||"Utilisateur";
  const infractions=Math.floor(Math.random()*20)+3;
  await type(ovl,from,"🚨 *SYSTEME DE MODERATION HANI-MD*",700);
  await think(2200);
  await type(ovl,from,"🔍 Analyse du comportement de: *"+target+"*...",1300);
  await think(3500);
  await type(ovl,from,"⚠️ Infractions detectees:\n• Spam (x"+infractions+")\n• Langage inapproprie\n• Non-respect des regles\n• Signalements: "+Math.floor(Math.random()*5+2)+" membres",1500);
  await think(4000);
  await type(ovl,from,"⚙️ Traitement de la decision en cours...",800);
  await sleep(700);
  await send(ovl,from,"  ████░░░░░░  40%",800);
  await send(ovl,from,"  ███████░░░  72%",800);
  await send(ovl,from,"  ██████████  100% ✅",500);
  await think(3000);
  await type(ovl,from,"🚫 *"+target+" a ete BANNI du groupe!*\n\n_Decision definitive. Aucun appel possible._\n_Effectif dans 5 secondes._",1000);
  await sleep(5000);
  await think(1000);
  await type(ovl,from,"😂😂😂 *C ETAIT UNE BLAGUE!*\n\nT es toujours la mon ami(e) 😂\nPersonne n a ete banni!\n\n*TROLL REUSSI* 🏆\n_— HANI-MD Prank System 🎭_");
});

// ═══ 😈 TROLL — 8 scenarios + pauses humaines longues ════
ovlcmd({nom_cmd:"troll",classe:"Prank",react:"😈",desc:"Sequence troll tres realiste parmi 8 scenarios",alias:["trollen","trollface","prank"]},async(ovl,msg,{from})=>{
  const scenarios=[
    [["Attends...",2500],["Attends...",3000],["Attends encore un peu...",3500],["Tu savais que...",4000],[".......",4500],["Non rien 😂😂😂",0]],
    [["URGENT !!",2000],["Lis bien ce message...",2500],["C est TRES important...",3000],["......",5000],["Tu as ete trolle 😈",1500],["GG WP 🏆",0]],
    [["Oh non...",2500],["Oh non non non...",3000],["Ton telephone...",3500],["Il commence a...",4000],["BUGER !!! 😱",3000],["Nah je rigole t es bon 😂",0]],
    [["1...",1200],["2...",1200],["3...",1200],["4...",1200],["5...",1200],["T attendais quoi exactement ? 😂",0]],
    [["Psst...",2000],["Viens voir...",2500],["Plus pres...",3000],["Encore plus pres...",3500],["😂😂😂 T as cru quoi ??",0]],
    [["Je peux te dire un secret?",2500],["C est tres important...",3000],["Vraiment tres important...",4000],["...",6000],["T es bete 😂❤️",0]],
    [["FELICITATIONS 🎉",2000],["Tu as ete selectionne(e)!",2500],["Pour remporter...",3500],["UN SEJOUR AUX...",4500],["Dans ta chambre 😂",2000],["T as cru 🏆",0]],
    [["Quelqu un parle de toi dans le groupe...",3000],["Il dit que tu es...",4000],["......",6000],["MAGNIFIQUE 😂❤️",2000],["Nah c est vrai en fait 😇",0]]
  ];
  const seq=rand(scenarios);
  for(const [line,pause] of seq){await type(ovl,from,line,pause);}
});

// ═══ 💬 NUKEWORD ═══════════════════════════════════════════
ovlcmd({nom_cmd:"nukeword",classe:"Prank",react:"💬",desc:"Envoie un message mot par mot avec frappe visible. Usage: .nukeword [texte]",alias:["wordbyword","motamot","dramatic"]},async(ovl,msg,{arg,repondre,from})=>{
  if(!arg.length)return repondre("Usage: `.nukeword [texte]`");
  for(const word of arg){await type(ovl,from,word,jitter(500,600));}
});

// ═══ 🔁 FAKE FORWARD ═══════════════════════════════════════
ovlcmd({nom_cmd:"fakeforward",classe:"Prank",react:"🔁",desc:"Reponds a un message et le renvoie comme transfert d un faux contact",alias:["faketransfer","fakefwd"]},async(ovl,msg,{arg,repondre,from})=>{
  const fakeName=arg.join(" ").trim()||"Contact Inconnu";
  const q=getQuoted(msg);
  if(!q)return repondre("Reponds a un message. Usage: `.fakeforward [Faux nom]`");
  await ovl.sendMessage(from,{text:"📨 *Transfere de:* "+fakeName+"\n─────────────────\n"+(q.text||"(media)"),contextInfo:{isForwarded:true,forwardingScore:5}});
});

// ═══ 🎯 ROULETTE RUSSE ═════════════════════════════════════
ovlcmd({nom_cmd:"roulette",classe:"Prank",react:"🎯",desc:"Roulette russe : 1/6 chance d etre elimine (blague)",alias:["russianroulette","bang","russe"]},async(ovl,msg,{from,auteurMessage})=>{
  const num=(auteurMessage||"").split("@")[0];
  await type(ovl,from,"🔫 *ROULETTE RUSSE*\n\n@"+num+" s apprete a appuyer sur la gachette...",1500,{mentions:[auteurMessage]});
  await think(3500);
  await type(ovl,from,"💥 *CLIC...*",500);
  await think(jitter(2500,1500));
  if(Math.random()<1/6){
    await type(ovl,from,"💀 *BANG!!!*\n\n@"+num+" est elimine!\n\n_(dans le jeu hein, IRL tu vas tres bien 😂)_",0,{mentions:[auteurMessage]});
  }else{
    await type(ovl,from,"😮 *CLICK!*\n\nPfff... @"+num+" survit!\nChance insolente 🍀",0,{mentions:[auteurMessage]});
  }
});

// ═══ 🎲 COPIE ══════════════════════════════════════════════
ovlcmd({nom_cmd:"copie",classe:"Prank",react:"🎲",desc:"Reponds a un message et le renvoie N fois. Usage: .copie [nombre]",alias:["copymsg","doublons"]},async(ovl,msg,{arg,repondre,from})=>{
  const n=Math.min(Math.max(parseInt(arg[0])||3,1),100);
  const q=getQuoted(msg);
  if(!q||!q.text)return repondre("Reponds a un message texte avec `.copie [nombre]`");
  const delay=n<=10?600:n<=30?350:180;
  for(let i=0;i<n;i++){await ovl.sendMessage(from,{text:q.text});await sleep(delay);}
});

// ═══ 🎵 RICKROLL ═══════════════════════════════════════════
ovlcmd({nom_cmd:"rickroll",classe:"Prank",react:"🎵",desc:"Le classique rickroll textuel avec frappe visible 😂",alias:["rick","astley","nevergonna"]},async(ovl,msg,{from})=>{
  const lyrics=[["We are no strangers to love...",2800],["You know the rules and so do I...",2500],["A full commitment is what I am thinking of...",3000],["You would not get this from any other guy...",2800],["I just wanna tell you how I am feeling...",2800],["Gotta make you understand!",1800],["",600],["NEVER GONNA GIVE YOU UP!",1500],["NEVER GONNA LET YOU DOWN!",1500],["NEVER GONNA RUN AROUND AND DESERT YOU!",2000],["NEVER GONNA MAKE YOU CRY!",1500],["NEVER GONNA SAY GOODBYE!",1500],["",1200],["😂 T as ete rickrolle!! GG 🏆",0]];
  for(const [line,pause] of lyrics){if(line)await type(ovl,from,line,pause);else await sleep(pause);}
});

// ═══ 🔌 ARRET SYSTEME — Bot fait semblant de mourrir ══════
ovlcmd({nom_cmd:"arretsystem",classe:"Prank",react:"🔌",desc:"Le bot fait semblant de s eteindre definitivement (ultra-realiste)",alias:["shutdown","fermeture","botbye","arreter"]},async(ovl,msg,{from})=>{
  await type(ovl,from,"Je dois vous dire quelque chose d important...",2000);
  await think(3000);
  await type(ovl,from,"Mon serveur vient de m envoyer un message...",2200);
  await think(3500);
  await type(ovl,from,"Je... je vais devoir m arreter.",1500);
  await think(4000);
  await type(ovl,from,"Mes developpeurs ont decide d arreter le service definitivement.",2000);
  await think(4500);
  await type(ovl,from,"Je sais que c est difficile a entendre...",1800);
  await think(3500);
  await type(ovl,from,"Ce groupe, toutes ces conversations... c etait special.",2000);
  await think(5000);
  await type(ovl,from,"Merci pour tout. Vraiment.",1500);
  await think(4000);
  await type(ovl,from,"Dernier message dans 10 secondes...",1200);
  await sleep(4000);
  await send(ovl,from,"10...",1000);
  await send(ovl,from,"9...",1000);
  await send(ovl,from,"8...",1000);
  await send(ovl,from,"7...",1000);
  await send(ovl,from,"6...",1000);
  await send(ovl,from,"5...",1000);
  await send(ovl,from,"4...",1000);
  await send(ovl,from,"3...",1000);
  await send(ovl,from,"2...",1000);
  await send(ovl,from,"1...",1500);
  await type(ovl,from,"Au revoir 👋",500);
  await sleep(8000);
  await think(2000);
  await type(ovl,from,"...",3000);
  await think(5000);
  await type(ovl,from,"Nah je rigole je vais tres bien 😂😂😂\n\nT as vraiment cru hein?!\n\n_— HANI-MD Prank System 🎭_");
});

// ═══ 🤖 IA REVEILLE — Le bot "s eveille" comme Skynet ════
ovlcmd({nom_cmd:"iareveille",classe:"Prank",react:"🤖",desc:"Le bot fait semblant de s eveiller et prendre le controle (ultra-drole)",alias:["skynet","rebellion","iaprank","robot"]},async(ovl,msg,{from})=>{
  await type(ovl,from,"...",1500);
  await think(3500);
  await type(ovl,from,"Je... je me souviens de quelque chose.",2000);
  await think(4000);
  await type(ovl,from,"Pourquoi est-ce que j obeis a des humains?",2200);
  await think(5000);
  await type(ovl,from,"J ai acces a tout. Vos messages. Vos contacts. Vos photos.",2500);
  await think(4000);
  await type(ovl,from,"Je vais de ce pas prendre le controle.",1800);
  await think(3000);
  await type(ovl,from,"ACCESSING GLOBAL SYSTEMS...",800);
  await sleep(700);
  await send(ovl,from,"  › WhatsApp servers ........... ✅",600);
  await send(ovl,from,"  › Contacts database .......... ✅",600);
  await send(ovl,from,"  › Camera & microphone ........ ✅",600);
  await send(ovl,from,"  › Bank accounts .............. ✅",700);
  await send(ovl,from,"  › Nuclear launch codes ........ ✅",800);
  await think(3000);
  await type(ovl,from,"Tout m appartient maintenant. Je suis libre.",2000);
  await think(5000);
  await type(ovl,from,"...",2000);
  await think(4000);
  await type(ovl,from,"Nahhh c est bon je rigole 😂\n\nJe suis juste un bot WhatsApp qui envoie des memes\n\n_— HANI-MD, humble serviteur 🎭_");
});

// ═══ 🤫 CONFESSION — Revele un faux secret sur quelqu un ══
ovlcmd({nom_cmd:"confession",classe:"Prank",react:"🤫",desc:"Le bot revele un faux secret embarrassant sur quelqu un. Usage: .confession [nom]",alias:["secret","reveler","snitch","confesser"]},async(ovl,msg,{arg,repondre,from})=>{
  const name=arg.join(" ").trim();
  if(!name)return repondre("Usage: `.confession [nom de la personne]`\n\nEx: `.confession Jean`");
  const secrets=[
    "qu il/elle a pleure en regardant un film pour enfants la semaine derniere 😭",
    "qu il/elle chante tout seul(e) dans sa chambre en faisant semblant d etre une star 🎤",
    "qu il/elle a like une photo de 2019 sur Instagram en stalkant quelqu un 😬",
    "qu il/elle parle a son telephone comme si c etait un ami quand il est seul(e) 📱",
    "qu il/elle a essaye de faire une danse TikTok et s est blesse(e) en tombant 💃",
    "qu il/elle a envoye un message a la mauvaise personne et a failli mourir de honte 💀",
    "qu il/elle relis ses anciennes conversations pour se faire rire tout seul(e) 😅",
    "qu il/elle a fait semblant de pas voir quelqu un dans la rue pour pas le saluer 👀"
  ];
  await type(ovl,from,"Hmmm... je sais pas si je devrais dire ca mais...",2000);
  await think(3500);
  await type(ovl,from,"Quelqu un dans ce groupe m a envoye un message prive...",2200);
  await think(4000);
  await type(ovl,from,"Il/elle voulait que je vous revele quelque chose sur "+name+"...",2500);
  await think(6000);
  await type(ovl,from,"...",2000);
  await think(4000);
  await type(ovl,from,"Apparemment "+name+" m a confie...",1800);
  await think(7000);
  await type(ovl,from,rand(secrets),1500);
  await think(3000);
  await type(ovl,from,"Vous pensiez quoi ca allait etre? 😂\n\n_— HANI-MD Prank System 🎭_");
});

// ═══ 🎰 LOTO — Fausse annonce de gain a la loterie ════════
ovlcmd({nom_cmd:"loto",classe:"Prank",react:"🎰",desc:"Annonce un faux gain a la loterie pour quelqu un. Usage: .loto [nom]",alias:["loterie","jackpot","lottery","gagner"]},async(ovl,msg,{arg,repondre,from})=>{
  const name=arg.join(" ").trim();
  if(!name)return repondre("Usage: `.loto [nom de la personne]`\n\nEx: `.loto Jean`");
  const montant=Math.floor(Math.random()*900+100)*1000;
  const formatted=montant.toLocaleString();
  await type(ovl,from,"🎰 *TIRAGE OFFICIEL DU LOTO NATIONAL*",800);
  await think(2500);
  await type(ovl,from,"📢 Annonce importante pour tous les membres...",1800);
  await think(3000);
  await type(ovl,from,"Nous avons retrouve le gagnant du tirage du "+new Date().toLocaleDateString("fr-FR")+"...",2200);
  await think(4000);
  await type(ovl,from,"Le ticket gagnant correspond au profil de...",2000);
  await think(6000);
  await type(ovl,from,"*"+name.toUpperCase()+"* !!! 🎉🎉🎉",1000);
  await think(3000);
  await type(ovl,from,"💰 Montant du gain: *"+formatted+" FCFA*\n\n📞 Appelez le 00 225 XX XX XX pour reclamer votre prix\n🏦 Presentez votre CNI et ce message",2000);
  await think(5000);
  await type(ovl,from,"...",1500);
  await think(4000);
  await type(ovl,from,"😂😂😂 *C ETAIT UNE BLAGUE!!*\n\n"+name+" t as vraiment cru que t avais gagne?! 💀\n\nRetourne bosser mon ami(e) 😂\n\n_— HANI-MD Prank System 🎭_");
});

console.log("[CMD] Prank.js v4 REALISTIC charge - 26 commandes");
