
/**
	
	THE SRC LEXER FOR PARSER
	
*/

const EOF = -1;

function Lexer(src){
	var self = this;
	
	var seek = 0;
	
	self._act = function(){
		if(seek<src.length){
			var chr = src.charAt(seek);
			return chr;
		}
		return EOF;
	}
	
	self.get = function(){
		if(seek<src.length){
			var chr = src.charAt(seek);
			seek++;
			return chr;
		}
		return EOF;
	}
	
	self.unget = function(){
		if(seek>0){
			seek--;
		}
	}
	
	self.eof = function(){
		return seek>=src.length;
	}
	
	self.seekSet = function(offset){
		seek = offset;
	}
	
	self.seekCur = function(offset){
		seek += offset;
	}
	
	self.seekEnd = function(offset){
		seek = src.length+offset;
	}
	
	self.tell = function(){
		return seek;
	}
	
	self.getLine = function(){
		var line = 1;
		
		for(var i=0; i<seek; i++){
			var chr = src.charAt(i);
			if(chr=="\n" || chr=="\r" || chr=="\r\n"){
				line++;
			}
		}
		return line;
	}
	
	self.getOffset = function(){
		var offset = 1;
		
		for(var i=0; i<seek; i++){
			var chr = src.charAt(i);
			offset++;
			if(chr=="\n" || chr=="\r" || chr=="\r\n"){
				offset = 1;
			}
		}
		return offset;
	}
}


/**
	
	THE PEG PARSER GRAMMAR
	
	# Defines a line commentary
	
	# Produces a expression rule
	<rule> = <expression>
	<terminal> :: <expression>
	# Terminal are ommitable rules in tree generation
	
	# The following are expressions components
	# from lowest to highest level
	
	 ' '  # primary # A literal string
	 " "  # primary # A literal string
	 [ ]  # primary # A character class
	  .   # primary # Any character
	 (e)  # primary # Expression grouping
	  e?  #  unary  # Can have or not (optional)
	  e*  #  unary  # Zero or more
	  e+  #  unary  # At least one or more
	  &e  #  unary  # Execute but do a backtrack, stores the failing status of expression
	  !e  #  unary  # Proceds only if the expression do not match
	e1 e2 # binary  # Sequence of match expressions
	e1|e2 # binary  # Sequence of alternative match expressions
	
*/

/*

	RULES DEFINITIONS:
	
	Rule := {
		name:Name,
		exp:Expression
	}
	
	Expression := {
		type:ExpType,
		type[PEGEXPT_LITERAL]{
			value:String
		}|
		type[PEGEXPT_RULE]{
			name:Name
		}|
		type[PEGEXPT_CLASS]{
			classes:Class[]
		}|
		type[PEGEXPT_OPTIONAL|PEGEXPT_ZEROMORE|
		     PEGEXPT_ONEMORE|PEGEXPT_MATCH|
		     PEGEXPT_NOT]{
			exp:Expression
		}|
		type[PEGEXPT_AND|PEGEXPT_OR]{
			exps:Expression[]
		}
	}
	
	Class := {
		type:ClassType,
		type[PEGCLST_CHAR]{
			chr:Character
		}|
		type[PEGCLST_RANGE]{
			range:Character[2]
		}
	}
	
	ExpType := {
		PET_LITERAL,
		PET_RULE,
		PET_CLASS,
		PET_ANY,
		PET_OPTIONAL,
		PET_ZEROMORE,
		PET_ONEMORE,
		PET_MATCH,
		PET_NOT,
		PET_AND,
		PET_OR
	}
	
	ClassType := {
		PEGCLST_CHAR,
		PEGCLST_RANGE
	}

*/

const PET_LITERAL = 0x1001;
const PET_RULE = 0x1002;
const PET_CLASS = 0x1003;
const PET_ANY = 0x1004;
const PET_OPTIONAL = 0x1005;
const PET_ZEROMORE = 0x1006;
const PET_ONEMORE = 0x1007;
const PET_MATCH = 0x1008;
const PET_NOT = 0x1009;
const PET_AND = 0x100A;
const PET_OR = 0x100B;

const PCT_CHAR = 0x2001;
const PCT_RANGE = 0x2002;


/*
	THE ACTUAL GRAMMAR FOR PEG
*/

