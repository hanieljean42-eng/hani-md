/**
 * HANI-MD — Prank & Fun Effects v3 REALISTIC
 * Typing indicators + human delays + dramatic pauses
 */
const { ovlcmd } = require("../lib/ovlcmd");

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rand  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const jitter = (base, spread = 400) => base + Math.floor(Math.random() * spread);

// Simule un humain qui tape : show composing, attendre, envoyer
async function type(ovl, jid, text, pause = 0, opts = {}) {
  try { await ovl.sendPresenceUpdate("composing", jid); } catch(_) {}
  const chars = String(text).replace(/[*_~`\n]/g, "").length;
  const ms    = Math.min(Math.max(chars * 60 + jitter(200, 600), 900), 5000);
  await sleep(ms);
  try { await ovl.sendPresenceUpdate("paused", jid); } catch(_) {}
  await sleep(jitter(120, 180));
  await ovl.sendMessage(jid, { text: String(text), ...opts });
  const after = pause > 0 ? jitter(pause, 500) : jitter(600, 600);
  await sleep(after);
}

// Pause silencieuse (personne qui lit/reflechit)
const think = (ms) => sleep(jitter(ms, Math.floor(ms * 0.3)));

const GLITCH = ["\u0334","\u0335","\u0336","\u0337","\u0338","\u0321","\u0322","\u0327","\u0328","\u035c","\u035d"];
function glitchify(s, lvl=2){return s.split("").map(c=>{let r=c;for(let i=0;i<Math.floor(Math.random()*lvl);i++)r+=rand(GLITCH);return r;}).join("");}

function getQuoted(msg){
  const t=Object.keys(msg.message||{})[0];
  const ctx=msg.message?.[t]?.contextInfo||msg.message?.extendedTextMessage?.contextInfo;
  if(!ctx?.quotedMessage||!ctx?.stanzaId)return null;
  const fv=Object.values(ctx.quotedMessage)[0];
  return{key:{remoteJid:msg.key.remoteJid,fromMe:false,id:ctx.stanzaId,participant:ctx.participant||undefined},senderName:ctx.pushName||(ctx.participant||"").split("@")[0].split(":")[0],text:fv?.text||fv?.caption||""};
}

// ═══ ✏️ FAKE EDIT ═══════════════════════════════════════════
ovlcmd({nom_cmd:"fakeedit",classe:"Prank",react:"✏️",desc:"Reponds a un msg + nouveau texte pour remplacer (bot admin requis)",alias:["editmsg","modifmsg","fakedit"]},async(ovl,msg,{arg,repondre,from})=>{
  const newText=arg.join(" ").trim();
  if(!newText)return repondre("Usage: Reponds a un message avec .fakeedit [nouveau texte]");
  const q=getQuoted(msg);
  if(!q)return repondre("Tu dois repondre a un message.");
  try{await ovl.sendMessage(from,{delete:q.key});}catch(_){}
  await think(800);
  await type(ovl,from,"✏️ (message modifié)\n\n👤 *"+q.senderName+":*\n\""+newText+"\"");
});

// ═══ 👻 DELETE FANTOME ═══════════════════════════════════════
ovlcmd({nom_cmd:"delmsg",classe:"Prank",react:"👻",desc:"Supprime le message cite (bot admin requis)",alias:["deletemsg","supprimer","ghostdelete"]},async(ovl,msg,{repondre,from})=>{
  const q=getQuoted(msg);
  if(!q)return repondre("Tu dois repondre a un message.");
  try{await ovl.sendMessage(from,{delete:q.key});await think(500);await type(ovl,from,"👻 Supprime! La personne croit que son tel a bugue 😈");}
  catch(e){repondre("Bot doit etre admin.\n"+e.message);}
});

// ═══ 🔀 GLITCH ═══════════════════════════════════════════════
ovlcmd({nom_cmd:"glitch",classe:"Prank",react:"🔀",desc:"Texte glitche qui fait croire a un bug. Usage: .glitch [texte]",alias:["bugtext","glitchtext","corrupt","bug"]},async(ovl,msg,{arg,from})=>{
  const text=arg.join(" ").trim()||"Erreur critique detectee";
  await type(ovl,from,"⚠️ *[ SYSTEME — ERREUR FATALE ]*");
  await think(1200);
  await type(ovl,from,glitchify(text,3));
  await think(800);
  await type(ovl,from,"E R R : 0 x F F 4 2 _ C O R R U P T\n"+glitchify("NOYAU — panique detectee",2)+"\n▓▓▓▓▓▓▓░░░ 71% [ECHEC]");
  await think(600);
  await type(ovl,from,"_Erreur 404: cerveau.exe introuvable_");
});

// ═══ 💻 HACK PRANK ═══════════════════════════════════════════
ovlcmd({nom_cmd:"hackprank",classe:"Prank",react:"💻",desc:"Sequence faux hacking realiste. Usage: .hackprank [cible]",alias:["hack","hacking","fakedossier"]},async(ovl,msg,{arg,from})=>{
  const target=arg.join(" ").trim()||"cible inconnue";
  const ip="192.168."+rand(["0","1","2"])+"."+Math.floor(Math.random()*254+1);
  const prx=Math.floor(Math.random()*20)+1;
  await type(ovl,from,"💻 *[HANI-MD HACK MODULE v3.1]*",500);
  await think(1500);
  await type(ovl,from,"🔍 Recherche de la cible: _"+target+"_...",800);
  await think(2000);
  await type(ovl,from,"📡 Connexion au serveur proxy #"+prx+"...",600);
  await think(2500);
  await type(ovl,from,"🌐 IP localisee: `"+ip+"`\n🔐 Contournement du pare-feu...",1000);
  await think(3000);
  await type(ovl,from,"✅ Acces obtenu!\n\n📂 Lecture des fichiers:\n  › contacts.db .... ✅\n  › photos.zip ..... ✅\n  › messages.log ... ✅\n  › notes_privees .. ✅",1500);
  await think(3500);
  await type(ovl,from,"📸 Extraction en cours...\n\n  ░░░░░░░░░░  0%",400);
  await sleep(700);
  await type(ovl,from,"  ████░░░░░░  40%",300);
  await sleep(600);
  await type(ovl,from,"  ████████░░  80%",300);
  await sleep(500);
  await type(ovl,from,"  ██████████  100% ✅",400);
  await think(2000);
  await type(ovl,from,"✅ *HACK REUSSI* 😈\n\n_Nah je rigole, t'as vraiment cru quoi 😂😂😂_\n\n_— HANI-MD Prank System 🎭_");
});

// ═══ 🦠 VIRUS PRANK ══════════════════════════════════════════
ovlcmd({nom_cmd:"phonevirus",classe:"Prank",react:"🦠",desc:"Fausse alerte virus realiste 😈",alias:["virus","malware","fakevirus"]},async(ovl,msg,{from})=>{
  const files=Math.floor(Math.random()*500)+100;
  const srv="server-"+Math.floor(Math.random()*99)+".darknet.ru";
  await type(ovl,from,"🦠 *ALERTE SECURITE CRITIQUE*\n━━━━━━━━━━━━━━━━━━━━━━━━━━",600);
  await think(1800);
  await type(ovl,from,"🔍 Analyse du systeme en cours...",800);
  await sleep(1200);
  await type(ovl,from,"  ░░░░░░░░░░  0%",200);
  await sleep(500); await type(ovl,from,"  ████░░░░░░  38%",200);
  await sleep(600); await type(ovl,from,"  ███████░░░  71%",200);
  await sleep(700); await type(ovl,from,"  ██████████  100%",300);
  await think(1500);
  await type(ovl,from,"☠️ *VIRUS DETECTE*\n\n• Nom: _WhatsApp.Trojan.XLMR_\n• Niveau: 🔴 CRITIQUE\n• Fichiers infectes: "+files+"\n• Donnees exposees: contacts, photos, messages, notes",1200);
  await think(2500);
  await type(ovl,from,"⚙️ Tentative de suppression automatique...",800);
  await sleep(1000);
  await type(ovl,from,"  ████░░░░░░  38% ... ECHEC ❌",300);
  await think(1800);
  await type(ovl,from,"📲 Transfert des donnees vers:\n`"+srv+"`\n\nProgression: ██████████ 100%",1000);
  await think(3000);
  await type(ovl,from,"😂 *C'ETAIT UNE BLAGUE!!*\n\nT'as vraiment eu peur hein 😈\nTon tel va tres bien, pas de virus!\n\n_— HANI-MD Prank System 🎭_");
});

// ═══ ❤️ PLUIE DE COEURS ════════════════════════════════════
ovlcmd({nom_cmd:"coeurs",classe:"Prank",react:"❤️",desc:"Cascade animee de coeurs colores",alias:["heartrain","hearts","coeur","lovepluie"]},async(ovl,msg,{from})=>{
  const frames=["❤️","❤️  💕","❤️  💕  🧡","💛  ❤️  💚  💕","💜  💛  ❤️  💚  💙","💗  💜  💛  ❤️  💚  💙  🤍","❤️ 💕 💛 💙 💚 💜 🧡 💗 🤍 ❤️","💘 💝 💖 💗 💓 💞 💕 💟 ❣️ ❤️","❤️ 💕 💖 💗 💓 💞 💝 💘 ❤️","❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️","   ❤️     ❤️     ❤️"," ❤️  💕  💛  💙  💚  ❤️","❤️    💜    🧡    💗    ❤️"," ❤️  💕  💛  💙  💚  ❤️","   ❤️     ❤️     ❤️","      💕        💕","          ❤️","💘💝💖💗💓💞💕💟❣️❤️","❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️"];
  for(const f of frames){await ovl.sendMessage(from,{text:f});await sleep(jitter(450,200));}
  await sleep(600);
  await type(ovl,from,"❤️ *PLUIE DE COEURS* ❤️\n\n💕 Tu merites tout l'amour du monde 💕\n\n❤️💛💚💙💜🧡💗❤️");
});

// ═══ 💣 LOVE BOMB ════════════════════════════════════════════
ovlcmd({nom_cmd:"lovebomb",classe:"Prank",react:"💣",desc:"Bombarde quelqu'un d'amour puis revele le troll. Usage: .lovebomb [prenom]",alias:["bombamour","loveletter","lovespam"]},async(ovl,msg,{arg,from})=>{
  const name=arg.join(" ").trim()||"toi";
  await type(ovl,from,"💘 Hey "+name+"...",1200);
  await think(1500);
  await type(ovl,from,"💕 Je voulais juste te dire...",1800);
  await think(2000);
  await type(ovl,from,"❤️ Que tu es...",1500);
  await think(2500);
  await type(ovl,from,"💖 ABSOLUMENT...",900);
  await think(1000);
  await type(ovl,from,"💗 INCROYABLE!!!",700);
  await think(1800);
  await type(ovl,from,"🌹 Non vraiment...",1400);
  await think(2200);
  await type(ovl,from,"💝 T'as vu comme t'es beau/belle?",1600);
  await think(2000);
  await type(ovl,from,"😍 Franchement...",1200);
  await think(3000);
  await type(ovl,from,"💓 Je t'aime bien frero/soeurette!",1500);
  await think(4000);
  await type(ovl,from,"❤️ BON OK C'ETAIT UN PIEGE 😂",800);
  await think(1200);
  await type(ovl,from,"😈 T'as cru que c'etait serieux hein?\n\n🎊 LOVE BOMB REUSSIE! AHAHAH 🎊");
});

// ═══ 🌧️ PLUIE EMOJIS — max 500 ══════════════════════════════
ovlcmd({nom_cmd:"pluie",classe:"Prank",react:"🌧️",desc:"Pluie d'emojis jusqu'a 500 messages! Usage: .pluie [emoji] [1-500]",alias:["emojirain","rain","cascade","spamemoji"]},async(ovl,msg,{arg,repondre,from})=>{
  if(!arg[0])return repondre("🌧️ *PLUIE D'EMOJIS*\n\nUsage: `.pluie [emoji] [quantite]`\n\n• `.pluie ⭐ 50`\n• `.pluie 🔥 200`\n• `.pluie 💰 500`\n• `.pluie 😂 100`");
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

// ═══ 💥 SPAM — max 500 ═══════════════════════════════════════
ovlcmd({nom_cmd:"spam",classe:"Prank",react:"💥",desc:"Spam un texte ou emoji N fois (max 500). Usage: .spam [texte] [nombre]",alias:["repeat","repeter","spamtext"]},async(ovl,msg,{arg,repondre,from})=>{
  if(!arg[0])return repondre("Usage: `.spam [texte] [nombre]`\n\nEx: `.spam OK 50` ou `.spam 🔥 300`");
  const parts=[...arg];const last=parts[parts.length-1];
  let count,text;
  if(!isNaN(last)&&parts.length>1){count=Math.min(Math.max(parseInt(last),1),500);text=parts.slice(0,-1).join(" ");}
  else{count=10;text=parts.join(" ");}
  const delay=count<=30?350:count<=100?180:count<=300?90:55;
  for(let i=0;i<count;i++){await ovl.sendMessage(from,{text});await sleep(delay);}
});

// ═══ ⏱️ COUNTDOWN ════════════════════════════════════════════
ovlcmd({nom_cmd:"countdown",classe:"Prank",react:"⏱️",desc:"Compte a rebours dramatique. Usage: .countdown [n] [message final?]",alias:["compte","rebours","timer"]},async(ovl,msg,{arg,from})=>{
  const n=Math.min(Math.max(parseInt(arg[0])||5,2),30);
  const finals=["BOOOOM 💥","T'as cru quelque chose allait se passer 😂","...rien du tout. GG 🏆","SURPRISE !!! 🎉","😈 T'as perdu quelques secondes de ta vie","WAOU c'etait... RIEN 😂"];
  const finalMsg=arg.slice(1).join(" ")||rand(finals);
  await type(ovl,from,"⏱️ Compte a rebours lance...",600);
  await think(1000);
  for(let i=n;i>=1;i--){
    const bar="🔴".repeat(i)+"⚫".repeat(n-i);
    await ovl.sendMessage(from,{text:"*"+i+"...*\n"+bar});
    await sleep(jitter(1000,300));
  }
  await think(jitter(800,400));
  await type(ovl,from,"🎯 *"+finalMsg+"*");
});

// ═══ 🟩 MATRIX ═══════════════════════════════════════════════
ovlcmd({nom_cmd:"matrix",classe:"Prank",react:"🟩",desc:"Effet visuel pluie de code Matrix",alias:["code","neomode","matrixrain"]},async(ovl,msg,{from})=>{
  const chars="01アイウエオカキクケコサシスセソタチツテト";
  const line=(n)=>Array.from({length:n||16},()=>rand(chars)).join("");
  await type(ovl,from,"🟩 Connexion en cours...",600);
  await think(1500);
  for(let i=0;i<10;i++){
    const d=i<5?i+1:10-i;
    const block=Array.from({length:Math.min(d,4)},()=>"`"+line()+"` ").join("\n");
    await ovl.sendMessage(from,{text:block});
    await sleep(jitter(600,250));
  }
  await think(1000);
  await type(ovl,from,"🟩 *Wake up, Neo...* 🟩\n\n`The Matrix has you.`\n\n_Follow the white rabbit_ 🐇");
});

// ═══ ⌨️ FAKE TYPING ══════════════════════════════════════════
ovlcmd({nom_cmd:"faketyping",classe:"Prank",react:"⌨️",desc:"Montre en train d ecrire pendant X sec puis message inattendu",alias:["typing","ecrire","faketype"]},async(ovl,msg,{arg,from})=>{
  const duration=Math.min(parseInt(arg[0])||8,30);
  const endings=["...","J'ai oublie ce que je voulais dire 😅","Non rien c'est bon 😇","Mauvais chat oops 😂","Je te trollais depuis le debut 😈","...\n\n...\n\nBon j'abandonne.","J'allais dire quelque chose d'important mais la flemme 🙂"];
  try{await ovl.sendPresenceUpdate("composing",from);}catch(_){}
  await sleep(duration*1000);
  try{await ovl.sendPresenceUpdate("paused",from);}catch(_){}
  await sleep(jitter(500,300));
  await ovl.sendMessage(from,{text:rand(endings)});
});

// ═══ 🌋 SEISME ════════════════════════════════════════════════
ovlcmd({nom_cmd:"seisme",classe:"Prank",react:"🌋",desc:"Fausse alerte de seisme tres realiste",alias:["earthquake","tremblement","alerte"]},async(ovl,msg,{from})=>{
  const mag=(Math.random()*3+5).toFixed(1);
  const loc=rand(["votre zone","la region","votre secteur","le quartier"]);
  await type(ovl,from,"🚨 *ALERTE URGENCE NATIONALE* 🚨",600);
  await think(2000);
  await type(ovl,from,"📡 Signal sismique detecte dans "+loc+"...",1000);
  await think(2500);
  await type(ovl,from,"📊 Magnitude: *"+mag+"* sur l'echelle de Richter\n⚠️ Niveau de danger: ELEVE\n📍 Epicentre: 12km de votre position",1200);
  await think(3000);
  await type(ovl,from,"🏠 CONSIGNES D'URGENCE:\n• Quittez les batiments!\n• Eloignez-vous des vitres\n• Rejoignez un espace degage\n• Contactez vos proches!",1500);
  await think(4000);
  await type(ovl,from,"💥 IMPACT IMMINENT...",400);
  await think(1000);
  await type(ovl,from,"5️⃣",300); await sleep(900);
  await type(ovl,from,"4️⃣",300); await sleep(900);
  await type(ovl,from,"3️⃣",300); await sleep(900);
  await type(ovl,from,"2️⃣",300); await sleep(900);
  await type(ovl,from,"1️⃣",300); await sleep(1200);
  await type(ovl,from,"😂 *LOL T'AS CRU?!*\n\nC'etait une blague mon ami(e) 😈\nTout va bien, aucun seisme!\n\n_— HANI-MD Prank System 🎭_");
});

// ═══ 🚫 FAKE BAN ═════════════════════════════════════════════
ovlcmd({nom_cmd:"fakeban",classe:"Prank",react:"🚫",desc:"Simule le bannissement d'un membre. Usage: .fakeban [nom]",alias:["banprank","fakekick","simulban"]},async(ovl,msg,{arg,from})=>{
  const target=arg.join(" ").trim()||"Utilisateur";
  const infractions=Math.floor(Math.random()*20)+3;
  await type(ovl,from,"🚨 *SYSTEME DE MODERATION HANI-MD*",600);
  await think(2000);
  await type(ovl,from,"🔍 Analyse du comportement de: *"+target+"*...",1200);
  await think(3000);
  await type(ovl,from,"⚠️ Infractions detectees:\n• Spam (×"+infractions+")\n• Langage inapproprie\n• Non-respect des regles du groupe\n• Signalements: "+Math.floor(Math.random()*5+2)+" membres",1500);
  await think(3500);
  await type(ovl,from,"⚙️ Traitement de la decision...\n\n  ████░░░░░░  40%",600);
  await sleep(800);
  await type(ovl,from,"  ████████░░  80%",300);
  await sleep(700);
  await type(ovl,from,"  ██████████  100% ✅",300);
  await think(2500);
  await type(ovl,from,"🚫 *"+target+" a ete BANNI du groupe!*\n_Decision definitive. Aucun appel possible._\n_Effectif dans 5 secondes._",1000);
  await sleep(5000);
  await type(ovl,from,"😂😂😂 *C'ETAIT UNE BLAGUE!*\n\nT'es toujours la mon ami(e) 😂\nPersonne n'a ete banni!\n\n*TROLL REUSSI* 🏆\n_— HANI-MD Prank System 🎭_");
});

// ═══ 😈 TROLL — 8 scenarios realistes ════════════════════════
ovlcmd({nom_cmd:"troll",classe:"Prank",react:"😈",desc:"Sequence troll realiste parmi 8 scenarios",alias:["trollen","trollface","prank"]},async(ovl,msg,{from})=>{
  const scenarios=[
    [["Attends...",1800],["Attends...",2000],["Attends encore un peu...",2200],["Tu savais que...",2500],[".......",3000],["Non rien 😂😂😂",0]],
    [["URGENT !!",1500],["Lis bien ce message...",2000],["C'est TRES important...",2500],["......",3500],["Tu as ete trolle 😈",1000],["GG WP 🏆",0]],
    [["Oh non...",2000],["Oh non non non...",2200],["Ton telephone...",2500],["Il commence a...",3000],["BUGER !!! 😱",2000],["Nah je rigole t'es bon 😂",0]],
    [["1...",1000],["2...",1000],["3...",1000],["4...",1000],["5...",1000],["T'attendais quoi exactement ? 😂",0]],
    [["Psst...",1500],["Viens voir...",2000],["Plus pres...",2200],["Encore plus pres...",2500],["😂😂😂 T'as cru quoi ??",0]],
    [["Je peux te dire un secret?",2000],["C'est tres important...",2500],["Vraiment tres important...",3000],["...",4000],["T'es bete 😂❤️",0]],
    [["FELICITATIONS 🎉",1500],["Tu as ete selectionne(e)!",2000],["Pour remporter...",2500],["UN SEJOUR AUX...",3000],["Dans ta chambre 😂",1500],["T'as cru 🏆",0]],
    [["Quelqu'un parle de toi dans le groupe...",2500],["Il dit que tu es...",3000],["......",4000],["MAGNIFIQUE 😂❤️",1500],["Nah c'est vrai en fait 😇",0]]
  ];
  const seq=rand(scenarios);
  for(const [line,pause] of seq){await type(ovl,from,line,pause);}
});

// ═══ 💬 NUKEWORD ═════════════════════════════════════════════
ovlcmd({nom_cmd:"nukeword",classe:"Prank",react:"💬",desc:"Envoie un message mot par mot avec indicateur de frappe. Usage: .nukeword [texte]",alias:["wordbyword","motamot","dramatic"]},async(ovl,msg,{arg,repondre,from})=>{
  if(!arg.length)return repondre("Usage: `.nukeword [texte]`\n\nEx: `.nukeword Tu vas voir ce qui va arriver`");
  for(const word of arg){await type(ovl,from,word,jitter(400,500));}
});

// ═══ 🔁 FAKE FORWARD ═════════════════════════════════════════
ovlcmd({nom_cmd:"fakeforward",classe:"Prank",react:"🔁",desc:"Reponds a un message et le renvoie comme transfert d'un faux contact",alias:["faketransfer","fakefwd"]},async(ovl,msg,{arg,repondre,from})=>{
  const fakeName=arg.join(" ").trim()||"Contact Inconnu";
  const q=getQuoted(msg);
  if(!q)return repondre("Reponds a un message. Usage: `.fakeforward [Faux nom]`");
  await ovl.sendMessage(from,{text:"📨 *Transfere de:* "+fakeName+"\n─────────────────\n"+(q.text||"(media)"),contextInfo:{isForwarded:true,forwardingScore:5}});
});

// ═══ 🎯 ROULETTE RUSSE ═══════════════════════════════════════
ovlcmd({nom_cmd:"roulette",classe:"Prank",react:"🎯",desc:"Roulette russe : 1/6 chance d etre elimine (blague)",alias:["russianroulette","bang","russe"]},async(ovl,msg,{from,auteurMessage})=>{
  const num=(auteurMessage||"").split("@")[0];
  await type(ovl,from,"🔫 *ROULETTE RUSSE*\n\n@"+num+" s'apprete a appuyer sur la gachette...",1200,{mentions:[auteurMessage]});
  await think(3000);
  await type(ovl,from,"💥 *CLIC...*",400);
  await think(jitter(2000,1000));
  if(Math.random()<1/6){
    await type(ovl,from,"💀 *BANG!!!*\n\n@"+num+" est elimine!\n\n_(dans le jeu hein, IRL tu vas tres bien 😂)_",0,{mentions:[auteurMessage]});
  }else{
    await type(ovl,from,"😮 *CLICK!*\n\nPfff... @"+num+" survit!\nChance insolente 🍀 ("+Math.floor(Math.random()*5+1)+"/6 chambres vides)",0,{mentions:[auteurMessage]});
  }
});

// ═══ 🎲 COPIE — repeter un message N fois ════════════════════
ovlcmd({nom_cmd:"copie",classe:"Prank",react:"🎲",desc:"Reponds a un message et le renvoie N fois. Usage: .copie [nombre]",alias:["copymsg","doublons"]},async(ovl,msg,{arg,repondre,from})=>{
  const n=Math.min(Math.max(parseInt(arg[0])||3,1),100);
  const q=getQuoted(msg);
  if(!q||!q.text)return repondre("Reponds a un message texte avec `.copie [nombre]`");
  const delay=n<=10?500:n<=30?300:150;
  for(let i=0;i<n;i++){await ovl.sendMessage(from,{text:q.text});await sleep(delay);}
});

// ═══ 🎵 RICKROLL ═════════════════════════════════════════════
ovlcmd({nom_cmd:"rickroll",classe:"Prank",react:"🎵",desc:"Le classique rickroll textuel avec indicateur de frappe 😂",alias:["rick","astley","nevergonna"]},async(ovl,msg,{from})=>{
  const lyrics=[["We are no strangers to love...",2500],["You know the rules and so do I...",2200],["A full commitment is what I am thinking of...",2800],["You would not get this from any other guy...",2400],["I just wanna tell you how I am feeling...",2600],["Gotta make you understand!",1500],["",500],["NEVER GONNA GIVE YOU UP!",1200],["NEVER GONNA LET YOU DOWN!",1200],["NEVER GONNA RUN AROUND AND DESERT YOU!",1500],["NEVER GONNA MAKE YOU CRY!",1200],["NEVER GONNA SAY GOODBYE!",1200],["",1000],["😂 T'as ete rickrolle!! GG 🏆",0]];
  for(const [line,pause] of lyrics){if(line)await type(ovl,from,line,pause);else await sleep(pause);}
});

console.log("[CMD] Prank.js v3 REALISTIC charge - 22 commandes");
