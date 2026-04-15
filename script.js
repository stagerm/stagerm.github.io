// Truth Table Simulator - Pure JavaScript Implementation

// DOM Elements
const expressionInput = document.getElementById('expression-input');
const generateBtn = document.getElementById('generate-btn');
const clearBtn = document.getElementById('clear-btn');
const errorMessage = document.getElementById('error-message');
const resultsSection = document.getElementById('results-section');
const expressionDisplay = document.getElementById('expression-display');
const tableHead = document.getElementById('table-head');
const tableBody = document.getElementById('table-body');

// Operator and Variable buttons
const operatorBtns = document.querySelectorAll('.btn-operator');
const variableBtns = document.querySelectorAll('.btn-variable');

// Event Listeners
generateBtn.addEventListener('click', generateTable);
clearBtn.addEventListener('click', clearAll);
expressionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    generateTable();
  }
});

operatorBtns.forEach(btn => {
  btn.addEventListener('click', () => insertSymbol(btn.dataset.symbol));
});

variableBtns.forEach(btn => {
  btn.addEventListener('click', () => insertSymbol(btn.dataset.symbol));
});

// Insert symbol at cursor position
function insertSymbol(symbol) {
  const start = expressionInput.selectionStart;
  const end = expressionInput.selectionEnd;
  const value = expressionInput.value;
  
  expressionInput.value = value.substring(0, start) + symbol + value.substring(end);
  expressionInput.focus();
  expressionInput.setSelectionRange(start + symbol.length, start + symbol.length);
  hideError();
}

// Clear everything
function clearAll() {
  expressionInput.value = '';
  hideError();
  resultsSection.style.display = 'none';
  expressionInput.focus();
}

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  resultsSection.style.display = 'none';
}

// Hide error message
function hideError() {
  errorMessage.style.display = 'none';
}

// Normalize expression - convert alternative symbols to standard ones
function normalizeExpression(expr) {
  return expr
    .replace(/~/g, '¬')
    .replace(/!/g, '¬')
    .replace(/\^/g, '∧')
    .replace(/&/g, '∧')
    .replace(/\|/g, '∨')
    .replace(/<->/g, '↔')
    .replace(/<>/g, '↔')
    .replace(/->/g, '→')
    .replace(/=>/g, '→')
    .replace(/NOT/gi, '¬')
    .replace(/AND/gi, '∧')
    .replace(/OR/gi, '∨')
    .replace(/XOR/gi, '⊕')
    .replace(/IMPLIES/gi, '→')
    .replace(/IFF/gi, '↔');
}

// Extract variables from expression
function extractVariables(expr) {
  const variables = new Set();
  const normalized = normalizeExpression(expr);
  
  for (const char of normalized) {
    if (/[A-Z]/i.test(char)) {
      variables.add(char.toUpperCase());
    }
  }
  
  return Array.from(variables).sort();
}

// Tokenize expression
function tokenize(expr) {
  const tokens = [];
  let i = 0;
  
  while (i < expr.length) {
    const char = expr[i];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    // Variables
    if (/[A-Z]/i.test(char)) {
      tokens.push({ type: 'VAR', value: char.toUpperCase() });
      i++;
      continue;
    }
    
    // Operators and parentheses
    if (char === '¬') {
      tokens.push({ type: 'NOT', value: '¬' });
    } else if (char === '∧') {
      tokens.push({ type: 'AND', value: '∧' });
    } else if (char === '∨') {
      tokens.push({ type: 'OR', value: '∨' });
    } else if (char === '→') {
      tokens.push({ type: 'IMPLIES', value: '→' });
    } else if (char === '↔') {
      tokens.push({ type: 'IFF', value: '↔' });
    } else if (char === '⊕') {
      tokens.push({ type: 'XOR', value: '⊕' });
    } else if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
    } else if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
    } else {
      throw new Error(`Caracter no reconocido: "${char}"`);
    }
    
    i++;
  }
  
  return tokens;
}

