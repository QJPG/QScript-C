
import * as types from "./types.js";



class Parse {
	static TK_UNDEFINED = -1;
	static TK_KEYWORD = 0;
	static TK_INTEGER = 1;
	static TK_NUMBER = 2;
	static TK_SPECIAL = 3;
	static TK_STRING = 4;
	static TK_CHAR = 5;
	static TK_BOOL = 6;

	static ALPHA = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	static DIGIT = "0123456789";

	static is_alpha(chr) {
		return Parse.ALPHA.indexOf(chr) > -1;
	}

	static is_digit(chr) {
		return Parse.DIGIT.indexOf(chr) > -1;
	}

	constructor(source) {
		this.source = source;
		this.token_type = Parse.TK_UNDEFINED;
		this.token_kind = null;
		this.source_index = 0;
		this.source_line = 0;
		this.source_column = 0;
		this.source_finished = false;

		this.historic_token_type = this.token_type;
		this.historic_token_kind = this.token_kind;
		this.historic_source_index = this.source_index;
		this.historic_source_finished = this.source_finished;

		this.historic = [];
	}

	restore() {
		let data = this.historic.pop();
		
		this.source_index = data[2];
		this.source_finished = data[3];
		this.token_kind = data[1];
		this.token_type = data[0];
	}

	next() {
		//this.historic_token_type = this.token_type;
		//this.historic_token_kind = this.token_kind;
		//this.historic_source_index = this.source_index;
		//this.historic_source_finished = this.source_finished;

		this.historic.push([
			this.token_type,
			this.token_kind,
			this.source_index,
			this.source_finished
		]);

		if (this.source.length < 1)
			this.source_finished = true;
		
		if (this.source_finished) {
			this.token_kind = null;
			this.token_type = Parse.TK_UNDEFINED;
			
			console.log("The current Parser is now finished!");
			
			return;
		}

		this.token_kind = null;
		this.token_type = Parse.TK_UNDEFINED;

		let to_next = true;

		while (to_next) {
			let chr = this.source[this.source_index];

			switch (this.token_type) {
				case Parse.TK_KEYWORD: {
					if (Parse.is_alpha(chr) || Parse.is_digit(chr) || chr == '_') {
						this.token_kind += chr;
						this.source_index++;
					}

					else {
						to_next = false;
					}

					break;
				}

				case Parse.TK_INTEGER: {
					if (Parse.is_digit(chr)) {
						this.token_kind += chr;
						this.source_index++;
					}

					else if (chr== '.') {
						this.token_kind += chr;
						this.token_type = Parse.TK_NUMBER;
						this.source_index++;
					}

					else if (chr == '_') {
						this.source_index++;
					}

					else {
						to_next = false;
					}

					break;
				}

				case Parse.TK_NUMBER: {
					if (Parse.is_digit(chr)) {
						this.token_kind += chr;
						this.source_index++;
					}

					else if (chr == '_') {
						this.source_index++;
					}

					else {
						to_next = false;
					}

					break;
				}

				case Parse.TK_STRING: {
					switch (chr) {
						case '"': {
							to_next = false;
							break;
						}

						default: {
							this.token_kind += chr;
							break;
						}
					}

					this.source_index++;
					break;
				}

				case Parse.TK_CHAR: {
					switch (chr) {
						case "'": {
							to_next = false;
							break;
						}

						default: {
							if (this.token_kind == '')
								this.token_kind += chr;
							
							break;
						}
					}

					this.source_index++;
					break;
				}

				default: {
					if (Parse.is_alpha(chr) || chr == '_') {
						this.token_type = Parse.TK_KEYWORD;
						this.token_kind = chr;
					}

					else if (Parse.is_digit(chr)) {
						this.token_type = Parse.TK_INTEGER;
						this.token_kind = chr;
					}

					else {
						switch (chr) {
							case '"': {
								this.token_type = Parse.TK_STRING;
								this.token_kind = "";
								break;
							}

							case "'": {
								this.token_type = Parse.TK_CHAR;
								this.token_kind = "";
								break;
							}

							case ' ': {
								break;
							}

							default: {
								this.token_type = Parse.TK_SPECIAL;
								this.token_kind = chr;
								
								to_next = false;
								break;
							}
						}
					}

					this.source_index++;
					break;
				}
			}

			if (this.source_index >= this.source.length) {
				to_next = false;
				this.source_finished = true;
			}

			if (to_next == false) break;
		}

		// Token Kind Convertions

		if (this.token_kind != null) {
			switch (this.token_type) {
				case Parse.TK_INTEGER:
					this.token_kind = parseInt(this.token_kind);
					break;

				case Parse.TK_NUMBER:
					this.token_kind = parseFloat(this.token_kind);
					break;

				case Parse.TK_KEYWORD: {
					if (this.token_kind == 'true' || this.token_kind == 'false') {
						this.token_type = Parse.TK_BOOL;
						this.token_kind = this.token_kind === 'true';
					}

					break;
				}

				default:
					break;
			}
		}
	}
}

