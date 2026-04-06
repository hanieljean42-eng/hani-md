/**
 * HANI-MD — Prank & Fun Effects v2 | 22 commandes | pluie max 500 msgs
 */
const { ovlcmd } = require("../lib/ovlcmd");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rand  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const GLITCH = ["\u0334","\u0335","\u0336","\u0337","\u0338","\u0321","\u0322","\u0327","\u0328","\u035c","\u035d","\u035e","\u035f"];
function glitchify(s, lvl=2){return s.split("").map(c=>{let r=c;for(let i=0;i<Math.floor(Math.random()*lvl);i++)r+=rand(GLITCH);return r;}).join("");}
function getQuoted(msg){
  const t=Object.keys(msg.message||{})[0];
  const ctx=msg.message?.[t]?.contextInfo||msg.message?.extendedTextMessage?.contextInfo;
  if(!ctx?.quotedMessage||!ctx?.stanzaId)return null;
  const fv=Object.values(ctx.quotedMessage)[0];
  return{key:{remoteJid:msg.key.remoteJid,fromMe:false,id:ctx.stanzaId,participant:ctx.participant||undefined},senderName:ctx.pushName||(ctx.participant||"").split("@")[0].split(":")[0],text:fv?.text||fv?.caption||""};
}

// ═══ ✏️ FAKE EDIT ════════════════════════════════════════════
ovlcmd({nom_cmd:"fakeedit",classe:"🎭 Prank",react:"✏️",desc:"Réponds à un msg + nouveau texte → supprime l'original et le remplace (bot admin requis)",alias:["editmsg","modifmsg","fakedit"]},async(ovl,msg,{arg,repondre,from})=>{
  const newText=arg.join(" ").trim();
  if(!newText)return repondre("❌ Usage: Réponds à un message avec `.fakeedit [nouveau texte]`");
  const q=getQuoted(msg);
  if(!q)return repondre("❌ Tu dois *répondre* à un message.");
  try{await ovl.sendMessage(from,{delete:q.key});}catch(_){}
  await sleep(600);
  await ovl.sendMessage(from,{text:`✏️ _(message modifié)_\n\n👤 *${q.senderName}:*\n"${newText}"`});
});

// ═══ 👻 DELETE FANTÔME ═════════════════════════════════════
ovlcmd({nom_cmd:"delmsg",classe:"🎭 Prank",react:"👻",desc:"Réponds à un message → supprime pour tous (bot admin requis)",alias:["deletemsg","supprimer","ghostdelete"]},async(ovl,msg,{repondre,from})=>{
  const q=getQuoted(msg);
  if(!q)return repondre("❌ Tu dois *répondre* à un message.");
  try{await ovl.sendMessage(from,{delete:q.key});repondre("👻 *Supprimé!* La personne croit que son tel a bugué 😈");}
  catch(e){repondre(`❌ Bot doit être *admin*.\n${e.message}`);}
});

// ═══ 🔀 GLITCH ═════════════════════════════════════════════
ovlcmd({nom_cmd:"glitch",classe:"🎭 Prank",react:"🔀",desc:"Texte glitché qui fait croire à un bug système. Usage: .glitch [texte]",alias:["bugtext","glitchtext","corrupt","bug"]},async(ovl,msg,{arg,from})=>{
  const text=arg.join(" ").trim()||"Erreur critique détectée";
  await ovl.sendMessage(from,{text:[`⚠️ *[ SYSTÈME — ERREUR FATALE ]*`,"",glitchify(text,3),"",`E R R : 0 x F F 4 2 _ C O R R U P T`,glitchify("NOYAU — panique détectée",2),glitchify("Redémarrage forcé dans 3...",2),`▓▓▓▓▓▓▓░░░ 71% [ECHEC]`,"",`_Erreur 404: cerveau.exe introuvable_`].join("\n")});
});

