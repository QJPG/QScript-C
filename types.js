
export class Expression {
	constructor() {
	}
}

export class Literal extends Expression {
	constructor(literal) {
		super();

		this.literal = literal;
	}
}

export class Operator {
	constructor(signal) {
		this.signal = signal;
	}
}


export class BinOp extends Expression {
	constructor(left, right, signal) {
		super();

		this.left = left;
		this.right = right;
		this.signal = signal;
	}
}

export class UnaryOp extends Expression {
	constructor(right, signal) {
		super();

		this.right = right;
		this.signal = signal;
	}
}

export class TenaryOp extends Expression {
	constructor(left) {
		super();

		this.left = left;
		this.signal = signal;
	}
}

export class Sizeof {
	constructor(expression) {
		this.expression = expression;
	}
}

export class Identifier {
	constructor(identifier) {
		this.identifier = identifier;
	}
}

export class ImplicitConvertion {
	constructor(typename) {
		this.typename = typename;
		this.expression = null;
	}
}

export class TypenameDef {
	constructor(name) {
		this.name = name;
	}
}

export class VariantDef {
	constructor(name, type, init = null) {
		this.name = name;
		this.type = type;
		this.init = init;
	}
}

export class VarDecl {
	constructor(type, name) {
		this.type = type;
		this.name = name;
		this.init = null;
		this.builtin = false;
	}
}

export class Scope {
	constructor() {
		this.statements = [];
	}
}

export class TypeDecl {
	constructor(name) {
		this.name = name;
		this.scope = null;
	}
}