const peg_grammar =
{"Grammar": {"type": PET_AND,"exps": [{"type": PET_RULE,"name": "Spacing",},{"type": PET_ONEMORE,"exp": {"type": PET_RULE,"name": "Definition",},},{"type": PET_RULE,"name": "EndOfFile",},],},"Definition": {"type": PET_AND,"exps": [{"type": PET_RULE,"name": "Identifier",},{"type": PET_RULE,"name": "ATTRIB",},{"type": PET_RULE,"name": "Expression",},],},"Expression": {"type": PET_AND,"exps": [{"type": PET_RULE,"name": "Sequence",},{"type": PET_ZEROMORE,"exp": {"type": PET_AND,"exps": [{"type": PET_RULE,"name": "PIPE",},{"type": PET_RULE,"name": "Sequence",},],},},],},"Sequence": {"type": PET_ONEMORE,"exp": {"type": PET_RULE,"name": "Prefix",},},"Prefix": {"type": PET_AND,"exps": [{"type": PET_OPTIONAL,"exp": {"type": PET_OR,"exps": [{"type": PET_RULE,"name": "AND",},{"type": PET_RULE,"name": "NOT",},],},},{"type": PET_RULE,"name": "Suffix",},],},"Suffix": {"type": PET_AND,"exps": [{"type": PET_RULE,"name": "Primary",},{"type": PET_OPTIONAL,"exp": {"type": PET_OR,"exps": [{"type": PET_RULE,"name": "QUESTION",},{"type": PET_RULE,"name": "STAR",},{"type": PET_RULE,"name": "PLUS",},],},},],},"Primary": {"type": PET_OR,"exps": [{"type": PET_AND,"exps": [{"type": PET_RULE,"name": "Identifier",},{"type": PET_NOT,"exp": {"type": PET_RULE,"name": "ATTRIB",},},],},{"type": PET_AND,"exps": [{"type": PET_RULE,"name": "OPEN",},{"type": PET_RULE,"name": "Expression",},{"type": PET_RULE,"name": "CLOSE",},],},{"type": PET_RULE,"name": "Literal",},{"type": PET_RULE,"name": "Class",},{"type": PET_RULE,"name": "DOT",},],},"Identifier": {"type": PET_AND,"exps": [{"type": PET_RULE,"name": "IdentStart",},{"type": PET_ZEROMORE,"exp": {"type": PET_RULE,"name": "IdentCont",},},{"type": PET_RULE,"name": "Spacing",},],},"IdentStart": {"type": PET_CLASS,"classes": [{"type": PCT_RANGE,"range": ["a","z",],},{"type": PCT_RANGE,"range": ["A","Z",],},{"type": PCT_CHAR,"chr": "_",},],"ommits": true,},"IdentCont": {"type": PET_OR,"exps": [{"type": PET_RULE,"name": "IdentStart",},{"type": PET_CLASS,"classes": [{"type": PCT_RANGE,"range": ["0","9",],},],},],"ommits": true,},"Literal": {"type": PET_OR,"exps": [{"type": PET_AND,"exps": [{"type": PET_CLASS,"classes": [{"type": PCT_CHAR,"chr": "'",},],},{"type": PET_ONEMORE,"exp": {"type": PET_AND,"exps": [{"type": PET_NOT,"exp": {"type": PET_CLASS,"classes": [{"type": PCT_CHAR,"chr": "'",},],},},{"type": PET_RULE,"name": "Char",},],},},{"type": PET_CLASS,"classes": [{"type": PCT_CHAR,"chr": "'",},],},{"type": PET_RULE,"name": "Spacing",},],},{"type": PET_AND,"exps": [{"type": PET_CLASS,"classes": [{"type": PCT_CHAR,"chr": "\"",},],},{"type": PET_ONEMORE,"exp": {"type": PET_AND,"exps": [{"type": PET_NOT,"exp": {"type": PET_CLASS,"classes": [{"type": PCT_CHAR,"chr": "\"",},],},},{"type": PET_RULE,"name": "Char",},],},},{"type": PET_CLASS,"classes": [{"type": PCT_CHAR,"chr": "\"",},],},{"type": PET_RULE,"name": "Spacing",},],},],},"Class": {"type": PET_AND,"exps": [{"type": PET_LITERAL,"value": "[",},{"type": PET_ZEROMORE,"exp": {"type": PET_AND,"exps": [{"type": PET_NOT,"exp": {"type": PET_LITERAL,"value": "]",},},{"type": PET_RULE,"name": "Range",},],},},{"type": PET_LITERAL,"value": "]",},{"type": PET_RULE,"name": "Spacing",},],},"Range": {"type": PET_OR,"exps": [{"type": PET_AND,"exps": [{"type": PET_RULE,"name": "Char",},{"type": PET_LITERAL,"value": "-",},{"type": PET_RULE,"name": "Char",},],},{"type": PET_RULE,"name": "Char",},],},"Char": {"type": PET_OR,"exps": [{"type": PET_AND,"exps": [{"type": PET_LITERAL,"value": "\\",},{"type": PET_CLASS,"classes": [{"type": PCT_CHAR,"chr": "n",},{"type": PCT_CHAR,"chr": "r",},{"type": PCT_CHAR,"chr": "t",},{"type": PCT_CHAR,"chr": "'",},{"type": PCT_CHAR,"chr": "\"",},{"type": PCT_CHAR,"chr": "\[",},{"type": PCT_CHAR,"chr": "\]",},{"type": PCT_CHAR,"chr": "\\",},],},],},{"type": PET_AND,"exps": [{"type": PET_LITERAL,"value": "\\",},{"type": PET_CLASS,"classes": [{"type": PCT_RANGE,"range": ["0","2",],},],},{"type": PET_CLASS,"classes": [{"type": PCT_RANGE,"range": ["0","7",],},],},{"type": PET_CLASS,"classes": [{"type": PCT_RANGE,"range": ["0","7",],},],},],},{"type": PET_AND,"exps": [{"type": PET_LITERAL,"value": "\\",},{"type": PET_CLASS,"classes": [{"type": PCT_RANGE,"range": ["0","7",],},],},{"type": PET_OPTIONAL,"exp": {"type": PET_CLASS,"classes": [{"type": PCT_RANGE,"range": ["0","7",],},],},},],},{"type": PET_AND,"exps": [{"type": PET_NOT,"exp": {"type": PET_LITERAL,"value": "\\",},},{"type": PET_ANY,},],},],},"ATTRIB": {"type": PET_AND,"exps": [{"type": PET_OR,"exps": [{"type": PET_LITERAL,"value": "=",},{"type": PET_LITERAL,"value": "::",},],},{"type": PET_RULE,"name": "Spacing",},],},"PIPE": {"type": PET_AND,"exps": [{"type": PET_LITERAL,"value": "|",},{"type": PET_RULE,"name": "Spacing",},],},"AND": {"type": PET_AND,"exps": [{"type": PET_LITERAL,"value": "&",},{"type": PET_RULE,"name": "Spacing",},],},"NOT": {"type": PET_AND,"exps": [{"type": PET_LITERAL,"value": "!",},{"type": PET_RULE,"name": "Spacing",},],},"QUESTION": {"type": PET_AND,"exps": [{"type": PET_LITERAL,"value": "?",},{"type": PET_RULE,"name": "Spacing",},],},"STAR": {"type": PET_AND,"exps": [{"type": PET_LITERAL,"value": "*",},{"type": PET_RULE,"name": "Spacing",},],},"PLUS": {"type": PET_AND,"exps": [{"type": PET_LITERAL,"value": "+",},{"type": PET_RULE,"name": "Spacing",},],},"OPEN": {"type": PET_AND,"exps": [{"type": PET_LITERAL,"value": "(",},{"type": PET_RULE,"name": "Spacing",},],"ommits": true,},"CLOSE": {"type": PET_AND,"exps": [{"type": PET_LITERAL,"value": ")",},{"type": PET_RULE,"name": "Spacing",},],"ommits": true,},"DOT": {"type": PET_AND,"exps": [{"type": PET_LITERAL,"value": ".",},{"type": PET_RULE,"name": "Spacing",},],},"Spacing": {"type": PET_ZEROMORE,"exp": {"type": PET_OR,"exps": [{"type": PET_RULE,"name": "Space",},{"type": PET_RULE,"name": "Comment",},],},"ommits": true,},"Comment": {"type": PET_AND,"exps": [{"type": PET_LITERAL,"value": "#",},{"type": PET_ZEROMORE,"exp": {"type": PET_AND,"exps": [{"type": PET_NOT,"exp": {"type": PET_RULE,"name": "EndOfLine",},},{"type": PET_ANY,},],},},{"type": PET_RULE,"name": "EndOfLine",},],"ommits": true,},"Space": {"type": PET_OR,"exps": [{"type": PET_LITERAL,"value": " ",},{"type": PET_LITERAL,"value": "\t",},{"type": PET_RULE,"name": "EndOfLine",},],"ommits": true,},"EndOfLine": {"type": PET_OR,"exps": [{"type": PET_LITERAL,"value": "\r\n",},{"type": PET_LITERAL,"value": "\n",},{"type": PET_LITERAL,"value": "\r",},],"ommits": true,},"EndOfFile": {"type": PET_NOT,"exp": {"type": PET_ANY,},"ommits": true,},}||
{"Grammar":{type:PET_AND,exps:[{type:PET_RULE,name:"Spacing"},{type:PET_ONEMORE,exp:{type:PET_RULE,name:"Definition"},},{type:PET_RULE,name:"EndOfFile"},]},"Definition":{type:PET_AND,exps:[{type:PET_RULE,name:"Identifier"},{type:PET_RULE,name:"ATTRIB"},{type:PET_RULE,name:"Expression"},]},"Expression":{type:PET_AND,exps:[{type:PET_RULE,name:"Sequence"},{type:PET_ZEROMORE,exp:{type:PET_AND,exps:[{type:PET_RULE,name:"PIPE"},{type:PET_RULE,name:"Sequence"},]},},]},"Sequence":{type:PET_ONEMORE,exp:{type:PET_RULE,name:"Prefix"},},"Prefix":{type:PET_AND,exps:[{type:PET_OPTIONAL,exp:{type:PET_OR,exps:[{type:PET_RULE,name:"AND"},{type:PET_RULE,name:"NOT"},]}},{type:PET_RULE,name:"Suffix"},]},"Suffix":{type:PET_AND,exps:[{type:PET_RULE,name:"Primary"},{type:PET_OPTIONAL,exp:{type:PET_OR,exps:[{type:PET_RULE,name:"QUESTION"},{type:PET_RULE,name:"STAR"},{type:PET_RULE,name:"PLUS"},]},},]},"Primary":{type:PET_OR,exps:[{type:PET_AND,exps:[{type:PET_RULE,name:"Identifier"},{type:PET_NOT,exp:{type:PET_RULE,name:"ATTRIB"},},]},{type:PET_AND,exps:[{type:PET_RULE,name:"OPEN"},{type:PET_RULE,name:"Expression"},{type:PET_RULE,name:"CLOSE"},]},{type:PET_RULE,name:"Literal"},{type:PET_RULE,name:"Class"},{type:PET_RULE,name:"DOT"},]},"Identifier":{type:PET_AND,exps:[{type:PET_RULE,name:"IdentStart"},{type:PET_ZEROMORE,exp:{type:PET_RULE,name:"IdentCont"},},{type:PET_RULE,name:"Spacing"},]},"IdentStart":{type:PET_CLASS,classes:[{type:PCT_RANGE,range:['a','z']},{type:PCT_RANGE,range:['A','Z']},{type:PCT_CHAR,chr:'_'},],ommits:true},"IdentCont":{type:PET_OR,exps:[{type:PET_RULE,name:"IdentStart"},{type:PET_CLASS,classes:[{type:PCT_RANGE,range:['0','9']},]},],ommits:true},"Literal":{type:PET_OR,exps:[{type:PET_AND,exps:[{type:PET_CLASS,classes:[{type:PCT_CHAR,chr:'\''},]},{type:PET_ONEMORE,exp:{type:PET_AND,exps:[{type:PET_NOT,exp:{type:PET_CLASS,classes:[{type:PCT_CHAR,chr:'\''},]}},{type:PET_RULE,name:"Char"},]},},{type:PET_CLASS,classes:[{type:PCT_CHAR,chr:'\''},]},{type:PET_RULE,name:"Spacing"},]},{type:PET_AND,exps:[{type:PET_CLASS,classes:[{type:PCT_CHAR,chr:'\"'},]},{type:PET_ONEMORE,exp:{type:PET_AND,exps:[{type:PET_NOT,exp:{type:PET_CLASS,classes:[{type:PCT_CHAR,chr:'\"'},]}},{type:PET_RULE,name:"Char"},]},},{type:PET_CLASS,classes:[{type:PCT_CHAR,chr:'\"'},]},{type:PET_RULE,name:"Spacing"},]},]},"Class":{type:PET_AND,exps:[{type:PET_LITERAL,value:"["},{type:PET_ZEROMORE,exp:{type:PET_AND,exps:[{type:PET_NOT,exp:{type:PET_LITERAL,value:"]"},},{type:PET_RULE,name:"Range"},]}},{type:PET_LITERAL,value:"]"},{type:PET_RULE,name:"Spacing"},]},"Range":{type:PET_OR,exps:[{type:PET_AND,exps:[{type:PET_RULE,name:"Char"},{type:PET_LITERAL,value:"-"},{type:PET_RULE,name:"Char"},]},{type:PET_RULE,name:"Char"},]},"Char":{type:PET_OR,exps:[{type:PET_AND,exps:[{type:PET_LITERAL,value:"\\"},{type:PET_CLASS,classes:[{type:PCT_CHAR,chr:"n"},{type:PCT_CHAR,chr:"r"},{type:PCT_CHAR,chr:"t"},{type:PCT_CHAR,chr:"'"},{type:PCT_CHAR,chr:"\""},{type:PCT_CHAR,chr:"["},{type:PCT_CHAR,chr:"]"},{type:PCT_CHAR,chr:"\\"},]},]},{type:PET_AND,exps:[{type:PET_LITERAL,value:"\\"},{type:PET_CLASS,classes:[{type:PCT_RANGE,range:['0','2']},]},{type:PET_CLASS,classes:[{type:PCT_RANGE,range:['0','7']},]},{type:PET_CLASS,classes:[{type:PCT_RANGE,range:['0','7']},]},]},{type:PET_AND,exps:[{type:PET_LITERAL,value:"\\"},{type:PET_CLASS,classes:[{type:PCT_RANGE,range:['0','7']},]},{type:PET_OPTIONAL,exp:{type:PET_CLASS,classes:[{type:PCT_RANGE,range:['0','7']},]},},]},{type:PET_AND,exps:[{type:PET_NOT,exp:{type:PET_LITERAL,value:"\\"},},{type:PET_ANY},]},]},"ATTRIB":{type:PET_AND,exps:[{type:PET_OR,exps:[{type:PET_LITERAL,value:"="},{type:PET_LITERAL,value:"::"},]},{type:PET_RULE,name:"Spacing"},]},"PIPE":{type:PET_AND,exps:[{type:PET_LITERAL,value:"|"},{type:PET_RULE,name:"Spacing"},]},"AND":{type:PET_AND,exps:[{type:PET_LITERAL,value:"&"},{type:PET_RULE,name:"Spacing"},]},"NOT":{type:PET_AND,exps:[{type:PET_LITERAL,value:"!"},{type:PET_RULE,name:"Spacing"},]},"QUESTION":{type:PET_AND,exps:[{type:PET_LITERAL,value:"?"},{type:PET_RULE,name:"Spacing"},]},"STAR":{type:PET_AND,exps:[{type:PET_LITERAL,value:"*"},{type:PET_RULE,name:"Spacing"},]},"PLUS":{type:PET_AND,exps:[{type:PET_LITERAL,value:"+"},{type:PET_RULE,name:"Spacing"},]},"OPEN":{type:PET_AND,exps:[{type:PET_LITERAL,value:"("},{type:PET_RULE,name:"Spacing"},],ommits:true},"CLOSE":{type:PET_AND,exps:[{type:PET_LITERAL,value:")"},{type:PET_RULE,name:"Spacing"},],ommits:true},"DOT":{type:PET_AND,exps:[{type:PET_LITERAL,value:"."},{type:PET_RULE,name:"Spacing"},]},"Spacing":{type:PET_ZEROMORE,exp:{type:PET_OR,exps:[{type:PET_RULE,name:"Space"},{type:PET_RULE,name:"Comment"},]},ommits:true},"Comment":{type:PET_AND,exps:[{type:PET_LITERAL,value:'#'},{type:PET_ZEROMORE,exp:{type:PET_AND,exps:[{type:PET_NOT,exp:{type:PET_RULE,name:"EndOfLine"},},{type:PET_ANY},]}},{type:PET_RULE,name:"EndOfLine"},],ommits:true},"Space":{type:PET_OR,exps:[{type:PET_LITERAL,value:" "},{type:PET_LITERAL,value:"\t"},{type:PET_RULE,name:"EndOfLine"},],ommits:true},"EndOfLine":{type:PET_OR,exps:[{type:PET_LITERAL,value:"\r\n"},{type:PET_LITERAL,value:"\n"},{type:PET_LITERAL,value:"\r"},],ommits:true},"EndOfFile":{type:PET_NOT,exp:{type:PET_ANY},ommits:true},};

