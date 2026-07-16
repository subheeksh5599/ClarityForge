import type { languages } from "monaco-editor";

// Clarity language definition for Monaco editor
// Provides proper syntax highlighting, bracket matching, and autocomplete
const CLARITY_LANGUAGE: languages.IMonarchLanguage = {
  defaultToken: "",
  ignoreCase: true,
  tokenPostfix: ".clarity",

  keywords: [
    "define-public", "define-read-only", "define-private",
    "define-fungible-token", "define-non-fungible-token",
    "define-data-var", "define-map", "define-constant", "define-trait",
    "impl-trait", "let", "begin", "if", "and", "or", "not",
    "is-eq", "is-some", "is-none", "is-ok", "is-err",
    "match", "asserts!", "try!", "unwrap!", "unwrap-panic",
    "unwrap-err!", "unwrap-err-panic",
    "ok", "err", "some", "none", "true", "false",
    "as-contract", "contract-caller", "tx-sender", "contract-call?",
    "stx-transfer?", "stx-get-balance", "stx-burn?",
    "ft-transfer?", "ft-get-balance", "ft-get-supply", "ft-burn?", "ft-mint?",
    "nft-mint?", "nft-get-owner?", "nft-burn?", "nft-transfer?",
    "map-set", "map-get?", "map-delete", "map-insert",
    "var-get", "var-set",
    "get-block-info?", "get-burn-block-info?", "block-height", "burn-block-height",
    "print", "as-max-len?", "to-uint", "to-int",
    "list", "fold", "filter", "map", "len", "element-at",
    "index-of", "append", "concat", "slice", "replace-at?",
    "default-to", "get", "tuple", "tuples", "tuple-get", "merge",
    "contract-of", "principal-of",
  ],

  typeKeywords: [
    "uint", "int", "bool", "principal", "buff",
    "string-utf8", "string-ascii", "list", "optional", "response",
  ],

  operators: ["+", "-", "*", "/", "<", ">", "<=", ">=", "is-eq"],

  symbols: /[=><!~?:&|+\-*\/\^%]+/,

  tokenizer: {
    root: [
      // Comments
      [/;;.*$/, "comment"],

      // Strings
      [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],

      // u-prefixed integers (Clarity: u100, u1000)
      [/u\d+/, "number"],

      // Negative integers
      [/-?\d+/, "number"],

      // Stacks addresses and principals
      [/'[A-Z0-9]{28,}/, "type"],
      [/\.\w[\w-]*/, "type"],

      // Identifiers and keywords
      [
        /[a-zA-Z_][\w\-!?]*/,
        {
          cases: {
            "@keywords": "keyword",
            "@typeKeywords": "type",
            "@default": "identifier",
          },
        },
      ],

      // Whitespace
      [/[ \t\r\n]+/, "white"],

      // Parentheses
      [/\(/, "@brackets"],
      [/\)/, "@brackets"],
    ],

    string: [
      [/[^\\"]+/, "string"],
      [/\\./, "string.escape"],
      [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
    ],
  },

  brackets: [
    { open: "(", close: ")", token: "delimiter.parenthesis" },
  ],

  autoClosingPairs: [
    { open: "(", close: ")" },
    { open: '"', close: '"' },
  ],

  surroundingPairs: [
    { open: "(", close: ")" },
  ],
};

// Clarity completion provider — provides autocomplete for Clarity keywords
const CLARITY_COMPLETIONS = [
  // Defines
  { label: "define-public", insertText: "define-public (${1:name} (${2:param} ${3:type}))\n  (begin\n    ${4}\n    (ok true))", detail: "Define a public function" },
  { label: "define-read-only", insertText: "define-read-only (${1:name} (${2:param} ${3:type}))\n  (ok ${4})", detail: "Define a read-only function" },
  { label: "define-private", insertText: "define-private (${1:name} (${2:param} ${3:type}))\n  (begin\n    ${4}\n    (ok true))", detail: "Define a private function" },
  { label: "define-fungible-token", insertText: "define-fungible-token ${1:token-name} ${2:u1000000}", detail: "Define a fungible token" },
  { label: "define-non-fungible-token", insertText: "define-non-fungible-token ${1:nft-name} ${2:uint}", detail: "Define a non-fungible token" },
  { label: "define-data-var", insertText: "define-data-var ${1:var-name} ${2:uint} ${3:u0}", detail: "Define a data variable" },
  { label: "define-map", insertText: "define-map ${1:map-name} ${2:uint} { ${3:field}: ${4:uint} }", detail: "Define a map" },
  { label: "define-constant", insertText: "define-constant ${1:name} ${2:value}", detail: "Define a constant" },
  { label: "define-trait", insertText: "define-trait ${1:trait-name}\n  (\n    (${2:fn-name} (${3:param} ${4:type}) (response ${5:uint} uint))\n  )", detail: "Define a trait" },

  // Built-in functions
  { label: "ft-transfer?", insertText: "ft-transfer? ${1:token} ${2:amount} ${3:sender} ${4:recipient}", detail: "Transfer fungible tokens" },
  { label: "ft-get-balance", insertText: "ft-get-balance ${1:token} ${2:who}", detail: "Get fungible token balance" },
  { label: "ft-get-supply", insertText: "ft-get-supply ${1:token}", detail: "Get fungible token total supply" },
  { label: "ft-mint?", insertText: "ft-mint? ${1:token} ${2:amount} ${3:recipient}", detail: "Mint fungible tokens" },
  { label: "ft-burn?", insertText: "ft-burn? ${1:token} ${2:amount} ${3:sender}", detail: "Burn fungible tokens" },
  { label: "nft-mint?", insertText: "nft-mint? ${1:nft} ${2:id} ${3:recipient}", detail: "Mint an NFT" },
  { label: "nft-get-owner?", insertText: "nft-get-owner? ${1:nft} ${2:id}", detail: "Get NFT owner" },
  { label: "nft-transfer?", insertText: "nft-transfer? ${1:nft} ${2:id} ${3:sender} ${4:recipient}", detail: "Transfer an NFT" },
  { label: "nft-burn?", insertText: "nft-burn? ${1:nft} ${2:id} ${3:sender}", detail: "Burn an NFT" },

  // Map operations
  { label: "map-set", insertText: "map-set ${1:map} ${2:key} ${3:value}", detail: "Set a map entry" },
  { label: "map-get?", insertText: "map-get? ${1:map} ${2:key}", detail: "Get a map entry (returns optional)" },
  { label: "map-delete", insertText: "map-delete ${1:map} ${2:key}", detail: "Delete a map entry" },
  { label: "map-insert", insertText: "map-insert ${1:map} ${2:key} ${3:value}", detail: "Insert into a map (fails if exists)" },

  // Var operations
  { label: "var-get", insertText: "var-get ${1:var-name}", detail: "Get a data variable" },
  { label: "var-set", insertText: "var-set ${1:var-name} ${2:value}", detail: "Set a data variable" },

  // Transfer
  { label: "stx-transfer?", insertText: "stx-transfer? ${1:amount} ${2:sender} ${3:recipient}", detail: "Transfer STX" },
  { label: "stx-get-balance", insertText: "stx-get-balance ${1:who}", detail: "Get STX balance" },

  // Control flow
  { label: "let", insertText: "let ((${1:name} ${2:value}))\n  ${3}", detail: "Local binding" },
  { label: "begin", insertText: "begin\n  ${1}\n  ${2}", detail: "Sequence expressions" },
  { label: "if", insertText: "if ${1:condition}\n  ${2:consequent}\n  ${3:alternative}", detail: "Conditional" },
  { label: "match", insertText: "match ${1:optional}\n  ${2:some-binding}\n  ${3:some-body}\n  ${4:none-body}", detail: "Match optional/response" },
  { label: "try!", insertText: "try! ${1:expression}", detail: "Unwrap ok, return err" },
  { label: "unwrap!", insertText: "unwrap! ${1:expression} ${2:error-value}", detail: "Unwrap with error" },
  { label: "asserts!", insertText: "asserts! ${1:condition} ${2:error-value}", detail: "Assert condition" },

  // Values
  { label: "ok", insertText: "ok ${1:value}", detail: "Success response" },
  { label: "err", insertText: "err ${1:error-code}", detail: "Error response" },
  { label: "some", insertText: "some ${1:value}", detail: "Optional value" },
  { label: "none", insertText: "none", detail: "Empty optional" },

  // Contract calls
  { label: "contract-call?", insertText: "contract-call? ${1:contract} ${2:fn-name} ${3:args...}", detail: "Call another contract" },
  { label: "as-contract", insertText: "as-contract ${1:expression}", detail: "Execute as contract" },

  // Block info
  { label: "get-block-info?", insertText: "get-block-info? ${1:property} ${2:block-height}", detail: "Get block information" },
  { label: "block-height", insertText: "block-height", detail: "Current block height" },
  { label: "burn-block-height", insertText: "burn-block-height", detail: "Current burn block height" },

  // Print (debug)
  { label: "print", insertText: "print ${1:value}", detail: "Print value (debug only)" },

  // List operations
  { label: "list", insertText: "list ${1:item1} ${2:item2} ${3:item3}", detail: "Create a list" },
  { label: "fold", insertText: "fold ${1:func} ${2:list} ${3:initial}", detail: "Fold over a list" },
  { label: "filter", insertText: "filter ${1:func} ${2:list}", detail: "Filter a list" },
  { label: "len", insertText: "len ${1:list}", detail: "List length" },
];

export { CLARITY_LANGUAGE, CLARITY_COMPLETIONS };
