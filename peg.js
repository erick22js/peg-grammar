
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

const peg_grammar = {
	"Grammar": {type: PET_MATCH, exp:
		{type: PET_AND, exps:[
			{type: PET_RULE, name:"Spacing"},
			{type: PET_ONEMORE, exp:
				{type: PET_RULE, name:"Definition"},
			},
			{type: PET_RULE, name:"EndOfFile"},
		]},
	},
	
	"Definition": {type: PET_MATCH, exp:
			{type: PET_AND, exps:[
				{type: PET_RULE, name:"Identifier"},
				{type: PET_RULE, name:"Attrib"},
				{type: PET_RULE, name:"Expression"},
		]},
	},
	
	"Expression": {type: PET_MATCH, exp:
		{type: PET_AND, exps:[
			{type: PET_RULE, name:"Sequence"},
			{type: PET_ZEROMORE, exp:
				{type: PET_AND, exps:[
					{type: PET_RULE, name:"Pipe"},
					{type: PET_RULE, name:"Sequence"},
				]},
			},
		]},
	},
	
	"Sequence": {type: PET_MATCH, exp:
		{type: PET_ONEMORE, exp:
			{type: PET_RULE, name:"Prefix"},
		},
	},
	
	"Prefix": {type: PET_MATCH, exp:
		{type: PET_AND, exps:[
			{type: PET_OPTIONAL, exp:
				{type: PET_OR, exps:[
					{type: PET_RULE, name:"And"},
					{type: PET_RULE, name:"Not"},
				]}
			},
			{type: PET_RULE, name:"Suffix"},
		]},
	},
	
	"Suffix": {type: PET_MATCH, exp:
		{type: PET_AND, exps:[
			{type: PET_RULE, name:"Primary"},
			{type: PET_OPTIONAL, exp:
				{type: PET_OR, exps:[
					{type: PET_RULE, name:"Question"},
					{type: PET_RULE, name:"Star"},
					{type: PET_RULE, name:"Plus"},
				]},
			},
		]},
	},
	
	"Primary": {type: PET_MATCH, exp:
		{type: PET_OR, exps:[
			{type: PET_AND, exps:[
				{type: PET_RULE, name:"Identifier"},
				{type: PET_NOT, exp:
					{type: PET_RULE, name:"Attrib"},
				},
			]},
			{type: PET_AND, exps:[
				{type: PET_RULE, name:"Open"},
				{type: PET_RULE, name:"Expression"},
				{type: PET_RULE, name:"Close"},
			]},
			{type: PET_RULE, name:"Literal"},
			{type: PET_RULE, name:"Class"},
			{type: PET_RULE, name:"Dot"},
		]},
	},
	
	"Identifier": {type: PET_MATCH, exp:
		{type: PET_AND, exps:[
			{type: PET_RULE, name:"IdentStart"},
			{type: PET_ZEROMORE, exp:
				{type: PET_RULE, name:"IdentCont"},
			},
			{type: PET_RULE, name:"Spacing"},
		]},
	},
	
	"IdentStart": {type: PET_MATCH, exp:
		{type: PET_CLASS, classes:[
			{type: PCT_RANGE, range:['a', 'z']},
			{type: PCT_RANGE, range:['A', 'Z']},
			{type: PCT_CHAR, chr:'_'},
		]}, ommits:true
	},
	
	"IdentCont": {type: PET_MATCH, exp:
		{type: PET_OR, exps:[
			{type: PET_RULE, name:"IdentStart"},
			{type: PET_CLASS, classes:[
				{type: PCT_RANGE, range:['0', '9']},
			]},
		]}, ommits:true
	},
	
	"Literal": {type: PET_MATCH, exp:
			{type: PET_OR, exps:[
			{type: PET_AND, exps:[
				{type: PET_CLASS, classes:[
					{type: PCT_CHAR, chr:'\''},
				]},
				{type: PET_ONEMORE, exp:
					{type: PET_AND, exps:[
						{type: PET_NOT, exp:
							{type: PET_CLASS, classes:[
								{type: PCT_CHAR, chr:'\''},
							]}
						},
						{type: PET_RULE, name: "Char"},
					]},
				},
				{type: PET_CLASS, classes:[
					{type: PCT_CHAR, chr:'\''},
				]},
				{type: PET_RULE, name:"Spacing"},
			]},
			{type: PET_AND, exps:[
				{type: PET_CLASS, classes:[
					{type: PCT_CHAR, chr:'\"'},
				]},
				{type: PET_ONEMORE, exp:
					{type: PET_AND, exps:[
						{type: PET_NOT, exp:
							{type: PET_CLASS, classes:[
								{type: PCT_CHAR, chr:'\"'},
							]}
						},
						{type: PET_RULE, name: "Char"},
					]},
				},
				{type: PET_CLASS, classes:[
					{type: PCT_CHAR, chr:'\"'},
				]},
				{type: PET_RULE, name:"Spacing"},
			]},
		]},
	},
	
	"Class": {type: PET_AND, exps:[
		{type: PET_LITERAL, value:"["},
		{type: PET_ZEROMORE, exp:
			{type: PET_AND, exps:[
				{type: PET_NOT, exp:
					{type: PET_LITERAL, value:"]"},
				},
				{type: PET_RULE, name:"Range"},
			]}
		},
		{type: PET_LITERAL, value:"]"},
		{type: PET_RULE, name:"Spacing"},
	]},
	
	"Range": {type: PET_OR, exps:[
		{type: PET_AND, exps:[
			{type: PET_RULE, name:"Char"},
			{type: PET_LITERAL, value:"-"},
			{type: PET_RULE, name:"Char"},
		]},
		{type: PET_RULE, name:"Char"},
	]},
	
	"Char": {type: PET_OR, exps:[
		{type: PET_AND, exps:[
			{type: PET_LITERAL, value:"\\"},
			{type: PET_CLASS, classes:[
				{type: PCT_CHAR, chr:"n"},
				{type: PCT_CHAR, chr:"r"},
				{type: PCT_CHAR, chr:"t"},
				{type: PCT_CHAR, chr:"'"},
				{type: PCT_CHAR, chr:"\""},
				{type: PCT_CHAR, chr:"["},
				{type: PCT_CHAR, chr:"]"},
				{type: PCT_CHAR, chr:"\\"},
			]},
		]},
		{type: PET_AND, exps:[
			{type: PET_LITERAL, value:"\\"},
			{type: PET_CLASS, classes:[
				{type: PCT_RANGE, range:['0', '2']},
			]},
			{type: PET_CLASS, classes:[
				{type: PCT_RANGE, range:['0', '7']},
			]},
			{type: PET_CLASS, classes:[
				{type: PCT_RANGE, range:['0', '7']},
			]},
		]},
		{type: PET_AND, exps:[
			{type: PET_LITERAL, value:"\\"},
			{type: PET_CLASS, classes:[
				{type: PCT_RANGE, range:['0', '7']},
			]},
			{type: PET_OPTIONAL, exp:
				{type: PET_CLASS, classes:[
					{type: PCT_RANGE, range:['0', '7']},
				]},
			},
		]},
		{type: PET_AND, exps:[
			{type: PET_NOT, exp:
				{type: PET_LITERAL, value:"\\"},
			},
			{type: PET_ANY},
		]},
	]},
	
	"Attrib": {type: PET_AND, exps:[
		{type: PET_OR, exps: [
			{type: PET_LITERAL, value:"="},
			{type: PET_LITERAL, value:"::"},
		]},
		{type: PET_RULE, name:"Spacing"},
	]},
	
	"Pipe": {type: PET_AND, exps:[
		{type: PET_LITERAL, value:"|"},
		{type: PET_RULE, name:"Spacing"},
	], ommits:true},
	
	"And": {type: PET_AND, exps:[
		{type: PET_LITERAL, value:"&"},
		{type: PET_RULE, name:"Spacing"},
	]},
	
	"Not": {type: PET_AND, exps:[
		{type: PET_LITERAL, value:"!"},
		{type: PET_RULE, name:"Spacing"},
	]},
	
	"Question": {type: PET_AND, exps:[
		{type: PET_LITERAL, value:"?"},
		{type: PET_RULE, name:"Spacing"},
	]},
	
	"Star": {type: PET_AND, exps:[
		{type: PET_LITERAL, value:"*"},
		{type: PET_RULE, name:"Spacing"},
	]},
	
	"Plus": {type: PET_AND, exps:[
		{type: PET_LITERAL, value:"+"},
		{type: PET_RULE, name:"Spacing"},
	]},
	
	"Open": {type: PET_AND, exps:[
		{type: PET_LITERAL, value:"("},
		{type: PET_RULE, name:"Spacing"},
	], ommits:true},
	
	"Close": {type: PET_AND, exps:[
		{type: PET_LITERAL, value:")"},
		{type: PET_RULE, name:"Spacing"},
	], ommits:true},
	
	"Dot": {type: PET_AND, exps:[
		{type: PET_LITERAL, value:"."},
		{type: PET_RULE, name:"Spacing"},
	]},
	
	"Spacing": {type: PET_ZEROMORE, exp:
		{type: PET_OR, exps:[
			{type: PET_RULE, name:"Space"},
			{type: PET_RULE, name:"Comment"},
		]}, ommits:true
	},
	
	"Comment": {type: PET_AND, exps:[
		{type: PET_LITERAL, value:'#'},
		{type: PET_ZEROMORE, exp:
			{type: PET_AND, exps:[
				{type: PET_NOT, exp:
					{type: PET_RULE, name:"EndOfLine"},
				},
				{type: PET_ANY},
			]}
		},
		{type: PET_RULE, name:"EndOfLine"},
	], ommits:true},
	
	"Space": {type: PET_OR, exps:[
		{type: PET_LITERAL, value:" "},
		{type: PET_LITERAL, value:"\t"},
		{type: PET_RULE, name:"EndOfLine"},
	], ommits:true},
	
	"EndOfLine": {type: PET_OR, exps:[
		{type: PET_LITERAL, value:"\r\n"},
		{type: PET_LITERAL, value:"\n"},
		{type: PET_LITERAL, value:"\r"},
	], ommits:true},
	
	"EndOfFile": {type: PET_NOT, exp:
		{type: PET_ANY}, ommits:true
	},
};


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
		level++;
		
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
				Log("if char '"+chr+"' is not EOF, will be accepted");
				var match = chr==EOF?matchRes():matchRes(chr, 1, true);
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
					return match;
				}
				else{
					errors.push({
						"error": "ERROR",
						"index": ret,
						"line": lex.getLine(),
						"offset": lex.getOffset(),
						"rule": result.name,
						"level": level
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
		var match = parseExp(rexp, lex, result);
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
	}
	
	var res = createResult("Grammar");
	if(parseRule(grammar["Grammar"], lex, res).valid){
		return res;
	}
	else{
		return errors;
	}
}