const peg_grammar_src = `
# Hierarchical syntax
Grammar = Spacing Definition+ EndOfFile
Definition = Identifier ATTRIB Expression

Expression = Sequence (PIPE Sequence)*
Sequence = Prefix+
Prefix = (AND | NOT)? Suffix
Suffix = Primary (QUESTION | STAR | PLUS)?
Primary = Identifier !ATTRIB | OPEN Expression CLOSE | Literal | Class | DOT

# Lexical syntax
Identifier = IdentStart IdentCont* Spacing
IdentStart :: [a-zA-Z_]
IdentCont :: IdentStart | [0-9]

Literal = ['] (![']Char)+ ['] Spacing | ["] (!["]Char)+ ["] Spacing
Class = '[' (!']' Range)* ']' Spacing
Range = Char '-' Char | Char
Char = '\\' [nrt'"\[\]\\] | '\\' [0-2][0-7][0-7] | '\\' [0-7][0-7]? | !'\\' .

ATTRIB = ('=' | '::') Spacing
PIPE = '|' Spacing
AND = '&' Spacing
NOT = '!' Spacing
QUESTION = '?' Spacing
STAR = '*' Spacing
PLUS = '+' Spacing
OPEN :: '(' Spacing
CLOSE :: ')' Spacing
DOT = '.' Spacing

Spacing :: (Space | Comment)*
Comment :: '#' (!EndOfLine .)* EndOfLine
Space :: ' ' | '\t' | EndOfLine
EndOfLine :: '\r\n' | '\n' | '\r'
EndOfFile :: !.
`;