class Token {
	constructor(type, kind) {
		this.type = type;
		this.kind = kind;
	}
}

class State {
	static SCOPE_TYPE_NAMESPACE = 0;	//Global Scope			<Statements>
	static SCOPE_TYPE_PROTOTYPE = 1;	//Function Scope		<Statements, Expressions>
	static SCOPE_TYPE_STRUCTURE = 2;	//Typedef Scope			<[Typenames]>
	static SCOPE_TYPE_PROTONONE = 3;	//Function Local Scopes <Statements, Expressions>

	static SCOPE_DATA_LOCALS = "__locals__";
	static SCOPE_DATA_PROTOS = "__protos__";
	static SCOPE_DATA_CHILDS = "__childs__";
	static SCOPE_DATA_RETURN = "__return__";
	
	constructor() {
		this.scopes = {};
		this.running = true;
	}

	error(code) {
		this.running = false;
		console.log(`@ Returned an Error:  ${code}!`);
	}


	store_scope(name, type) {
		this.scopes[name] = {
			__type__ : type,
		}

		switch (type) {
			case State.SCOPE_TYPE_NAMESPACE: {
				this.scopes[name][State.SCOPE_DATA_LOCALS] = {};
				this.scopes[name][State.SCOPE_DATA_PROTOS] = {};
				break;
			}

			case State.SCOPE_TYPE_PROTOTYPE: {
				this.scopes[name][State.SCOPE_DATA_LOCALS] = {};
				this.scopes[name][State.SCOPE_DATA_PROTOS] = {};
				this.scopes[name][State.SCOPE_DATA_CHILDS] = [];
				this.scopes[name][State.SCOPE_DATA_RETURN] = null;
				break;
			}

			case State.SCOPE_TYPE_STRUCTURE: {
				this.scopes[name][State.SCOPE_DATA_LOCALS] = {};
				break;
			}

			case State.SCOPE_TYPE_PROTONONE: {
				this.scopes[name][State.SCOPE_DATA_LOCALS] = {};
				this.scopes[name][State.SCOPE_DATA_CHILDS] = [];
				break;
			}
		}
	}
}

class Expression {
	static PRECEDENCE_LEVEL_MAX = 2;
	static PRECEDENCE_LEVEL_MID = 1;
	static PRECEDENCE_LEVEL_MIN = 0;
	
	constructor(state, parse) {
		this.state = state;
		this.parse = parse;
	}

