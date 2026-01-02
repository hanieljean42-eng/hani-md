/**
 * ═══════════════════════════════════════════════════════════
 * ✨ HANI-MD - Text Style Converter
 * ═══════════════════════════════════════════════════════════
 * Convertit le texte en différents styles Unicode
 * Version désobfusquée et optimisée
 * ═══════════════════════════════════════════════════════════
 */

// Caractères normaux
const normalChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// Différents styles de texte Unicode
const styles = {
  // 𝗕𝗼𝗹𝗱
  bold: "𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵",
  
  // 𝘐𝘵𝘢𝘭𝘪𝘤
  italic: "𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻0123456789",
  
  // 𝙗𝙤𝙡𝙙_𝙞𝙩𝙖𝙡𝙞𝙘
  boldItalic: "𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯0123456789",
  
  // 𝚖𝚘𝚗𝚘𝚜𝚙𝚊𝚌𝚎
  monospace: "𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿",
  
  // 𝕠𝕦𝕥𝕝𝕚𝕟𝕖
  outline: "𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡",
  
  // 𝓈𝒸𝓇𝒾𝓅𝓉
  script: "𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏0123456789",
  
  // 𝔣𝔯𝔞𝔨𝔱𝔲𝔯
  fraktur: "𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷0123456789",
  
  // sᴍᴀʟʟᴄᴀᴘs
  smallCaps: "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴩꞯʀꜱᴛᴜᴠᴡxʏᴢᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴩꞯʀꜱᴛᴜᴠᴡxʏᴢ0123456789",
  
  // ⓒⓘⓡⓒⓛⓔⓓ
  circled: "ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ⓪①②③④⑤⑥⑦⑧⑨",
  
  // 🅂🅀🅄🄰🅁🄴🄳
  squared: "🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉0123456789",
  
  // 🅽🅴🅶🅰🆃🅸🆅🅴
  negative: "🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉0123456789",
  
  // u̲n̲d̲e̲r̲l̲i̲n̲e̲
  underline: "A̲B̲C̲D̲E̲F̲G̲H̲I̲J̲K̲L̲M̲N̲O̲P̲Q̲R̲S̲T̲U̲V̲W̲X̲Y̲Z̲a̲b̲c̲d̲e̲f̲g̲h̲i̲j̲k̲l̲m̲n̲o̲p̲q̲r̲s̲t̲u̲v̲w̲x̲y̲z̲0̲1̲2̲3̲4̲5̲6̲7̲8̲9̲",
  
  // s̶t̶r̶i̶k̶e̶t̶h̶r̶o̶u̶g̶h̶
  strikethrough: "A̶B̶C̶D̶E̶F̶G̶H̶I̶J̶K̶L̶M̶N̶O̶P̶Q̶R̶S̶T̶U̶V̶W̶X̶Y̶Z̶a̶b̶c̶d̶e̶f̶g̶h̶i̶j̶k̶l̶m̶n̶o̶p̶q̶r̶s̶t̶u̶v̶w̶x̶y̶z̶0̶1̶2̶3̶4̶5̶6̶7̶8̶9̶",
  
  // ᵗⁱⁿʸ
  tiny: "ᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᵠᴿˢᵀᵁⱽᵂˣʸᶻᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖᵠʳˢᵗᵘᵛʷˣʸᶻ⁰¹²³⁴⁵⁶⁷⁸⁹",
  
  // ɯopuɐɹ (upside down)
  upsideDown: "∀ꓭƆꓷƎℲ⅁HIſꓘ⅃WNOԀῸꓤSꓕ∩ΛMX⅄Zɐqɔpǝɟƃɥıɾʞlɯuodbɹsʇnʌʍxʎz0ƖᄅƐㄣϛ9ㄥ86",
  
  // ғᴀɴᴄʏ
  fancy: "ǟɮƈɖɛʄɢɦɨʝӄʟʍռօքզʀֆȶʊʋաӼʏʐǟɮƈɖɛʄɢɦɨʝӄʟʍռօքզʀֆȶʊʋաӼʏʐ0123456789",
  
  // w̷̛i̴̛t̵̛c̵̛h̷̛ (glitch)
  glitch: "A̷B̷C̷D̷E̷F̷G̷H̷I̷J̷K̷L̷M̷N̷O̷P̷Q̷R̷S̷T̷U̷V̷W̷X̷Y̷Z̷a̷b̷c̷d̷e̷f̷g̷h̷i̷j̷k̷l̷m̷n̷o̷p̷q̷r̷s̷t̷u̷v̷w̷x̷y̷z̷0̷1̷2̷3̷4̷5̷6̷7̷8̷9̷",
  
  // w͓̽i͓̽t͓̽c͓̽h͓̽ (creepy)
  creepy: "A͓̽B͓̽C͓̽D͓̽E͓̽F͓̽G͓̽H͓̽I͓̽J͓̽K͓̽L͓̽M͓̽N͓̽O͓̽P͓̽Q͓̽R͓̽S͓̽T͓̽U͓̽V͓̽W͓̽X͓̽Y͓̽Z͓̽a͓̽b͓̽c͓̽d͓̽e͓̽f͓̽g͓̽h͓̽i͓̽j͓̽k͓̽l͓̽m͓̽n͓̽o͓̽p͓̽q͓̽r͓̽s͓̽t͓̽u͓̽v͓̽w͓̽x͓̽y͓̽z͓̽0͓̽1͓̽2͓̽3͓̽4͓̽5͓̽6͓̽7͓̽8͓̽9͓̽"
};