/*

	Algorithm
	
	- The parser beggining entry is from rule "Grammar";
		* Enter the rule
	
	@ On enter the rule
	- Gets the expression of current rule
		* Process the actual expression
	
	@ For each within expression
	- Save the actual pointer of stack
	- Test the retrieved characters to actual type
		For each value
		* If points to other expression, process it
		* If points to other rule, test the other rule too
		* If points to class, test it
	- If do not match (or receives FALSE), returns FALSE, and restores the pointer
	- Else, returns TRUE
		
	
*/

function sym2name(code){
	switch(code){
		case PET_LITERAL:return "PET_LITERAL";
		case PET_RULE:return "PET_RULE";
		case PET_CLASS:return "PET_CLASS";
		case PET_ANY:return "PET_ANY";
		case PET_OPTIONAL:return "PET_OPTIONAL";
		case PET_ZEROMORE:return "PET_ZEROMORE";
		case PET_ONEMORE:return "PET_ONEMORE";
		case PET_MATCH:return "PET_MATCH";
		case PET_NOT:return "PET_NOT";
		case PET_AND:return "PET_AND";
		case PET_OR:return "PET_OR";
		case PCT_CHAR:return "PCT_CHAR";
		case PCT_RANGE:return "PCT_RANGE";
	}
}

