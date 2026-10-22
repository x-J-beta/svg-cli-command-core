export class Tokenizer {
  tokenize(line: string): readonly string[] {
    if (line.trimStart().startsWith("#")) return [];
    const tokens: string[] = [];
    let current = "";
    let quoted = false;
    let started = false;
    for (let index = 0; index < line.length; index++) {
      const character = line[index]!;
      if (character === "\\" && quoted && (line[index + 1] === '"' || line[index + 1] === "\\")) {
        current += line[++index]!; started = true;
      } else if (character === '"') { quoted = !quoted; started = true; }
      else if (/\s/u.test(character) && !quoted) {
        if (started) { tokens.push(current); current = ""; started = false; }
      } else { current += character; started = true; }
    }
    if (quoted) throw new Error("unterminated quoted argument");
    if (started) tokens.push(current);
    return tokens;
  }
}
