function o(r){if(!r)return"";if(Array.isArray(r)){let[t,n,i]=r;return`${t}-${String(n).padStart(2,"0")}-${String(i).padStart(2,"0")}`}return r.length>10?r.slice(0,10):r}export{o as a};