/**
 * Convertir du texte vers un style
 * @param {string} text - Texte à convertir
 * @param {string} styleName - Nom du style
 * @returns {string} - Texte converti
 */
function convert(text, styleName) {
  const style = styles[styleName];
  if (!style) {
    return text;
  }
  
  let result = "";
  const styleChars = [...style];
  const normalArray = [...normalChars];
  
  for (const char of text) {
    const index = normalArray.indexOf(char);
    if (index !== -1 && styleChars[index]) {
      result += styleChars[index];
    } else {
      result += char;
    }
  }
  
  return result;
}

/**
 * Obtenir la liste des styles disponibles
 * @returns {string[]} - Liste des noms de styles
 */
function getStyles() {
  return Object.keys(styles);
}

/**
 * Obtenir un exemple pour chaque style
 * @param {string} text - Texte exemple
 * @returns {Object} - Objet avec chaque style
 */
function getAllStyles(text = "Example") {
  const result = {};
  for (const styleName of Object.keys(styles)) {
    result[styleName] = convert(text, styleName);
  }
  return result;
}

/**
 * Ajouter des emojis au texte
 * @param {string} text - Texte
 * @param {string} emoji - Emoji à ajouter
 * @param {string} position - Position (before, after, both)
 */
function addEmoji(text, emoji, position = "both") {
  switch (position) {
    case "before":
      return `${emoji} ${text}`;
    case "after":
      return `${text} ${emoji}`;
    case "both":
    default:
      return `${emoji} ${text} ${emoji}`;
  }
}

/**
 * Créer un texte avec bordure
 * @param {string} text - Texte
 * @param {string} border - Caractère de bordure
 */
function addBorder(text, border = "═") {
  const lines = text.split("\n");
  const maxLength = Math.max(...lines.map(l => l.length));
  const topBottom = border.repeat(maxLength + 4);
  const side = "║";
  
  let result = `╔${topBottom}╗\n`;
  for (const line of lines) {
    const padding = " ".repeat(maxLength - line.length);
    result += `${side} ${line}${padding} ${side}\n`;
  }
  result += `╚${topBottom}╝`;
  
  return result;
}

/**
 * Créer un texte arc-en-ciel (emojis colorés)
 * @param {string} text - Texte
 */
function rainbow(text) {
  const colors = ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣"];
  let result = "";
  let colorIndex = 0;
  
  for (const char of text) {
    if (char !== " ") {
      result += char;
      colorIndex = (colorIndex + 1) % colors.length;
    } else {
      result += " ";
    }
  }
  
  return result;
}

module.exports = {
  convert,
  getStyles,
  getAllStyles,
  addEmoji,
  addBorder,
  rainbow,
  styles
};

console.log("[LIB] ✅ Style converter chargé");