	get_expression(special_delimiters = []) {
		let expressions = [];

		while (this.parse.source_finished == false) {
			this.parse.next();

			let expression = null;

			// 1 @ 2		// err
			// @sizeof(2)	// ok
			
			/*
			Operators:
				+ - *
				/ % &
				| ! >
				< = #
				[ ( .
				^ ~ $
			*/

			switch (this.parse.token_type) {
				case Parse.TK_INTEGER: {
					expression = new types.Literal(this.parse.token_kind, types.Literal.LITERAL_INTEGER);
					break;
				}

				case Parse.TK_NUMBER: {
					expression = new types.Literal(this.parse.token_kind, types.Literal.LITERAL_NUMBER);
					break;
				}

				case Parse.TK_STRING: {
					expression = new types.Literal(this.parse.token_kind, types.Literal.LITERAL_STRING);
					break;
				}

				case Parse.TK_SPECIAL: {
					switch (this.parse.token_kind) {
						case '\t': case '\n': {
							break;
						}

						case '(': {
							//((1 * 2)(1, 2) + 1);
							
							let is_callable = false;
							
							if (expressions.length > 0) {
								if (!(expressions.back() instanceof types.ExpressionOperator)
									|| (expressions.back() instanceof Array)) {
									is_callable = true;
								}
							}

							while (this.parse.token_type == Parse.TK_SPECIAL && this.parse.token_kind == ')') {
								if (this.parse.source_finished == true) {
									this.state.error(ERRORS.EXPECTED_LPAREN);
									
									return [];
								}

								if (is_callable) {
									expression = new types.Callable();
									
									while (this.parse.token_type == Parse.TK_SPECIAL && this.parse.token_kind == ',') {
										let expr = this.parse([',', ')']);

										if (expr != null && this.state.running == false) {
											expression.arguments.push(expr);
										}

										else return [];

										if (this.parse.token_type == Parse.TK_SPECIAL && this.parse.token_kind == ')') {
											break;
										}
									}

								}

								else {
									expression = this.get_expression([')']);
								}
							}

							break;
						}

						case '+': {
							expression = new types.BinnaryOperator(Expression.PRECEDENCE_LEVEL_MIN);
							expression.operator_signal = this.parse.token_kind;

							this.parse.next();

							// 1 ++a++;

							if (this.parse.token_type == Parse.TK_SPECIAL && this.parse.token_kind == '+') {
								expression = new types.UnaryTenaryOperator(Expression.PRECEDENCE_LEVEL_MAX);
								expression.operator_signal = '++';
							}

							else {
								this.parse.restore();
							}

							break;
						}

						case '*': {
							expression = new types.BinnaryOperator(Expression.PRECEDENCE_LEVEL_MID);
							expression.operator_signal = this.parse.token_kind;
							break;
						}

						default: {
							if (special_delimiters.indexOf(this.parse.token_kind) > -1) {
								return expressions;
							}

							break;
						}
					}

					break;
				}
			}

			if (expression) {
				expressions.push(expression);
			}
		}

		return expressions;
	}