// ═══ 💻 HACK PRANK ═════════════════════════════════════════
ovlcmd({nom_cmd:"hackprank",classe:"🎭 Prank",react:"💻",desc:"Séquence de faux hacking dramatique. Usage: .hackprank [cible]",alias:["hack","hacking","fakedossier"]},async(ovl,msg,{arg,from})=>{
  const target=arg.join(" ").trim()||"cible inconnue";
  const ip=`192.168.${rand(["0","1","2"])}.${Math.floor(Math.random()*254)+1}`;
  const steps=[`💻 *[HANI-MD HACK MODULE v3.1]*`,`🔍 Recherche: _${target}_...`,`📡 Connexion au proxy #${Math.floor(Math.random()*20)+1}...`,`🌐 IP résolue: \`${ip}\``,`🔐 Bypass firewall... ✅ OK`,`📂 Accès fichiers:\n  › contacts.db ✅\n  › photos.zip ✅\n  › messages.log ✅`,`📸 Extraction données...\n  ████████████ 100%`,`✅ *HACK RÉUSSI* 😈\n\n_Nah je rigole t'as cru quoi 😂_`];
  for(const s of steps){await ovl.sendMessage(from,{text:s});await sleep(1500);}
});

// ═══ 🦠 VIRUS PRANK ════════════════════════════════════════
ovlcmd({nom_cmd:"phonevirus",classe:"🎭 Prank",react:"🦠",desc:"Fausse alerte virus critique 😈",alias:["virus","malware","fakevirus"]},async(ovl,msg,{from})=>{
  const files=Math.floor(Math.random()*500)+100;
  const srv=`server-${Math.floor(Math.random()*99)}.darknet.ru`;
  const steps=[`🦠 *ALERTE SÉCURITÉ CRITIQUE*\n━━━━━━━━━━━━━━━━━━━━━━━━━━`,`🔍 Analyse en cours...\n▓▓▓▓▓▓▓▓▓▓ 100%`,`☠️ *VIRUS DÉTECTÉ*\n• Nom: _WhatsApp.Trojan.XLMR_\n• Niveau: 🔴 CRITIQUE\n• Fichiers infectés: ${files}`,`⚙️ Suppression...\n▓▓▓░░░░░░░ 31%... ECHEC`,`📲 Envoi données à:\n\`${srv}\``,`⚠️ Appuie sur REDÉMARRER 3× vite!\n\n😂 *C'ÉTAIT UNE BLAGUE!*\nTon tel va très bien 😇\n_— HANI-MD Prank 🎭_`];
  for(const s of steps){await ovl.sendMessage(from,{text:s});await sleep(1800);}
});

// ═══ ❤️ PLUIE DE COEURS ════════════════════════════════════
ovlcmd({nom_cmd:"coeurs",classe:"🎭 Prank",react:"❤️",desc:"Cascade animée de coeurs colorés",alias:["heartrain","hearts","coeur","lovepluie"]},async(ovl,msg,{from})=>{
  const frames=["❤️","❤️  💕","❤️  💕  🧡","💛  ❤️  💚  💕","💜  💛  ❤️  💚  💙","💗  💜  💛  ❤️  💚  💙  🤍","❤️ 💕 💛 💙 💚 💜 🧡 💗 🤍 ❤️","💘 💝 💖 💗 💓 💞 💕 💟 ❣️ ❤️","❤️‍🔥 ❤️ 💕 💖 💗 💓 💞 💝 💘 ❤️‍🔥","❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️","   ❤️     ❤️     ❤️"," ❤️  💕  💛  💙  💚  ❤️","❤️    💜    🧡    💗    ❤️"," ❤️  💕  💛  💙  💚  ❤️","   ❤️     ❤️     ❤️","      💕        💕","          ❤️","💘💝💖💗💓💞💕💟❣️❤️💘💝","❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️"];
  for(const f of frames){await ovl.sendMessage(from,{text:f});await sleep(380);}
  await ovl.sendMessage(from,{text:"❤️ *PLUIE DE CŒURS* ❤️\n\n💕 Tu mérites tout l'amour du monde 💕\n\n❤️💛💚💙💜🧡💗❤️"});
});

// ═══ 💣 LOVE BOMB ══════════════════════════════════════════
ovlcmd({nom_cmd:"lovebomb",classe:"🎭 Prank",react:"💣",desc:"Bombarde quelqu'un d'amour... puis révèle le troll. Usage: .lovebomb [prénom]",alias:["bombamour","loveletter","lovespam"]},async(ovl,msg,{arg,from})=>{
  const name=arg.join(" ").trim()||"toi";
  const msgs=[`💘 Hey ${name}...`,`💕 Je voulais juste te dire...`,`❤️ Que tu es...`,`💖 ABSOLUMENT...`,`💗 INCROYABLE!!!`,`🌹 Non vraiment...`,`💝 T'as vu comme t'es beau/belle?`,`😍 Franchement...`,`💓 Je t'aime bien fréro/sœurette!`,`❤️‍🔥 *BON OK C'ÉTAIT UN PIÈGE* 😂`,`😈 T'as cru que c'était sérieux hein?`,`🎊 LOVE BOMB RÉUSSIE! AHAHAH 🎊`];
  for(const m of msgs){await ovl.sendMessage(from,{text:m});await sleep(1000);}
});

