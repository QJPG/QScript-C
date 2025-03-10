


export class Statement {
	constructor() {}
}


export class Expression {
	constructor() {}
}


export class TypenameDeclaration extends Statement {
	constructor() {
		super();

		this.name = null;
		this.init = null;
		this.constant = false;
	}
}

export class ParameterDeclaration extends Statement {
	constructor() {
		super();

		this.name = null;
		this.type = null;
		this.init = null;
	}
}

export class StructureDefinition extends Expression {
	constructor() {
		super();

		this.locals = [];
	}
}

export class Literal extends Expression {
	static LITERAL_STRING = 0;
	static LITERAL_INTEGER = 1;
	static LITERAL_NUMBER = 2;

	constructor(literal, type) {
		super();
		
		this.type = type;
		this.literal = literal;
	}
}

export class ExpressionOperator extends Expression {
	constructor(precedence) {
		super();

		this.precedence = precedence;
		this.closed = false;
	}
}

export class BinnaryOperator extends ExpressionOperator {
	constructor(precedence) {
		super(precedence);

		this.left_expression = null;
		this.right_expression = null;
		this.operator_signal = null;
	}
}

export class UnaryTenaryOperator extends ExpressionOperator {
	constructor(precedence) {
		super(precedence);

		this.expression = null;
		this.tenary = false;
		this.operator_signal = null;
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