	get(special_delimiters = [';']) {
		var expressions = this.get_expression(special_delimiters);
		var expression = null;

		if (expressions.length < 1) {
			this.error(ERRORS.INVALID_EXPRESSION);
			
			return expression;
		}
		
		//parse expressions
		
		let reparse = (exprs, precedence) => {
			let local_exprs = [];

			for (let i = 0; i < exprs.length; ++i) {
				let expr = exprs[i];

				if (expr instanceof types.ExpressionOperator && expr.precedence == precedence) {
					if (expr instanceof types.BinnaryOperator) {
						if (local_exprs.back() instanceof types.Expression) {
							if (local_exprs.back() instanceof types.ExpressionOperator
								&& local_exprs.back().closed == false) {
								this.state.error(ERRORS.MISSING_OPERANDS);

								return expression;
							}

							expr.left_expression = local_exprs.pop();
							local_exprs.push(expr);
						}

						else {
							this.state.error(ERRORS.UNEXPECTED_TOKEN);

							return expression;
						}
					}

					else if (expr instanceof types.UnaryTenaryOperator) {
						if (local_exprs.back() instanceof types.Expression) {
							let jmp = false;

							if (local_exprs.back() instanceof types.ExpressionOperator
								&& local_exprs.back().closed == false) {
								jmp = true;
							}

							if (!jmp) {
								expr.expression = local_exprs.pop();
								expr.closed = true;
								expr.tenary = true;
							}
						}

						local_exprs.push(expr);
					}
				}

				else {
					if (local_exprs.length > 0) {
						if (local_exprs.back() instanceof types.ExpressionOperator
							&& local_exprs.back().precedence == precedence) {

							if (local_exprs.back() instanceof types.BinnaryOperator) {
								if (local_exprs.back().closed == true) {
									this.state.error(ERRORS.UNEXPECTED_EXPRESSION);

									return expression;
								}
								
								if (local_exprs.back().right_expression == null) {
									local_exprs.back().right_expression = expr;
									local_exprs.back().closed = true;
								}
							}	

							else if (local_exprs.back() instanceof types.UnaryTenaryOperator) {
								if (local_exprs.back().closed == true) {
									if (local_exprs.back() instanceof types.ExpressionOperator
										&& local_exprs.back().closed == true) {
										this.state.error(ERRORS.UNEXPECTED_EXPRESSION);

										return expression;
									}

									local_exprs.push(expr);
								}

								else {
									if (local_exprs.back().expression == null) {
										local_exprs.back().closed = true;
										local_exprs.back().tenary = false;
										local_exprs.back().expression = expr;
									}	
								}	
							}
						}

						else if (!(local_exprs.back() instanceof types.ExpressionOperator)
							&& !(expr instanceof types.ExpressionOperator)) {
							this.state.error(ERRORS.UNEXPECTED_EXPRESSION);

							return expression;
						}

						else {
							local_exprs.push(expr);
						}
					}

					else
						local_exprs.push(expr);
				}
			}

			if (precedence > Expression.PRECEDENCE_LEVEL_MIN) {
				reparse(local_exprs, --precedence);
			}

			else {
				if (local_exprs.length == 1) {
					if (local_exprs.back() instanceof types.ExpressionOperator
						&& local_exprs.back().closed == false) {
						this.state.error(ERRORS.MISSING_OPERANDS);

						return expression;
					}
				}
				
				expression = local_exprs.pop();
			}
		}

		reparse(expressions, Expression.PRECEDENCE_LEVEL_MAX);
		
		return expression;
	}
}

const ERRORS = {
	UNEXPECTED_TOKEN : 0,
	EXPECTED_ENDLINE : 1,
	DUPLICATED_NAME : 2,
	EXPECTED_EXPRESSION : 3,
	EXPECTED_LPAREN : 4,
	INVALID_EXPRESSION : 5,
	UNEXPECTED_EXPRESSION : 6,
	MISSING_OPERANDS : 7,
}

class QScript {
	constructor() {
		this.state = null;
		this.parse = null;
		this.exprn = null;
	}