var logi = 0;
function Log(msg){
	if((typeof msg)=="object"){
		msg = JSON.stringify(msg, function(k, v){
			if(typeof v === "number"){
				return sym2name(v);
			}
			else{
				return v;
			}
		}, 2);
	}
	//txtOut.value = txtOut.value+msg+"\n";
	//console.log(msg);
	logi++;
}


var bar = 1024;

function pegParse(grammar, src){
	var errors = [];
	var level = 0;
	var lex = new Lexer(src);
	
	/**
		MATCH OBJECT
	*/
	
	function matchRes(str="", count=0, valid=false){
		// str = the string match (retrieved)
		// count = the ammount of matches (ammount)
		// valid = has occured a match (true or false)
		return {"str":str, "count":count, "valid":valid};
	}
	
	function createResult(name=null){
		return {"name":name, "match":"", "items":[]};
	}
	function joinResult(base, adder){
		base.match += adder.match;
		base.items = base.items.concat(adder.items);
		//base.error_trace = base.error_trace.concat(adder.error_trace);
	}
	
	function removeOverLevelFunctions(){
		/*while(errors.length && errors[errors.length-1].level>level){
			errors.shift();
		}*/
		for(var i=0; i<errors.length; i++){
			if(errors[i].level>level){
				errors.splice(1);
				i--;
			}
		}
	}
	
	/**
		PARSING FUNCTIONS
	*/
	
	function parseClass(clss, lex){
		var type = clss.type;
		var chr = lex.get();
		if(chr==EOF){
			Log("End of File!");
		}
		
		Log("matching char '"+chr+"' with class");
		if(type==PCT_CHAR){
			var chr_class = clss.chr;
			Log("matching with char '"+chr_class+"'");
			if(chr_class==chr){
				Log("they MATCH :-).");
				return chr;
			}
			Log("they NOT match :-(.");
			return null;
		}
		else{
			var range_class = clss.range;
			Log("matching with range '"+range_class[0]+"' to '"+range_class[1]+"'");
			if(chr>=range_class[0] && chr<=range_class[1]){
				Log("they MATCH :-).");
				return chr;
			}
			Log("they NOT match :-(.");
			return null;
		}
	}
	
	function parseExp_(exp, lex, result){
		var ret = lex.tell();
		
		switch(exp.type){
			case PET_LITERAL:{
				var literal = exp.value;
				
				var fetched = "";
				for(var i=0; (i<literal.length && !lex.eof()) || i==0; i++){
					fetched += lex.get();
				}
				
				Log("matching fetched \""+fetched+"\" with literal \""+literal+"\".");
				
				if(literal==fetched){
					Log("they are EQUAL :-).");
					return matchRes(fetched, 1, true);
				}
				else{
					Log("they are NOT equal :-(.");
					return matchRes();
				}
			}
			break;
			case PET_RULE:{
				var name = exp.name;
				var rule = grammar[name];
				
				var inresult = createResult(name);
				
				var match = matchRes();
				if(!(match = parseRule(rule, lex, inresult)).valid){
					Log("I wont add a NOT matched Rule :-(");
					return matchRes();
				}
				
				errors = [];
				result["match"] += match.str;
				if(!rule.ommits){
					Log("With pleasure I will add this matched rule :-)");
					result["items"].push(inresult);
				}
				else{
					Log("I think this rule was ommited :-|");
				}
				return match;
			}
			break;
			case PET_CLASS:{
				var classes = exp.classes;
				
				var match = matchRes();
				for(var i=0; i<classes.length; i++){
					var clss = classes[i];
					lex.seekSet(ret);
					
					if((match.str = parseClass(clss, lex, result))!=null){
						match.count = 1;
						match.valid = true;
						return match;
					}
				}
				
				return match;
			}
			break;
			case PET_ANY:{
				var chr = lex.get();
				var match = matchRes();
				if(chr==EOF){
					Log("Char is NOT ANY Character :-(");
					return match;
				}
				Log("Char '"+chr+"' IS ANY Character, will be accepted :-)");
				match = matchRes(chr, 1, true);
				return match;
			}
			break;
			case PET_OPTIONAL:{
				var inexp = exp.exp;
				
				var match = matchRes();
				var inresult = createResult();
				if((match = parseExp(inexp, lex, inresult)).valid){
					ret = lex.tell();
					joinResult(result, inresult);
					Log("the optional WAS suplied");
				}
				else{
					match.str = "";
					match.count = 0;
					match.valid = true;
					Log("the optional was NOT suplied");
				}
				lex.seekSet(ret);
				
				errors = [];
				return match;
			}
			break;
			case PET_ZEROMORE:{
				var inexp = exp.exp;
				
				var matches = matchRes("", 0, true);
				var match = matchRes();
				var inresult = createResult();
				var sinresult = createResult();
				while((match = parseExp(inexp, lex, sinresult)).valid && match.count){
					ret = lex.tell();
					joinResult(inresult, sinresult);
					sinresult = createResult();
					matches.str += match.str;
					matches.count++;
				}
				lex.seekSet(ret);
				joinResult(result, inresult);
				errors = [];
				Log("a total of "+matches.count+" match(es)");
				return matches;
			}
			break;
			case PET_ONEMORE:{
				var inexp = exp.exp;
				
				var matches = matchRes();
				var match = matchRes();
				var inresult = createResult();
				var sinresult = createResult();
				while((match = parseExp(inexp, lex, sinresult)).valid){
					ret = lex.tell();
					joinResult(inresult, sinresult);
					sinresult = createResult();
					matches.str += match.str;
					matches.valid = true;
					matches.count++;
				}
				lex.seekSet(ret);
				
				Log("a total of "+matches.count+" match(es)");
				if(matches.count>0){
					Log("above zero :-)");
					joinResult(result, inresult);
					return matches;
				}
				else{
					Log("cannot be zero :-(");
					return matchRes();
				}
			}
			break;
			case PET_MATCH:{
				var inexp = exp.exp;
				var match = matchRes();
				var inresult = createResult();
				if((match = parseExp(inexp, lex, inresult)).valid){
					joinResult(result, inresult);
					errors = [];
					return match;
				}
				else{
					errors.push({
						"error": "ERROR",
						"index": ret,
						"line": lex.getLine(),
						"offset": lex.getOffset(),
						//"rule": result.name,
						//"level": level
					});
					return matchRes();
				}
			}
			break;
			case PET_NOT:{
				var inexp = exp.exp;
				
				var match = matchRes();
				var inresult = createResult();
				if(!(match = parseExp(inexp, lex, inresult)).valid){
					lex.seekSet(ret);
					Log("the expression gived do not match...ACCEPTED :-)");
					errors = [];
					return matchRes("", 0, true);
				}
				Log("no no no NO! The given expression must NOT be valid :-(");
				return matchRes();
			}
			break;
			case PET_AND:{
				var exps = exp.exps;
				
				var matches = matchRes();
				var match = matchRes();
				var inresult = createResult();
				for(var i=0; i<exps.length; i++){
					var inexp = exps[i];
					
					var sinresult = createResult();
					if(!(match = parseExp(inexp, lex, sinresult)).valid){
						Log("The previous expression did not matched :-(");
						lex.seekSet(ret);
						return matchRes();
					}
					joinResult(inresult, sinresult);
					matches.str += match.str;
					matches.count++;
					matches.valid = true;
				}
				
				Log("All expressions Match :-)");
				errors = [];
				joinResult(result, inresult);
				return matches;
			}
			break;
			case PET_OR:{
				var exps = exp.exps;
				
				var match = matchRes();
				for(var i=0; i<exps.length; i++){
					lex.seekSet(ret);
					var inexp = exps[i];
					
					var inresult = createResult();
					if((match = parseExp(inexp, lex, inresult)).valid){
						Log("At least one expression matched :-)");
						errors = [];
						joinResult(result, inresult);
						return match;
					}
				}
				
				Log("No one expression matched :-(");
				return matchRes();
			}
			break;
			default:{
				Log("WTF are the program in HERE?!?");
			}
		}
	}
	
	function parseExp(exp, lex, result){
		Log("\n\nBEGIN # Type: "+sym2name(exp.type));
		level++;
		var match = parseExp_(exp, lex, result);
		level--;
		if(match.valid){
			Log("ExpMatch: \""+match.str+"\"");
		}
		else{
			Log("ExpMatch: NULL");
		}
		Log({type: exp.type});
		Log("END # Type: "+sym2name(exp.type)+"\n\n");
		return match;
	}
	
	function parseRule(rule, lex, result){
		// Getting the higher expression of the rule
		Log("@@@ RULE: "+rule.gn);
		var rexp = rule;
		var match = null;
		var do_parse = true;
		for(var i=rule._seeks.length-1; i>=0; i--){
			if(rule._seeks[i]==lex.tell()){
				match = matchRes();
				result = createResult();
				do_parse = false;
				break;
			}
		}
		if(do_parse){
			rule._seeks.push(lex.tell());
			match = parseExp(rexp, lex, result);
			rule._seeks.pop();
		}
		else{
			throw "Cyclic reference";
		}
		
		if(match.valid){
			Log("RuleMatch: \""+match.str+"\"");
		}
		else{
			Log("RuleMatch: NULL");
		}
		Log("## Terminating rule \""+rule.gn+"\"");
		result["match"] = match.str;
		return match;
	}
	
	/**
		INITIALIZES THE PARSER
	*/
	
	for(var i in grammar){
		grammar[i].gn = i;
		grammar[i]._seeks = [];
	}
	
	var res = createResult("Grammar");
	if(parseRule(grammar["Grammar"], lex, res).valid){
		return res;
	}
	else{
		throw JSON.stringify(errors, null, 2);
		return errors[0];
	}
}