// Parser - builds AST using recursive descent
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }
  
  peek() {
    return this.tokens[this.pos] || null;
  }
  
  consume(expectedType) {
    const token = this.peek();
    if (!token) {
      throw new Error('Fin inesperado de la expresion');
    }
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Se esperaba ${expectedType}, se encontro ${token.type}`);
    }
    this.pos++;
    return token;
  }
  
  // Expression -> Iff
  parse() {
    const result = this.parseIff();
    if (this.peek()) {
      throw new Error('Expresion invalida: tokens adicionales despues del final');
    }
    return result;
  }
  
  // Iff -> Implies (↔ Implies)*
  parseIff() {
    let left = this.parseImplies();
    
    while (this.peek() && this.peek().type === 'IFF') {
      this.consume('IFF');
      const right = this.parseImplies();
      left = { type: 'IFF', left, right };
    }
    
    return left;
  }
  
  // Implies -> Or (→ Or)*
  parseImplies() {
    let left = this.parseOr();
    
    while (this.peek() && this.peek().type === 'IMPLIES') {
      this.consume('IMPLIES');
      const right = this.parseOr();
      left = { type: 'IMPLIES', left, right };
    }
    
    return left;
  }
  
  // Or -> Xor (∨ Xor)*
  parseOr() {
    let left = this.parseXor();
    
    while (this.peek() && this.peek().type === 'OR') {
      this.consume('OR');
      const right = this.parseXor();
      left = { type: 'OR', left, right };
    }
    
    return left;
  }
  
  // Xor -> And (⊕ And)*
  parseXor() {
    let left = this.parseAnd();
    
    while (this.peek() && this.peek().type === 'XOR') {
      this.consume('XOR');
      const right = this.parseAnd();
      left = { type: 'XOR', left, right };
    }
    
    return left;
  }
  
  // And -> Not (∧ Not)*
  parseAnd() {
    let left = this.parseNot();
    
    while (this.peek() && this.peek().type === 'AND') {
      this.consume('AND');
      const right = this.parseNot();
      left = { type: 'AND', left, right };
    }
    
    return left;
  }
  
  // Not -> ¬ Not | Primary
  parseNot() {
    if (this.peek() && this.peek().type === 'NOT') {
      this.consume('NOT');
      const operand = this.parseNot();
      return { type: 'NOT', operand };
    }
    return this.parsePrimary();
  }
  
  // Primary -> VAR | ( Expression )
  parsePrimary() {
    const token = this.peek();
    
    if (!token) {
      throw new Error('Expresion incompleta');
    }
    
    if (token.type === 'VAR') {
      this.consume('VAR');
      return { type: 'VAR', name: token.value };
    }
    
    if (token.type === 'LPAREN') {
      this.consume('LPAREN');
      const expr = this.parseIff();
      if (!this.peek() || this.peek().type !== 'RPAREN') {
        throw new Error('Falta parentesis de cierre');
      }
      this.consume('RPAREN');
      return expr;
    }
    
    throw new Error(`Token inesperado: ${token.value}`);
  }
}

// Evaluate AST with given variable values
function evaluate(ast, values) {
  switch (ast.type) {
    case 'VAR':
      return values[ast.name];
    case 'NOT':
      return !evaluate(ast.operand, values);
    case 'AND':
      return evaluate(ast.left, values) && evaluate(ast.right, values);
    case 'OR':
      return evaluate(ast.left, values) || evaluate(ast.right, values);
    case 'XOR':
      return evaluate(ast.left, values) !== evaluate(ast.right, values);
    case 'IMPLIES':
      return !evaluate(ast.left, values) || evaluate(ast.right, values);
    case 'IFF':
      return evaluate(ast.left, values) === evaluate(ast.right, values);
    default:
      throw new Error(`Tipo de nodo desconocido: ${ast.type}`);
  }
}

// Extract subexpressions from AST for display
function extractSubexpressions(ast, subexprs = new Set()) {
  if (ast.type === 'VAR') {
    return subexprs;
  }
  
  if (ast.type === 'NOT') {
    extractSubexpressions(ast.operand, subexprs);
    if (ast.operand.type !== 'VAR') {
      subexprs.add(astToString(ast));
    }
  } else {
    extractSubexpressions(ast.left, subexprs);
    extractSubexpressions(ast.right, subexprs);
    
    // Add subexpressions that are compound (not just variables or simple negations)
    if (ast.left.type !== 'VAR') {
      const leftStr = astToString(ast.left);
      if (!leftStr.match(/^¬[A-Z]$/)) {
        subexprs.add(leftStr);
      }
    }
    if (ast.right.type !== 'VAR') {
      const rightStr = astToString(ast.right);
      if (!rightStr.match(/^¬[A-Z]$/)) {
        subexprs.add(rightStr);
      }
    }
  }
  
  return subexprs;
}

// Convert AST back to string
function astToString(ast) {
  switch (ast.type) {
    case 'VAR':
      return ast.name;
    case 'NOT':
      if (ast.operand.type === 'VAR') {
        return `¬${ast.operand.name}`;
      }
      return `¬(${astToString(ast.operand)})`;
    case 'AND':
      return `(${astToString(ast.left)} ∧ ${astToString(ast.right)})`;
    case 'OR':
      return `(${astToString(ast.left)} ∨ ${astToString(ast.right)})`;
    case 'XOR':
      return `(${astToString(ast.left)} ⊕ ${astToString(ast.right)})`;
    case 'IMPLIES':
      return `(${astToString(ast.left)} → ${astToString(ast.right)})`;
    case 'IFF':
      return `(${astToString(ast.left)} ↔ ${astToString(ast.right)})`;
    default:
      return '';
  }
}

// Generate all combinations of variable values
function generateCombinations(variables) {
  const n = variables.length;
  const combinations = [];
  const total = Math.pow(2, n);
  
  for (let i = 0; i < total; i++) {
    const combo = {};
    for (let j = 0; j < n; j++) {
      combo[variables[j]] = Boolean((i >> (n - 1 - j)) & 1);
    }
    combinations.push(combo);
  }
  
  return combinations;
}

// Main function to generate truth table
function generateTable() {
  const input = expressionInput.value.trim();
  
  if (!input) {
    showError('Por favor ingresa una expresion logica');
    return;
  }
  
  try {
    // Normalize and parse
    const normalized = normalizeExpression(input);
    const variables = extractVariables(normalized);
    
    if (variables.length === 0) {
      showError('La expresion debe contener al menos una variable (P, Q, R, S, T)');
      return;
    }
    
    if (variables.length > 6) {
      showError('Maximo 6 variables permitidas');
      return;
    }
    
    const tokens = tokenize(normalized);
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    // Extract subexpressions
    const subexprSet = extractSubexpressions(ast);
    const subexpressions = Array.from(subexprSet);
    
    // Parse subexpressions for evaluation
    const subexprASTs = {};
    for (const subexpr of subexpressions) {
      const subTokens = tokenize(subexpr);
      const subParser = new Parser(subTokens);
      subexprASTs[subexpr] = subParser.parse();
    }
    
    // Generate combinations and evaluate
    const combinations = generateCombinations(variables);
    const rows = combinations.map(values => {
      const subResults = {};
      for (const subexpr of subexpressions) {
        subResults[subexpr] = evaluate(subexprASTs[subexpr], values);
      }
      return {
        values,
        subResults,
        result: evaluate(ast, values)
      };
    });
    
    // Display results
    displayTable(variables, subexpressions, rows, normalized);
    hideError();
    
  } catch (error) {
    showError(`Error: ${error.message}`);
  }
}

// Display the truth table
function displayTable(variables, subexpressions, rows, expression) {
  // Update expression display
  expressionDisplay.textContent = expression;
  
  // Build table header
  let headerHTML = '<tr>';
  
  // Variable headers
  for (const v of variables) {
    headerHTML += `<th>${v}</th>`;
  }
  
  // Subexpression headers
  for (const sub of subexpressions) {
    headerHTML += `<th class="sub-header">${sub}</th>`;
  }
  
  // Result header
  headerHTML += `<th class="result-header">${expression}</th>`;
  headerHTML += '</tr>';
  
  tableHead.innerHTML = headerHTML;
  
  // Build table body
  let bodyHTML = '';
  
  for (const row of rows) {
    bodyHTML += '<tr>';
    
    // Variable values
    for (const v of variables) {
      const value = row.values[v];
      bodyHTML += `<td class="${value ? 'value-true' : 'value-false'}">${value ? 'V' : 'F'}</td>`;
    }
    
    // Subexpression values
    for (const sub of subexpressions) {
      const value = row.subResults[sub];
      bodyHTML += `<td class="sub-cell ${value ? 'value-true' : 'value-false'}">${value ? 'V' : 'F'}</td>`;
    }
    
    // Result value
    const resultValue = row.result;
    bodyHTML += `<td class="result-cell ${resultValue ? 'value-true' : 'value-false'}">${resultValue ? 'V' : 'F'}</td>`;
    
    bodyHTML += '</tr>';
  }
  
  tableBody.innerHTML = bodyHTML;
  
  // Show results section
  resultsSection.style.display = 'block';
  
  // Scroll to results
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Focus input on load
expressionInput.focus();
