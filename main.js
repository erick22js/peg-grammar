
function parse(){
	txtOut.value = "";
	txtOut.value = JSON.stringify(pegParse(peg_grammar, txtSrc.value), null, 2);
}