// ═══ 🌧️ PLUIE EMOJIS — max 500 messages ═══════════════════
ovlcmd({nom_cmd:"pluie",classe:"🎭 Prank",react:"🌧️",desc:"Pluie d'emojis jusqu'à 500 messages! Usage: .pluie [emoji] [1-500]",alias:["emojirain","rain","cascade","spamemoji"]},async(ovl,msg,{arg,repondre,from})=>{
  if(!arg[0])return repondre("🌧️ *PLUIE D'EMOJIS — max 500 messages*\n\nUsage: `.pluie [emoji] [quantité]`\n\n• `.pluie ⭐ 50` — 50 étoiles\n• `.pluie 🔥 200` — 200 feux\n• `.pluie 💰 500` — pluie de 500 billets 💸\n• `.pluie 😂 100` — 100 rires");
  const emoji=arg[0];
  const count=Math.min(Math.max(parseInt(arg[1])||10,1),500);
  const delay=count<=30?300:count<=100?150:count<=300?80:50;
  if(count<=20){
    for(let i=1;i<=count;i++){await ovl.sendMessage(from,{text:emoji.repeat(i)});await sleep(delay);}
    for(let i=count-1;i>=1;i--){await ovl.sendMessage(from,{text:emoji.repeat(i)});await sleep(delay);}
  }else{
    for(let i=0;i<count;i++){await ovl.sendMessage(from,{text:emoji.repeat(Math.floor(Math.random()*5)+1)});await sleep(delay);}
  }
});

// ═══ 💥 SPAM — texte/emoji N fois (max 500) ════════════════
ovlcmd({nom_cmd:"spam",classe:"🎭 Prank",react:"💥",desc:"Spam un texte ou emoji N fois (max 500). Usage: .spam [texte] [nombre]",alias:["repeat","repeter","spamtext"]},async(ovl,msg,{arg,repondre,from})=>{
  if(!arg[0])return repondre("❌ Usage: `.spam [texte ou emoji] [nombre]`\n\nEx: `.spam OK 50` ou `.spam 🔥 300`");
  const parts=[...arg];const last=parts[parts.length-1];
  let count,text;
  if(!isNaN(last)&&parts.length>1){count=Math.min(Math.max(parseInt(last),1),500);text=parts.slice(0,-1).join(" ");}
  else{count=10;text=parts.join(" ");}
  const delay=count<=30?300:count<=100?150:count<=300?80:50;
  for(let i=0;i<count;i++){await ovl.sendMessage(from,{text});await sleep(delay);}
});

// ═══ ⏱️ COUNTDOWN ══════════════════════════════════════════
ovlcmd({nom_cmd:"countdown",classe:"🎭 Prank",react:"⏱️",desc:"Compte à rebours dramatique. Usage: .countdown [n] [message final?]",alias:["compte","rebours","timer"]},async(ovl,msg,{arg,from})=>{
  const n=Math.min(Math.max(parseInt(arg[0])||5,2),30);
  const finals=["BOOOOM 💥","T'as cru quelque chose allait se passer 😂","...rien. Absolument rien. GG 🏆","SURPRISE !!! 🎉🎊🎉","😈 T'as perdu quelques secondes de ta vie","WAOU! C'ÉTAIT... RIEN 😂"];
  const finalMsg=arg.slice(1).join(" ")||rand(finals);
  for(let i=n;i>=1;i--){await ovl.sendMessage(from,{text:`⏱️ *${i}...*\n${"🔴".repeat(i)}${"⚫".repeat(n-i)}`});await sleep(1000);}
  await sleep(400);
  await ovl.sendMessage(from,{text:`🎯 *${finalMsg}*`});
});

