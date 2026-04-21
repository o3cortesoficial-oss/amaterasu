/* ===== ANTI-CLONE PROTECTION SYSTEM ===== */
/* 8 unique obfuscated redirect traps — each uses a different detection/obfuscation method */
/* Authorized domain: casaedecoracao.online */

(function(){
  // ── Trap 1: Base64-encoded domain check ──
  var _0xd=atob('Y2FzYWVkZWNvcmFjYW8ub25saW5l');
  if(location.hostname.indexOf(_0xd)===-1&&location.hostname!=='localhost'&&location.hostname!=='127.0.0.1'){
    var _r=atob('aHR0cHM6Ly93d3cuY2FzYWVkZWNvcmFjYW8ub25saW5lLw==');
    location.replace(_r);
    return;
  }
})();

(function(){
  // ── Trap 2: Char code reconstruction ──
  var c=[99,97,115,97,101,100,101,99,111,114,97,99,97,111];
  var d='';for(var i=0;i<c.length;i++)d+=String.fromCharCode(c[i]);
  d+=String.fromCharCode(46,111,110,108,105,110,101);
  if(window.location.host.toLowerCase().indexOf(d)===-1&&!/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)){
    var u='';[104,116,116,112,115,58,47,47,119,119,119,46].forEach(function(x){u+=String.fromCharCode(x)});
    u+=d+'/';window.location.href=u;return;
  }
})();

(function(){
  // ── Trap 3: XOR cipher domain verification ──
  var k=0x5A;
  var e=[0x39,0x3B,0x29,0x3B,0x3F,0x3E,0x3F,0x39,0x35,0x28,0x3B,0x39,0x3B,0x35];
  var r='';for(var i=0;i<e.length;i++)r+=String.fromCharCode(e[i]^k);
  r+='.online';
  if(document.location.hostname.search(r)<0&&document.location.hostname!=='localhost'){
    document.location='https://www.'+r+'/';
  }
})();

(function(){
  // ── Trap 4: Reversed string domain check ──
  var s='enilno.oacarocededasac';
  var d=s.split('').reverse().join('');
  var h=self.location.hostname||'';
  if(h.indexOf(d)<0&&h!=='localhost'&&h!=='127.0.0.1'){
    self.location.assign('https://www.'+d+'/');
  }
})();

(function(){
  // ── Trap 5: Split-array reassembly ──
  var p1='casa',p2='edecor',p3='acao',p4='.online';
  var dm=p1+p2+p3+p4;
  var loc=(window['loc'+'ation']||{});
  var hn=loc.hostname||'';
  if(hn.toLowerCase().indexOf(dm)===-1&&hn!=='localhost'){
    loc.href='https://www.'+dm+'/';
  }
})();

(function(){
  // ── Trap 6: setTimeout-deferred verification ──
  var _t=setTimeout;
  _t(function(){
    var a='casaede';var b='coracao';var c='.online';
    var full=a+b+c;
    try{
      if((new URL(document.URL)).hostname.indexOf(full)===-1&&
         (new URL(document.URL)).hostname!=='localhost'){
        top.location.replace('https://www.'+full+'/');
      }
    }catch(e){}
  },100);
})();

(function(){
  // ── Trap 7: Regular expression pattern matching ──
  var pattern=/casaedecoracao\.online/i;
  var testStr=document.domain||window.location.hostname||'';
  if(!pattern.test(testStr)&&testStr!=='localhost'&&testStr!=='127.0.0.1'){
    try{
      var dest=String.fromCharCode(104)+String.fromCharCode(116)+String.fromCharCode(116)+
               String.fromCharCode(112)+String.fromCharCode(115)+':'+'/'+'/'+
               'www'+'.casaedecoracao.online/';
      window.open(dest,'_self');
    }catch(ex){}
  }
})();

(function(){
  // ── Trap 8: Interval-based persistent check ──
  var iv=setInterval(function(){
    var d=atob('Y2FzYWVkZWNvcmFjYW8ub25saW5l');
    if(location.hostname.indexOf(d)===-1&&
       location.hostname!=='localhost'&&
       location.hostname!=='127.0.0.1'){
      clearInterval(iv);
      location.replace(atob('aHR0cHM6Ly93d3cuY2FzYWVkZWNvcmFjYW8ub25saW5lLw=='));
    }
  },5000);
})();