	catch_next() {
		this.parse.next();

		let data = null;

		switch (this.parse.token_type) {
			case Parse.TK_SPECIAL: {
				switch (this.parse.token_kind) {
					case '\n': {
						break;
					}

					case '\t': {
						break;
					}

					default: {
						this.parse.restore();
						data = this.exprn.get([';']);
						
						break;
					}
				}
				
				break;
			}

			case Parse.TK_NUMBER: case Parse.TK_STRING: case Parse.TK_INTEGER: {
				this.parse.restore();
				data = this.exprn.get([';']);
				
				break;
			}

			case Parse.TK_KEYWORD: {
				switch (this.parse.token_kind) {
					case 'let': {
						data = new types.TypenameDeclaration();

						this.parse.next();

						if (this.parse.token_type == Parse.TK_KEYWORD) {
							data.name = this.parse.token_kind;

							this.parse.next();

							if (this.parse.token_type == Parse.TK_SPECIAL && this.parse.token_kind == '=') {
								data.init = this.exprn.get([';']);

								if (!(data.init instanceof types.Expression)) {
									this.state.error(ERRORS.EXPECTED_EXPRESSION);
								}
							}

							else if (this.parse.token_type == Parse.TK_SPECIAL && this.parse.token_kind == ':') {
								data.init = new types.StructureDefinition();

								//parse structure here
								console.log("TO-DO: Structure Definition")
							}

							else {
								this.state.error(ERRORS.UNEXPECTED_TOKEN);
							}
						}

						else {
							this.state.error(ERRORS.UNEXPECTED_TOKEN);
						}

						break;
					}

					default: {
						let identifier = this.parse.token_kind;
						this.parse.next();
						
						switch (this.parse.token_kind) {
							case Parse.TK_SPECIAL: {
								switch (this.parse.token_kind) {
									case ':': {
										data = new types.ParameterDeclaration();
										data.name = identifier;

										this.parse.next();

										if (this.parse.token_type == Parse.TK_KEYWORD) {
											data.type = this.parse.token_kind;
										}

										else {
											this.state.error(ERRORS.UNEXPECTED_TOKEN);
										}
										
										break;
									}

									default: {
										this.parse.restore();
										this.parse.restore();
										data = this.exprn.get([';']);
										
										break;
									}
								}

								break;
							}
						}

						break;
					}
				}

				break;
			}
		}

		return data;
	}

