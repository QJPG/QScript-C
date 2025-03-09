
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
	}

	next() {
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

		console.log("$", expression);

		return expression;
	}

	capture() {
		this.parse.next();

		let object = null;

		switch (this.parse.token_type) {
			case Parse.TK_KEYWORD: {
				if (this.parse.token_kind in this.tree.typenames) {
					this.parse.next();

					object = new types.VarDecl(null, null)
					object.type = this.parse.token_kind;

					if (this.parse.token_type == Parse.TK_KEYWORD) {
						object.name = this.parse.token_kind;

						this.parse.next();

						if (this.parse.token_type == Parse.TK_SPECIAL && this.parse.token_kind == '=') {
							let tokens = [];

							while (!(this.parse.token_type == Parse.TK_SPECIAL && this.parse.token_kind == '\n')) {
								if (this.parse.source_finished == true) break;
								
								this.parse.next();
								tokens.push(new Token(this.parse.token_type, this.parse.token_kind));
							}

							object.init = this.get_expression(tokens);
						
						} else if (this.parse.token_type == Parse.TK_SPECIAL && this.parse.token_kind == '\n') {
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
}

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

window.test = function test(code = "") {
	var e = new Evaluate(code);
	console.log(e.capture());
}

test(`int x : @float 1 + 1.2`);