// ═══ 🟩 MATRIX ═════════════════════════════════════════════
ovlcmd({nom_cmd:"matrix",classe:"🎭 Prank",react:"🟩",desc:"Effet visuel pluie de code Matrix",alias:["code","neomode","matrixrain"]},async(ovl,msg,{from})=>{
  const chars="01アイウエオカキクケコサシスセソタチツテトナニヌネノ";
  const line=(n=18)=>Array.from({length:n},()=>rand(chars)).join("");
  for(let i=0;i<12;i++){
    const d=i<6?i+1:12-i;
    const block=Array.from({length:Math.min(d,4)},()=>"`"+line()+"`").join("\n");
    await ovl.sendMessage(from,{text:block});await sleep(500);
  }
  await ovl.sendMessage(from,{text:"🟩 *Wake up, Neo...* 🟩\n\n`The Matrix has you.`\n\n_Follow the white rabbit_ 🐇"});
});

// ═══ ⌨️ FAKE TYPING ════════════════════════════════════════
ovlcmd({nom_cmd:"faketyping",classe:"🎭 Prank",react:"⌨️",desc:"Montre 'en train d'écrire' pendant X sec puis message inattendu",alias:["typing","ecrire","faketype"]},async(ovl,msg,{arg,from})=>{
  const duration=Math.min(parseInt(arg[0])||6,30);
  const endings=["...","J'ai oublié ce que je voulais dire 😅","Non rien c'est bon 😇","Mauvais chat oops 😂","Je te trollais depuis le début 😈","💭 ...\n\n💭 ...\n\n💭 ...\n\nBon j'abandonne."];
  try{await ovl.sendPresenceUpdate("composing",from);await sleep(duration*1000);await ovl.sendPresenceUpdate("paused",from);}catch(_){}
  await ovl.sendMessage(from,{text:rand(endings)});
});

// ═══ 🌋 SÉISME ══════════════════════════════════════════════
ovlcmd({nom_cmd:"seisme",classe:"🎭 Prank",react:"🌋",desc:"Fausse alerte de séisme dramatique",alias:["earthquake","tremblement","alerte"]},async(ovl,msg,{from})=>{
  const mag=(Math.random()*3+5).toFixed(1);
  const steps=[`🚨 *ALERTE URGENCE NATIONALE* 🚨`,`📡 Signal sismique détecté dans votre zone...`,`📊 Magnitude: *${mag}* sur l'échelle de Richter\n⚠️ Niveau: ÉLEVÉ`,`🏠 Quittez les bâtiments!\n🔦 Prenez vos affaires essentielles!`,`💥 IMPACT IMMINENT DANS...\n5️⃣  4️⃣  3️⃣  2️⃣  1️⃣`,`😂 *LOL t'as cru?!*\nC'était une blague 😈\nTon tel va bien!\n_— HANI-MD Prank 🎭_`];
  for(const s of steps){await ovl.sendMessage(from,{text:s});await sleep(2000);}
});

// ═══ 🚫 FAKE BAN ═══════════════════════════════════════════
ovlcmd({nom_cmd:"fakeban",classe:"🎭 Prank",react:"🚫",desc:"Simule le bannissement d'un membre. Usage: .fakeban [nom]",alias:["banprank","fakekick","simulban"]},async(ovl,msg,{arg,from})=>{
  const target=arg.join(" ").trim()||"Utilisateur";
  const steps=[`🚨 *SYSTÈME DE MODÉRATION HANI-MD*`,`🔍 Analyse de: *${target}*...`,`⚠️ Infractions:\n• Spam (×${Math.floor(Math.random()*20)+3})\n• Langage inapproprié`,`⚙️ Traitement...\n▓▓▓▓▓▓▓▓▓▓ 100%`,`🚫 *${target} a été BANNI!*\n_Décision définitive._`,`😂😂😂 *C'ÉTAIT UNE BLAGUE!*\n\nT'es toujours là mon ami(e) 😂\n*TROLL RÉUSSI* 🏆\n_— HANI-MD Prank 🎭_`];
  for(const s of steps){await ovl.sendMessage(from,{text:s});await sleep(1800);}
});

