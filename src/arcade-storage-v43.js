/* v43 저장 안전망. 정상본 백업과 손상 원본을 서로 다른 키에 보관한다.
 * 알 수 없는 버전은 읽기 전용으로 남겨 둔다. 통계와 진행 저장은 독립적이다. */
(function(global){
  'use strict';
  var states=Object.create(null);
  function object(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}
  function state(key){return states[key]||(states[key]={ok:true,recovered:false,reset:false,blocked:false});}
  function parse(text,spec){
    if(text===null)return {kind:'missing'};
    try{
      var v=JSON.parse(text);
      if(object(v)&&v[spec.versionKey]!==undefined&&v[spec.versionKey]!==spec.version)return {kind:'version'};
      var clean=spec.validate(v);return clean===null?{kind:'invalid'}:{kind:'valid',value:clean};
    }catch(e){return {kind:'invalid'};}
  }
  function preserve(key,text){
    if(text===null)return;
    // 원문을 자르거나 덮어 지우지 않는다. 보관할 수 없으면 새 저장도 보류한다.
    if(global.localStorage.getItem(key+'.invalid')!==text)global.localStorage.setItem(key+'.invalid',text);
  }
  function read(key,spec,fallback){
    var st=state(key),text,primary,backup;
    try{
      text=global.localStorage.getItem(key);primary=parse(text,spec);
      if(primary.kind==='valid')return primary.value;
      backup=parse(global.localStorage.getItem(key+'.backup'),spec);
      if(primary.kind==='version'||backup.kind==='version'){st.blocked=true;st.ok=false;}
      else if(primary.kind==='invalid'){try{preserve(key,text);}catch(e){st.ok=false;}}
      if(backup.kind==='valid'){st.recovered=true;return backup.value;}
      if(primary.kind==='invalid')st.reset=true;
    }catch(e){st.ok=false;}
    return fallback;
  }
  function write(key,value,spec){
    var st=state(key);if(st.blocked)return false;
    try{
      var clean=spec.validate(value);if(clean===null){st.ok=false;return false;}
      var text=global.localStorage.getItem(key),prior=parse(text,spec),backText=global.localStorage.getItem(key+'.backup'),back=parse(backText,spec);
      if(prior.kind==='version'||back.kind==='version'){st.blocked=true;st.ok=false;return false;}
      if(prior.kind==='invalid')preserve(key,text);
      if(back.kind==='invalid')preserve(key+'.backup',backText);
      var encoded=JSON.stringify(clean),backup=prior.kind==='valid'?JSON.stringify(prior.value):back.kind==='valid'?JSON.stringify(back.value):encoded;
      global.localStorage.setItem(key+'.backup',backup);
      global.localStorage.setItem(key,encoded);st.ok=true;return true;
    }catch(e){st.ok=false;return false;}
  }
  function remove(key,spec){
    var st=state(key);if(st.blocked)return false;
    try{
      if(spec&&(parse(global.localStorage.getItem(key),spec).kind==='version'||parse(global.localStorage.getItem(key+'.backup'),spec).kind==='version')){st.blocked=true;st.ok=false;return false;}
      global.localStorage.removeItem(key+'.backup');global.localStorage.removeItem(key);st.ok=true;return true;}catch(e){st.ok=false;return false;}
  }
  function status(){
    var out={ok:true,recovered:false,reset:false,blocked:false};Object.keys(states).forEach(function(k){var s=states[k];out.ok=out.ok&&s.ok;out.recovered=out.recovered||s.recovered;out.blocked=out.blocked||s.blocked;out.reset=out.reset||s.reset;});return out;
  }
  global.HapilSave={read:read,write:write,remove:remove,status:status};
})(typeof window!=='undefined'?window:globalThis);
