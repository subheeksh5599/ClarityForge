// Clarity tokenizer — breaks Clarity source into tokens
// Handles: comments, s-expressions, strings, integers, principals, keywords

export type TokenType =
  | "comment"
  | "lparen"
  | "rparen"
  | "keyword"
  | "identifier"
  | "string"
  | "integer"
  | "uint"
  | "principal"
  | "type"
  | "builtin"
  | "whitespace"
  | "unknown";

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

const CLARITY_KEYWORDS = new Set([
  "define-public", "define-read-only", "define-private",
  "define-fungible-token", "define-non-fungible-token",
  "define-data-var", "define-map", "define-constant",
  "define-trait", "impl-trait",
  "let", "begin", "if", "and", "or", "not", "is-eq", "is-some",
  "is-none", "is-ok", "is-err", "try!", "unwrap!", "unwrap-panic",
  "unwrap-err!", "unwrap-err-panic", "match", "asserts!",
  "ok", "err", "some", "none", "true", "false",
  "as-contract", "contract-caller", "tx-sender",
  "ft-transfer?", "ft-get-balance", "ft-get-supply",
  "ft-burn?", "ft-mint?",
  "nft-mint?", "nft-get-owner?", "nft-burn?", "nft-transfer?",
  "map-set", "map-get?", "map-delete", "map-insert",
  "var-get", "var-set",
  "stx-transfer?", "stx-get-balance",
  "print", "contract-call?", "as-max-len?",
  "to-uint", "to-int",
  "list", "fold", "map", "filter", "len", "element-at",
  "index-of", "append", "concat", "slice", "replace-at?",
  "default-to", "get", "get-block-info?", "get-burn-block-info?",
  "block-height", "burn-block-height",
  "tuples", "tuple-get",
]);

const CLARITY_TYPES = new Set([
  "uint", "int", "bool", "principal",
  "buff", "string-utf8", "string-ascii",
  "list", "tuple", "optional", "response",
]);

function isKeyword(word: string): boolean {
  return CLARITY_KEYWORDS.has(word);
}

function isType(word: string): boolean {
  return CLARITY_TYPES.has(word) || word.startsWith("(string-utf8") || word.startsWith("(buff");
}

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  function push(type: TokenType, value: string) {
    tokens.push({ type, value, line, col: col - value.length });
  }

  while (i < source.length) {
    const ch = source[i];

    // Whitespace
    if (ch === " " || ch === "\t" || ch === "\r") {
      let ws = "";
      while (i < source.length && (source[i] === " " || source[i] === "\t" || source[i] === "\r")) {
        ws += source[i];
        i++;
        col++;
      }
      push("whitespace", ws);
      continue;
    }

    // Newline
    if (ch === "\n") {
      push("whitespace", "\n");
      i++;
      line++;
      col = 1;
      continue;
    }

    // Comments
    if (ch === ";" && source[i + 1] === ";") {
      let comment = ";;";
      i += 2;
      col += 2;
      while (i < source.length && source[i] !== "\n") {
        comment += source[i];
        i++;
        col++;
      }
      push("comment", comment);
      continue;
    }

    // Parentheses
    if (ch === "(") {
      push("lparen", "(");
      i++;
      col++;
      continue;
    }
    if (ch === ")") {
      push("rparen", ")");
      i++;
      col++;
      continue;
    }

    // Strings
    if (ch === '"') {
      let str = '"';
      i++;
      col++;
      while (i < source.length && source[i] !== '"') {
        if (source[i] === "\\") { str += source[i]; i++; col++; }
        str += source[i];
        i++;
        col++;
      }
      if (i < source.length) { str += '"'; i++; col++; }
      push("string", str);
      continue;
    }

    // u-prefixed integers (Clarity: u123)
    if (ch === "u" && i + 1 < source.length && /[0-9]/.test(source[i + 1])) {
      let num = "u";
      i++;
      col++;
      while (i < source.length && /[0-9]/.test(source[i])) {
        num += source[i];
        i++;
        col++;
      }
      push("uint", num);
      continue;
    }

    // Integers
    if (/[0-9]/.test(ch)) {
      let num = "";
      while (i < source.length && /[0-9]/.test(source[i])) {
        num += source[i];
        i++;
        col++;
      }
      push("integer", num);
      continue;
    }

    // Principals (Stacks addresses)
    if ((ch === "'" || ch === ".") && i + 1 < source.length) {
      // 'ST... or .namespace or .identifier
      let principal = ch;
      i++;
      col++;
      while (i < source.length && /[a-zA-Z0-9\-_.!?+*\/=<>]/.test(source[i])) {
        principal += source[i];
        i++;
        col++;
      }
      push("principal", principal);
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_\-!?+*\/=<>]/.test(ch)) {
      let word = "";
      while (i < source.length && /[a-zA-Z0-9_\-!?+*\/=<>]/.test(source[i])) {
        word += source[i];
        i++;
        col++;
      }

      // Check compound keywords like "define-public"
      if (word === "define" || word === "define-read" || word === "define-fungible" || word === "define-non" || word === "get-block" || word === "get-burn") {
        let rest = "";
        let j = i;
        while (j < source.length && (source[j] === "-" || /[a-zA-Z]/.test(source[j]))) {
          rest += source[j];
          j++;
        }
        const full = word + rest;
        if (isKeyword(full)) {
          push("keyword", full);
          i = j;
          col += rest.length;
          continue;
        }
      }

      if (isKeyword(word)) {
        push("keyword", word);
      } else if (isType(word)) {
        push("type", word);
      } else if (word.startsWith("define-") && source.substring(i, i + 10).match(/^-token|-nft|-data|-map|-constant|-trait/)) {
        // Incomplete keyword — let it through as identifier
        push("identifier", word);
      } else {
        push("identifier", word);
      }
      continue;
    }

    // Unknown
    push("unknown", ch);
    i++;
    col++;
  }

  return tokens;
}