	load(source) {
		this.parse = new Parse(source);
		this.state = new State();
		this.exprn = new Expression();
		this.exprn.state = this.state;
		this.exprn.parse = this.parse;

		this.state.store_scope("_G", State.SCOPE_TYPE_NAMESPACE);

		while (this.parse.source_finished == false) {
			let global_scope_catch = this.catch_next();

			if (global_scope_catch instanceof types.TypenameDeclaration) {
				if (global_scope_catch.name in this.state.scopes["_G"][State.SCOPE_DATA_LOCALS]) {
					this.state.error(ERRORS.DUPLICATED_NAME);
				}

				else
					this.state.scopes["_G"][State.SCOPE_DATA_LOCALS][global_scope_catch.name] = global_scope_catch.init;
			}

			if (this.state.running == false) break;
		}

		console.log(this.state.scopes["_G"]);
	}
}
/*
class Evaluate {
	static SP_TYPE_ASSIGN = ':';
	static SP_TYPE_EQUALS = '=';
	static SP_TYPE_ENDLNE = '\n';
	static SP_TYPE_SEMICL = ';';
	
	constructor(source) {
		this.parse = new Parse(source);
		this.queue_expr = [];
		this.queue_think = [];
		this.tree = {
			typenames: {
				"int"	: 32,
				"float"	: 32,
				"bool"	: 1,
				"char"	: 1,
				"string": {},
			}, //global typenames
		}
		this.stop = false;
	}

	error(message = "Ocorred an Error!") {
		this.stop = true;
		console.log(message);
	}

	get_expression(tokens) {
		let expression = null;
		let queue = [];

		for (let i = 0; i < tokens.length; ++i) {
			if (tokens[i] instanceof Token) {
				let token = tokens[i];

				switch (token.type) {
					case Parse.TK_NUMBER: case Parse.TK_STRING: case Parse.TK_INTEGER: {
						queue.push(new types.Literal(token.kind));
						break;
					}

					case Parse.TK_SPECIAL: {
						switch (token.kind) {
							case '-': case '+': case '*': case '/': case '%': {
								queue.push(new types.Operator(token.kind));
								break;
							}
						}

						break;
					}
				}
			}
		}

		//console.log(queue);

		let precedences = {
			'+': 0,
			'-': 0,
			'%': 0,
			'*': 1,
			';': 1,
		}

		let parse_queue = (list, precedence) => {
			let i = 0;
			let locals = [];

			while (i < list.length) {
				if (list[i] instanceof types.Operator) {
					let tmp = null;

					if (locals.length < 1 ||
						(locals.length > 0 &&
							((locals.back() instanceof types.BinOp && locals.back().right == null) ||
								locals.back() instanceof types.Operator))) {
						tmp = new types.UnaryOp(null, list[i].signal);
					}

					else if (locals.length > 0) {
						if (precedences[list[i].signal] == precedence) {
							tmp = new types.BinOp(locals.back(), null, list[i].signal);
							locals.remove(locals.back());
						}

						else {
							locals.push(list[i]);
						}
					}

					else {
						this.error("Unknown Operator");
						return;
					}
					
					if (tmp) {
						locals.push(tmp);
					}
				}

				else if (list[i] instanceof types.Expression) {
					if (list[i] instanceof types.UnaryOp && list[i].right == null) {
						this.error("Expected an Expression after Unary Operator!");
						return;
					}

					else if (list[i] instanceof types.BinOp && (list[i].left == null || list[i].right == null)) {
						this.error("Expected an Expression before/after Binnary Operator!");
						return;
					}

					if (locals.length > 0) {
						if (locals.back() instanceof types.UnaryOp && locals.back().right == null) {
							locals.back().right = list[i];
						}

						else if (locals.back() instanceof types.BinOp && locals.back().right == null) {
							locals.back().right = list[i];
						}

						else if (locals.back() instanceof types.Operator) {
							locals.push(list[i]);
						}

						else {
							this.error("Unexpected Expression");
							return;
						}
					}

					else {
						locals.push(list[i]);
					}

				}

				i++;
			}
			
			if (precedence > 0) {
				expression = null;
				precedence--;
				parse_queue(locals, precedence);
			}

			else {
				if (locals.length == 1)
					expression = locals.pop();
				else {
					this.error("Caught an Incomplete Expression");
					return;
				}
			}
		}

		parse_queue(queue, 1);


		return expression;
	}

	capture() {
		this.parse.next();

		let object = null;

		switch (this.parse.token_type) {
			case Parse.TK_SPECIAL: {
				return this.capture();
			}

			case Parse.TK_KEYWORD: {
				if (this.parse.token_kind in this.tree.typenames) {
					object = new types.VarDecl(null, null);
					object.type = this.parse.token_kind;

					this.parse.next();

					if (this.parse.token_type == Parse.TK_KEYWORD) {
						object.name = this.parse.token_kind;

						this.parse.next();

						if (this.parse.token_type == Parse.TK_SPECIAL && this.parse.token_kind == '=') {
							let tokens = [];

							while (!(this.parse.token_type == Parse.TK_SPECIAL && this.parse.token_kind == ';')) {
								if (this.parse.source_finished == true) break;
								
								this.parse.next();
								tokens.push(new Token(this.parse.token_type, this.parse.token_kind));
							}

							object.init = this.get_expression(tokens);
						
						} else if (this.parse.token_type == Parse.TK_SPECIAL && this.parse.token_kind == ';') {
							return object;
						
						} else {
							this.error("Expected an '=' or end of line!");
						}
					} else {
						this.error("Expected an Keyword!");
					}
				} else {
					this.error("Unknown Typename!");
				}

				break;
			}
		}

		return object;
	}

	start() {
		while (this.parse.source_finished == false) {
			let stmt = this.capture();

			if (stmt) {
				console.log(stmt);
			} else {
				break;
			}
		}
	}
}
*/

Array.prototype.remove = function(what) {
	let index = this.indexOf(what);
	
	if (index > -1) {
		return this.splice(index, 1);
	}

	return null;
}

Array.prototype.back = function() {
	return (this.length > 0) ? this[this.length - 1] : null;
}

window.exec = function(code = "") {
	//var e = new Evaluate(code);
	//e.start();
	
	console.log(code);
	
	var s = new QScript();
	s.load(code);
}

const demo = `
	let x = 1 * ++2++;
	let y = "test";
`

window.exec(demo);