// ═══ 😈 TROLL — 8 scénarios ═══════════════════════════════
ovlcmd({nom_cmd:"troll",classe:"🎭 Prank",react:"😈",desc:"Séquence troll aléatoire parmi 8 scénarios",alias:["trollen","trollface","prank"]},async(ovl,msg,{from})=>{
  const scenarios=[["Attends..","Attends..","Attends encore..","Tu savais que..","......","Non rien 😂😂😂"],["URGENT !","Lis bien ce message..","C'est TRÈS important..","......","Tu as été trollé 😈","GG WP 🏆"],["Oh non..","Oh non non non..","Ton téléphone..","Il commence à..","BUGER !!! 😱","Nah je rigole t'es bon 😂"],["1...","2...","3...","4...","5...","T'attendais quoi exactement ? 😂"],["Psst...","Viens voir...","Plus près...","Encore plus près...","😂😂😂 T'as cru quoi ??"],["Je peux te dire un secret?","C'est très important...","Vraiment...","...","T'es bête 😂❤️"],["FÉLICITATIONS 🎉","Tu as été sélectionné(e)!","Pour remporter...","UN SÉJOUR AUX...","Dans ta chambre 😂","T'as cru 🏆"],["Quelqu'un parle de toi...","Il dit que tu es...","......","MAGNIFIQUE 😂❤️","Nah c'est vrai en fait 😇"]];
  for(const line of rand(scenarios)){await ovl.sendMessage(from,{text:line});await sleep(1300);}
});

// ═══ 💬 NUKEWORD ═══════════════════════════════════════════
ovlcmd({nom_cmd:"nukeword",classe:"🎭 Prank",react:"💬",desc:"Envoie un message mot par mot. Usage: .nukeword [texte]",alias:["wordbyword","motamot","dramatic"]},async(ovl,msg,{arg,repondre,from})=>{
  if(!arg.length)return repondre("❌ Usage: `.nukeword [texte]`");
  for(const word of arg){await ovl.sendMessage(from,{text:word});await sleep(900);}
});

// ═══ 🔁 FAKE FORWARD ═══════════════════════════════════════
ovlcmd({nom_cmd:"fakeforward",classe:"🎭 Prank",react:"🔁",desc:"Réponds → renvoie comme transfert d'un faux contact",alias:["faketransfer","fakefwd"]},async(ovl,msg,{arg,repondre,from})=>{
  const fakeName=arg.join(" ").trim()||"Contact Inconnu";
  const q=getQuoted(msg);
  if(!q)return repondre("❌ Réponds à un message. Usage: `.fakeforward [Faux nom]`");
  await ovl.sendMessage(from,{text:"📨 *Transféré de:* "+fakeName+"\n─────────────────\n"+(q.text||"(média)"),contextInfo:{isForwarded:true,forwardingScore:5}});
});
ovlcmd({nom_cmd:'roulette',classe:'Prank',react:'',desc:'Roulette russe 1/6',alias:['bang','russe']},async(ovl,msg,{from,auteurMessage})=>{const num=(auteurMessage||'').split('@')[0];await ovl.sendMessage(from,{text:'ROULETTE RUSSE\n@'+num+' appuie...',mentions:[auteurMessage]});await sleep(2000);await ovl.sendMessage(from,{text:'CLIC...'});await sleep(1500);if(Math.random()<1/6){await ovl.sendMessage(from,{text:'BANG! @'+num+' est elimine! (blague)',mentions:[auteurMessage]});}else{await ovl.sendMessage(from,{text:'CLICK! @'+num+' survit!',mentions:[auteurMessage]});}});

ovlcmd({nom_cmd:'copie',classe:'Prank',react:'',desc:'Reponds a un msg et renvoie N fois. Usage: .copie [n]',alias:['copymsg','doublons']},async(ovl,msg,{arg,repondre,from})=>{const n=Math.min(Math.max(parseInt(arg[0])||3,1),100);const q=getQuoted(msg);if(!q||!q.text)return repondre('Reponds a un message texte avec .copie [nombre]');const delay=n<=10?500:n<=30?300:150;for(let i=0;i<n;i++){await ovl.sendMessage(from,{text:q.text});await sleep(delay);}});
ovlcmd({nom_cmd:"rickroll",classe:"Prank",react:"",desc:"Rickroll textuel",alias:["rick","nevergonna"]},async(ovl,msg,{from})=>{
  const lines=["We are no strangers to love...","You know the rules and so do I...","A full commitment is what I am thinking of...","You would not get this from any other guy...","I just wanna tell you how I am feeling...","Gotta make you understand!","","NEVER GONNA GIVE YOU UP!","NEVER GONNA LET YOU DOWN!","NEVER GONNA RUN AROUND AND DESERT YOU!","","T as ete rickrolle 😂 GG"];
  for(const l of lines){await ovl.sendMessage(from,{text:l});await sleep(1100);}
});
console.log('[CMD] Prank.js charge - 22 commandes prank et fun');