function pegGenerateGrammer(ast){
	var grammar = {};
	
	/* Utilities */
	function extractIdentifier(str){
		var ident = "";
		
		for(var i=0; i<str.length; i++){
			var chr = str.charAt(i);
			if((chr>='a'&&chr<='z')||(chr>='A'&&chr<='Z')||chr=='_'){
				ident += chr;
			}
			else{
				break;
			}
		}
		return ident;
	}
	
	/* Save all rules names */
	var edefs = ast.items;
	for(var i=0; i<edefs.length; i++){
		var name = extractIdentifier(edefs[i].items[0].match);
		grammar[name] = {};
	}
	
	/* Define the rules expressions */
	function decExpression(ast_exp){
		var seqs = [];
		
		for(var i=0; i<ast_exp.items.length; i+=2){
			var seq = decSequence(ast_exp.items[i]);
			seqs.push(seq);
		}
		
		if(seqs.length>1){
			var exp = {
				type: PET_OR,
				exps: seqs
			};
			return exp;
		}
		else{
			return seqs[0];
		}
	}
	function decSequence(ast_seq){
		var pres = [];
		
		for(var i=0; i<ast_seq.items.length; i++){
			var pre = decPrefix(ast_seq.items[i]);
			pres.push(pre);
		}
		
		if(pres.length>1){
			var seq = {
				type: PET_AND,
				exps: pres
			};
			return seq;
		}
		else{
			return pres[0];
		}
	}
	function decPrefix(ast_pre){
		var pref = ast_pre.items.length==1?null:ast_pre.items[0];
		var sfx = decSufix(ast_pre.items[ast_pre.items.length==1?0:1]);
		
		var pre = {
			type: pref?(pref.name=="NOT"?PET_NOT:PET_MATCH):null,
			exp: sfx
		};
		return pref?pre:sfx;
	}
	function decSufix(ast_sfx){
		var pri = decPrimary(ast_sfx.items[0]);
		var sfix = ast_sfx.items.length>1?ast_sfx.items[1]:null;
		
		var sfx = {
			type: sfix?(sfix.name=="QUESTION"?PET_OPTIONAL:sfix.name=="STAR"?PET_ZEROMORE:PET_ONEMORE):null,
			exp: pri
		};
		return sfix?sfx:pri;
	}
	function evalStr(str){
		return eval("\""+str+"\"");
	}
	function evalChar(chr){
		if(chr.length>1){
			return eval("\""+chr+"\"");
		}
		else{
			return chr;
		}
	}
	function decPrimary(ast_pri){
		var ast_obj = ast_pri.items[0];
		
		switch(ast_obj.name){
			case "Expression":{
				return decExpression(ast_obj);
			}
			break;
			case "Identifier":{
				var ident = extractIdentifier(ast_obj.match);
				if(grammar[ident]!=undefined){
					return {
						type: PET_RULE,
						name: ident
					};
				}
				else{
					throw Error("Rule with name "+ident+" is not defined!");
				}
			}
			break;
			case "Literal":{
				var lit = "";
				for(var i=1; i<ast_obj.match.length; i++){
					var chr = ast_obj.match.charAt(i);
					if(chr==ast_obj.match.charAt(0)){
						break;
					}
					lit += chr;
				}
				
				return {
					type: PET_LITERAL,
					value: evalStr(lit)
				};
			}
			break;
			case "Class":{
				var clses = [];
				
				for(var i=0; i<ast_obj.items.length; i++){
					var cl = ast_obj.items[i];
					if(cl.items.length>1){
						clses.push({
							type: PCT_RANGE,
							range: [evalChar(cl.items[0].match), evalChar(cl.items[1].match)]});
					}
					else{
						clses.push({
							type: PCT_CHAR,
							chr: evalChar(cl.items[0].match)});
					}
				}
				
				var clss = {
					type: PET_CLASS,
					classes: clses
				};
				return clss;
			}
			break;
			case "DOT":{
				return {
					type: PET_ANY
				};
			}
			break;
			default:{
				console.log("WTF?!?");
			}
		}
	}
	for(var i=0; i<edefs.length; i++){
		var name = extractIdentifier(edefs[i].items[0].match);
		var ast_exp = edefs[i].items[2];
		grammar[name] = decExpression(ast_exp);
		if(edefs[i].items[1].match.startsWith("::")){
			grammar[name].ommits = true;
		}
	}
	
	return grammar;
}

