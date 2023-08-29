
function idt(size){var is=""; while(size){size--;is+=" "}; return is;}

function strinsert(str, chr, i){return str.slice(0, i)+chr+str.slice(i, str.length);}

function _arrstr(arr, ident, base){
	var ostr = idt(base)+"["+(ident==null?"":"\n");
	
	for(var i=0; i<arr.length; i++){
		var v = arr[i];
		
		if(v instanceof Array){
			str = _arrstr(v, ident, (ident==null?null:base+ident)).trim();
		}
		else if(v instanceof Object){
			str = _mapstr(v, ident, (ident==null?null:base+ident)).trim();
		}
		else if(typeof(v)=="string"){
			for(var si=0; si<v.length; si++){
				if(v.charAt(si)=="\""){
					console.log("a");
					v = strinsert(v, "\\", si);
					si++;
				}
			}
			str = "\""+v+"\"";
		}
		else if(typeof(v)=="number"){
			str = sym2name(v);
		}
		else{
			str += v;
		}
		
		ostr += idt(base+ident)+str+","+(ident==null?"":"\n");
	}
	
	ostr += idt(base)+"]";
	return ostr;
}

function _mapstr(map, ident, base){
	var ostr = idt(base)+"{"+(ident==null?"":"\n");
	
	for(var k in map){
		var v = map[k];
		var str = "";
		
		if(v instanceof Array){
			str = _arrstr(v, ident, (ident==null?null:base+ident)).trim();
		}
		else if(v instanceof Object){
			str = _mapstr(v, ident, (ident==null?null:base+ident)).trim();
		}
		else if(typeof(v)=="string"){
			for(var i=0; i<v.length; i++){
				if(v.charAt(i)=="\""){
					v = strinsert(v, "\\", i);
					i++;
				}
			}
			str = "\""+v+"\"";
		}
		else if(typeof(v)=="number"){
			str = sym2name(v);
		}
		else{
			str += v;
		}
		
		ostr += idt(base+ident)+"\""+k+"\": "+str+","+(ident==null?"":"\n");
	}
	
	ostr += idt(base)+"}";
	return ostr;
}

function jsonstr(map, ident){
	return _mapstr(map, ident, 0);
}

function parse(){
	txtOut.value = "";
	var g_ast;
	var grammar;
	var l_ast;
	
	try{
		// Decode grammar for syntax parsing
		g_ast = pegParse(peg_grammar, txtGrammar.value);
		grammar = pegGenerateGrammer(g_ast);
	}
	catch(error){
		txtOut.value = "Error in grammar definition: "+error;
		throw error;
	}
	
	// Decode the src in given syntax
	try{
		l_ast = pegParse(grammar, txtSrc.value);
		txtOut.value = JSON.stringify(l_ast, function(K, V){
			if(typeof(V)=="string"){
				if(V.length>128){
					return "---Too Long!---";
				}
			}
			return V;
		}, 2);
	}
	catch(error){
		txtOut.value = "Error in src: "+error;
	}
	/*
	var ast = pegParse(peg_grammar, txtGrammar.value);
	var grammar = pegGenerateGrammer(ast);*/
}
