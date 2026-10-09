import{Ja as gt,Ka as ie,La as oe,Ta as se,V as vt,W as ae,Xc as me,Z as $,cc as yt,dc as de,fc as tt,gc as S,ha as ne,lb as le,pb as fe,qb as ue,ua as re,yb as ce}from"./chunk-K2GWFZSN.js";import{a as te,b as ee}from"./chunk-P7HBC3MT.js";function Ct(t,a){(a==null||a>t.length)&&(a=t.length);for(var e=0,n=Array(a);e<a;e++)n[e]=t[e];return n}function an(t){if(Array.isArray(t))return t}function nn(t){if(Array.isArray(t))return Ct(t)}function rn(t,a){if(!(t instanceof a))throw new TypeError("Cannot call a class as a function")}function he(t,a){for(var e=0;e<a.length;e++){var n=a[e];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,Ge(n.key),n)}}function on(t,a,e){return a&&he(t.prototype,a),e&&he(t,e),Object.defineProperty(t,"prototype",{writable:!1}),t}function nt(t,a){var e=typeof Symbol<"u"&&t[Symbol.iterator]||t["@@iterator"];if(!e){if(Array.isArray(t)||(e=Wt(t))||a&&t&&typeof t.length=="number"){e&&(t=e);var n=0,r=function(){};return{s:r,n:function(){return n>=t.length?{done:!0}:{done:!1,value:t[n++]}},e:function(l){throw l},f:r}}throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}var i,o=!0,s=!1;return{s:function(){e=e.call(t)},n:function(){var l=e.next();return o=l.done,l},e:function(l){s=!0,i=l},f:function(){try{o||e.return==null||e.return()}finally{if(s)throw i}}}}function h(t,a,e){return(a=Ge(a))in t?Object.defineProperty(t,a,{value:e,enumerable:!0,configurable:!0,writable:!0}):t[a]=e,t}function sn(t){if(typeof Symbol<"u"&&t[Symbol.iterator]!=null||t["@@iterator"]!=null)return Array.from(t)}function ln(t,a){var e=t==null?null:typeof Symbol<"u"&&t[Symbol.iterator]||t["@@iterator"];if(e!=null){var n,r,i,o,s=[],l=!0,u=!1;try{if(i=(e=e.call(t)).next,a===0){if(Object(e)!==e)return;l=!1}else for(;!(l=(n=i.call(e)).done)&&(s.push(n.value),s.length!==a);l=!0);}catch(d){u=!0,r=d}finally{try{if(!l&&e.return!=null&&(o=e.return(),Object(o)!==o))return}finally{if(u)throw r}}return s}}function fn(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function un(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function pe(t,a){var e=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);a&&(n=n.filter(function(r){return Object.getOwnPropertyDescriptor(t,r).enumerable})),e.push.apply(e,n)}return e}function f(t){for(var a=1;a<arguments.length;a++){var e=arguments[a]!=null?arguments[a]:{};a%2?pe(Object(e),!0).forEach(function(n){h(t,n,e[n])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(e)):pe(Object(e)).forEach(function(n){Object.defineProperty(t,n,Object.getOwnPropertyDescriptor(e,n))})}return t}function ft(t,a){return an(t)||ln(t,a)||Wt(t,a)||fn()}function F(t){return nn(t)||sn(t)||Wt(t)||un()}function cn(t,a){if(typeof t!="object"||!t)return t;var e=t[Symbol.toPrimitive];if(e!==void 0){var n=e.call(t,a||"default");if(typeof n!="object")return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return(a==="string"?String:Number)(t)}function Ge(t){var a=cn(t,"string");return typeof a=="symbol"?a:a+""}function ot(t){"@babel/helpers - typeof";return ot=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(a){return typeof a}:function(a){return a&&typeof Symbol=="function"&&a.constructor===Symbol&&a!==Symbol.prototype?"symbol":typeof a},ot(t)}function Wt(t,a){if(t){if(typeof t=="string")return Ct(t,a);var e={}.toString.call(t).slice(8,-1);return e==="Object"&&t.constructor&&(e=t.constructor.name),e==="Map"||e==="Set"?Array.from(t):e==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e)?Ct(t,a):void 0}}var ve=function(){},Ht={},Ve={},Xe=null,Ke={mark:ve,measure:ve};try{typeof window<"u"&&(Ht=window),typeof document<"u"&&(Ve=document),typeof MutationObserver<"u"&&(Xe=MutationObserver),typeof performance<"u"&&(Ke=performance)}catch{}var dn=Ht.navigator||{},ge=dn.userAgent,ye=ge===void 0?"":ge,M=Ht,g=Ve,be=Xe,et=Ke,jo=!!M.document,j=!!g.documentElement&&!!g.head&&typeof g.addEventListener=="function"&&typeof g.createElement=="function",Je=~ye.indexOf("MSIE")||~ye.indexOf("Trident/"),bt,mn=/fa(k|kd|s|r|l|t|d|dr|dl|dt|b|slr|slpr|wsb|tl|ns|nds|es|gt|jr|jfr|jdr|usb|ufsb|udsb|cr|ss|sr|sl|st|sds|sdr|sdl|sdt)?[\-\ ]/,hn=/Font ?Awesome ?([567 ]*)(Solid|Regular|Light|Thin|Duotone|Brands|Free|Pro|Sharp Duotone|Sharp|Kit|Notdog Duo|Notdog|Chisel|Etch|Graphite|Thumbprint|Jelly Fill|Jelly Duo|Jelly|Utility|Utility Fill|Utility Duo|Slab Press|Slab|Whiteboard)?.*/i,qe={classic:{fa:"solid",fas:"solid","fa-solid":"solid",far:"regular","fa-regular":"regular",fal:"light","fa-light":"light",fat:"thin","fa-thin":"thin",fab:"brands","fa-brands":"brands"},duotone:{fa:"solid",fad:"solid","fa-solid":"solid","fa-duotone":"solid",fadr:"regular","fa-regular":"regular",fadl:"light","fa-light":"light",fadt:"thin","fa-thin":"thin"},sharp:{fa:"solid",fass:"solid","fa-solid":"solid",fasr:"regular","fa-regular":"regular",fasl:"light","fa-light":"light",fast:"thin","fa-thin":"thin"},"sharp-duotone":{fa:"solid",fasds:"solid","fa-solid":"solid",fasdr:"regular","fa-regular":"regular",fasdl:"light","fa-light":"light",fasdt:"thin","fa-thin":"thin"},slab:{"fa-regular":"regular",faslr:"regular"},"slab-press":{"fa-regular":"regular",faslpr:"regular"},thumbprint:{"fa-light":"light",fatl:"light"},whiteboard:{"fa-semibold":"semibold",fawsb:"semibold"},notdog:{"fa-solid":"solid",fans:"solid"},"notdog-duo":{"fa-solid":"solid",fands:"solid"},etch:{"fa-solid":"solid",faes:"solid"},graphite:{"fa-thin":"thin",fagt:"thin"},jelly:{"fa-regular":"regular",fajr:"regular"},"jelly-fill":{"fa-regular":"regular",fajfr:"regular"},"jelly-duo":{"fa-regular":"regular",fajdr:"regular"},chisel:{"fa-regular":"regular",facr:"regular"},utility:{"fa-semibold":"semibold",fausb:"semibold"},"utility-duo":{"fa-semibold":"semibold",faudsb:"semibold"},"utility-fill":{"fa-semibold":"semibold",faufsb:"semibold"}},pn={GROUP:"duotone-group",SWAP_OPACITY:"swap-opacity",PRIMARY:"primary",SECONDARY:"secondary"},Qe=["fa-classic","fa-duotone","fa-sharp","fa-sharp-duotone","fa-thumbprint","fa-whiteboard","fa-notdog","fa-notdog-duo","fa-chisel","fa-etch","fa-graphite","fa-jelly","fa-jelly-fill","fa-jelly-duo","fa-slab","fa-slab-press","fa-utility","fa-utility-duo","fa-utility-fill"],w="classic",q="duotone",Ze="sharp",ta="sharp-duotone",ea="chisel",aa="etch",na="graphite",ra="jelly",ia="jelly-duo",oa="jelly-fill",sa="notdog",la="notdog-duo",fa="slab",ua="slab-press",ca="thumbprint",da="utility",ma="utility-duo",ha="utility-fill",pa="whiteboard",vn="Classic",gn="Duotone",yn="Sharp",bn="Sharp Duotone",xn="Chisel",wn="Etch",kn="Graphite",Sn="Jelly",An="Jelly Duo",In="Jelly Fill",Cn="Notdog",Pn="Notdog Duo",Fn="Slab",En="Slab Press",On="Thumbprint",Nn="Utility",Tn="Utility Duo",jn="Utility Fill",Dn="Whiteboard",va=[w,q,Ze,ta,ea,aa,na,ra,ia,oa,sa,la,fa,ua,ca,da,ma,ha,pa],Do=(bt={},h(h(h(h(h(h(h(h(h(h(bt,w,vn),q,gn),Ze,yn),ta,bn),ea,xn),aa,wn),na,kn),ra,Sn),ia,An),oa,In),h(h(h(h(h(h(h(h(h(bt,sa,Cn),la,Pn),fa,Fn),ua,En),ca,On),da,Nn),ma,Tn),ha,jn),pa,Dn)),Mn={classic:{900:"fas",400:"far",normal:"far",300:"fal",100:"fat"},duotone:{900:"fad",400:"fadr",300:"fadl",100:"fadt"},sharp:{900:"fass",400:"fasr",300:"fasl",100:"fast"},"sharp-duotone":{900:"fasds",400:"fasdr",300:"fasdl",100:"fasdt"},slab:{400:"faslr"},"slab-press":{400:"faslpr"},whiteboard:{600:"fawsb"},thumbprint:{300:"fatl"},notdog:{900:"fans"},"notdog-duo":{900:"fands"},etch:{900:"faes"},graphite:{100:"fagt"},chisel:{400:"facr"},jelly:{400:"fajr"},"jelly-fill":{400:"fajfr"},"jelly-duo":{400:"fajdr"},utility:{600:"fausb"},"utility-duo":{600:"faudsb"},"utility-fill":{600:"faufsb"}},_n={"Font Awesome 7 Free":{900:"fas",400:"far"},"Font Awesome 7 Pro":{900:"fas",400:"far",normal:"far",300:"fal",100:"fat"},"Font Awesome 7 Brands":{400:"fab",normal:"fab"},"Font Awesome 7 Duotone":{900:"fad",400:"fadr",normal:"fadr",300:"fadl",100:"fadt"},"Font Awesome 7 Sharp":{900:"fass",400:"fasr",normal:"fasr",300:"fasl",100:"fast"},"Font Awesome 7 Sharp Duotone":{900:"fasds",400:"fasdr",normal:"fasdr",300:"fasdl",100:"fasdt"},"Font Awesome 7 Jelly":{400:"fajr",normal:"fajr"},"Font Awesome 7 Jelly Fill":{400:"fajfr",normal:"fajfr"},"Font Awesome 7 Jelly Duo":{400:"fajdr",normal:"fajdr"},"Font Awesome 7 Slab":{400:"faslr",normal:"faslr"},"Font Awesome 7 Slab Press":{400:"faslpr",normal:"faslpr"},"Font Awesome 7 Thumbprint":{300:"fatl",normal:"fatl"},"Font Awesome 7 Notdog":{900:"fans",normal:"fans"},"Font Awesome 7 Notdog Duo":{900:"fands",normal:"fands"},"Font Awesome 7 Etch":{900:"faes",normal:"faes"},"Font Awesome 7 Graphite":{100:"fagt",normal:"fagt"},"Font Awesome 7 Chisel":{400:"facr",normal:"facr"},"Font Awesome 7 Whiteboard":{600:"fawsb",normal:"fawsb"},"Font Awesome 7 Utility":{600:"fausb",normal:"fausb"},"Font Awesome 7 Utility Duo":{600:"faudsb",normal:"faudsb"},"Font Awesome 7 Utility Fill":{600:"faufsb",normal:"faufsb"}},zn=new Map([["classic",{defaultShortPrefixId:"fas",defaultStyleId:"solid",styleIds:["solid","regular","light","thin","brands"],futureStyleIds:[],defaultFontWeight:900}],["duotone",{defaultShortPrefixId:"fad",defaultStyleId:"solid",styleIds:["solid","regular","light","thin"],futureStyleIds:[],defaultFontWeight:900}],["sharp",{defaultShortPrefixId:"fass",defaultStyleId:"solid",styleIds:["solid","regular","light","thin"],futureStyleIds:[],defaultFontWeight:900}],["sharp-duotone",{defaultShortPrefixId:"fasds",defaultStyleId:"solid",styleIds:["solid","regular","light","thin"],futureStyleIds:[],defaultFontWeight:900}],["chisel",{defaultShortPrefixId:"facr",defaultStyleId:"regular",styleIds:["regular"],futureStyleIds:[],defaultFontWeight:400}],["etch",{defaultShortPrefixId:"faes",defaultStyleId:"solid",styleIds:["solid"],futureStyleIds:[],defaultFontWeight:900}],["graphite",{defaultShortPrefixId:"fagt",defaultStyleId:"thin",styleIds:["thin"],futureStyleIds:[],defaultFontWeight:100}],["jelly",{defaultShortPrefixId:"fajr",defaultStyleId:"regular",styleIds:["regular"],futureStyleIds:[],defaultFontWeight:400}],["jelly-duo",{defaultShortPrefixId:"fajdr",defaultStyleId:"regular",styleIds:["regular"],futureStyleIds:[],defaultFontWeight:400}],["jelly-fill",{defaultShortPrefixId:"fajfr",defaultStyleId:"regular",styleIds:["regular"],futureStyleIds:[],defaultFontWeight:400}],["notdog",{defaultShortPrefixId:"fans",defaultStyleId:"solid",styleIds:["solid"],futureStyleIds:[],defaultFontWeight:900}],["notdog-duo",{defaultShortPrefixId:"fands",defaultStyleId:"solid",styleIds:["solid"],futureStyleIds:[],defaultFontWeight:900}],["slab",{defaultShortPrefixId:"faslr",defaultStyleId:"regular",styleIds:["regular"],futureStyleIds:[],defaultFontWeight:400}],["slab-press",{defaultShortPrefixId:"faslpr",defaultStyleId:"regular",styleIds:["regular"],futureStyleIds:[],defaultFontWeight:400}],["thumbprint",{defaultShortPrefixId:"fatl",defaultStyleId:"light",styleIds:["light"],futureStyleIds:[],defaultFontWeight:300}],["utility",{defaultShortPrefixId:"fausb",defaultStyleId:"semibold",styleIds:["semibold"],futureStyleIds:[],defaultFontWeight:600}],["utility-duo",{defaultShortPrefixId:"faudsb",defaultStyleId:"semibold",styleIds:["semibold"],futureStyleIds:[],defaultFontWeight:600}],["utility-fill",{defaultShortPrefixId:"faufsb",defaultStyleId:"semibold",styleIds:["semibold"],futureStyleIds:[],defaultFontWeight:600}],["whiteboard",{defaultShortPrefixId:"fawsb",defaultStyleId:"semibold",styleIds:["semibold"],futureStyleIds:[],defaultFontWeight:600}]]),$n={chisel:{regular:"facr"},classic:{brands:"fab",light:"fal",regular:"far",solid:"fas",thin:"fat"},duotone:{light:"fadl",regular:"fadr",solid:"fad",thin:"fadt"},etch:{solid:"faes"},graphite:{thin:"fagt"},jelly:{regular:"fajr"},"jelly-duo":{regular:"fajdr"},"jelly-fill":{regular:"fajfr"},notdog:{solid:"fans"},"notdog-duo":{solid:"fands"},sharp:{light:"fasl",regular:"fasr",solid:"fass",thin:"fast"},"sharp-duotone":{light:"fasdl",regular:"fasdr",solid:"fasds",thin:"fasdt"},slab:{regular:"faslr"},"slab-press":{regular:"faslpr"},thumbprint:{light:"fatl"},utility:{semibold:"fausb"},"utility-duo":{semibold:"faudsb"},"utility-fill":{semibold:"faufsb"},whiteboard:{semibold:"fawsb"}},ga=["fak","fa-kit","fakd","fa-kit-duotone"],xe={kit:{fak:"kit","fa-kit":"kit"},"kit-duotone":{fakd:"kit-duotone","fa-kit-duotone":"kit-duotone"}},Ln=["kit"],Rn="kit",Wn="kit-duotone",Hn="Kit",Un="Kit Duotone",Mo=h(h({},Rn,Hn),Wn,Un),Yn={kit:{"fa-kit":"fak"},"kit-duotone":{"fa-kit-duotone":"fakd"}},Bn={"Font Awesome Kit":{400:"fak",normal:"fak"},"Font Awesome Kit Duotone":{400:"fakd",normal:"fakd"}},Gn={kit:{fak:"fa-kit"},"kit-duotone":{fakd:"fa-kit-duotone"}},we={kit:{kit:"fak"},"kit-duotone":{"kit-duotone":"fakd"}},xt,at={GROUP:"duotone-group",SWAP_OPACITY:"swap-opacity",PRIMARY:"primary",SECONDARY:"secondary"},Vn=["fa-classic","fa-duotone","fa-sharp","fa-sharp-duotone","fa-thumbprint","fa-whiteboard","fa-notdog","fa-notdog-duo","fa-chisel","fa-etch","fa-graphite","fa-jelly","fa-jelly-fill","fa-jelly-duo","fa-slab","fa-slab-press","fa-utility","fa-utility-duo","fa-utility-fill"],Xn="classic",Kn="duotone",Jn="sharp",qn="sharp-duotone",Qn="chisel",Zn="etch",tr="graphite",er="jelly",ar="jelly-duo",nr="jelly-fill",rr="notdog",ir="notdog-duo",or="slab",sr="slab-press",lr="thumbprint",fr="utility",ur="utility-duo",cr="utility-fill",dr="whiteboard",mr="Classic",hr="Duotone",pr="Sharp",vr="Sharp Duotone",gr="Chisel",yr="Etch",br="Graphite",xr="Jelly",wr="Jelly Duo",kr="Jelly Fill",Sr="Notdog",Ar="Notdog Duo",Ir="Slab",Cr="Slab Press",Pr="Thumbprint",Fr="Utility",Er="Utility Duo",Or="Utility Fill",Nr="Whiteboard",_o=(xt={},h(h(h(h(h(h(h(h(h(h(xt,Xn,mr),Kn,hr),Jn,pr),qn,vr),Qn,gr),Zn,yr),tr,br),er,xr),ar,wr),nr,kr),h(h(h(h(h(h(h(h(h(xt,rr,Sr),ir,Ar),or,Ir),sr,Cr),lr,Pr),fr,Fr),ur,Er),cr,Or),dr,Nr)),Tr="kit",jr="kit-duotone",Dr="Kit",Mr="Kit Duotone",zo=h(h({},Tr,Dr),jr,Mr),_r={classic:{"fa-brands":"fab","fa-duotone":"fad","fa-light":"fal","fa-regular":"far","fa-solid":"fas","fa-thin":"fat"},duotone:{"fa-regular":"fadr","fa-light":"fadl","fa-thin":"fadt"},sharp:{"fa-solid":"fass","fa-regular":"fasr","fa-light":"fasl","fa-thin":"fast"},"sharp-duotone":{"fa-solid":"fasds","fa-regular":"fasdr","fa-light":"fasdl","fa-thin":"fasdt"},slab:{"fa-regular":"faslr"},"slab-press":{"fa-regular":"faslpr"},whiteboard:{"fa-semibold":"fawsb"},thumbprint:{"fa-light":"fatl"},notdog:{"fa-solid":"fans"},"notdog-duo":{"fa-solid":"fands"},etch:{"fa-solid":"faes"},graphite:{"fa-thin":"fagt"},jelly:{"fa-regular":"fajr"},"jelly-fill":{"fa-regular":"fajfr"},"jelly-duo":{"fa-regular":"fajdr"},chisel:{"fa-regular":"facr"},utility:{"fa-semibold":"fausb"},"utility-duo":{"fa-semibold":"faudsb"},"utility-fill":{"fa-semibold":"faufsb"}},zr={classic:["fas","far","fal","fat","fad"],duotone:["fadr","fadl","fadt"],sharp:["fass","fasr","fasl","fast"],"sharp-duotone":["fasds","fasdr","fasdl","fasdt"],slab:["faslr"],"slab-press":["faslpr"],whiteboard:["fawsb"],thumbprint:["fatl"],notdog:["fans"],"notdog-duo":["fands"],etch:["faes"],graphite:["fagt"],jelly:["fajr"],"jelly-fill":["fajfr"],"jelly-duo":["fajdr"],chisel:["facr"],utility:["fausb"],"utility-duo":["faudsb"],"utility-fill":["faufsb"]},Pt={classic:{fab:"fa-brands",fad:"fa-duotone",fal:"fa-light",far:"fa-regular",fas:"fa-solid",fat:"fa-thin"},duotone:{fadr:"fa-regular",fadl:"fa-light",fadt:"fa-thin"},sharp:{fass:"fa-solid",fasr:"fa-regular",fasl:"fa-light",fast:"fa-thin"},"sharp-duotone":{fasds:"fa-solid",fasdr:"fa-regular",fasdl:"fa-light",fasdt:"fa-thin"},slab:{faslr:"fa-regular"},"slab-press":{faslpr:"fa-regular"},whiteboard:{fawsb:"fa-semibold"},thumbprint:{fatl:"fa-light"},notdog:{fans:"fa-solid"},"notdog-duo":{fands:"fa-solid"},etch:{faes:"fa-solid"},graphite:{fagt:"fa-thin"},jelly:{fajr:"fa-regular"},"jelly-fill":{fajfr:"fa-regular"},"jelly-duo":{fajdr:"fa-regular"},chisel:{facr:"fa-regular"},utility:{fausb:"fa-semibold"},"utility-duo":{faudsb:"fa-semibold"},"utility-fill":{faufsb:"fa-semibold"}},$r=["fa-solid","fa-regular","fa-light","fa-thin","fa-duotone","fa-brands","fa-semibold"],ya=["fa","fas","far","fal","fat","fad","fadr","fadl","fadt","fab","fass","fasr","fasl","fast","fasds","fasdr","fasdl","fasdt","faslr","faslpr","fawsb","fatl","fans","fands","faes","fagt","fajr","fajfr","fajdr","facr","fausb","faudsb","faufsb"].concat(Vn,$r),Lr=["solid","regular","light","thin","duotone","brands","semibold"],ba=[1,2,3,4,5,6,7,8,9,10],Rr=ba.concat([11,12,13,14,15,16,17,18,19,20]),Wr=["aw","fw","pull-left","pull-right"],Hr=[].concat(F(Object.keys(zr)),Lr,Wr,["2xs","xs","sm","lg","xl","2xl","beat","border","fade","beat-fade","bounce","flip-both","flip-horizontal","flip-vertical","flip","inverse","layers","layers-bottom-left","layers-bottom-right","layers-counter","layers-text","layers-top-left","layers-top-right","li","pull-end","pull-start","pulse","rotate-180","rotate-270","rotate-90","rotate-by","shake","spin-pulse","spin-reverse","spin","stack-1x","stack-2x","stack","ul","width-auto","width-fixed",at.GROUP,at.SWAP_OPACITY,at.PRIMARY,at.SECONDARY]).concat(ba.map(function(t){return"".concat(t,"x")})).concat(Rr.map(function(t){return"w-".concat(t)})),Ur={"Font Awesome 5 Free":{900:"fas",400:"far"},"Font Awesome 5 Pro":{900:"fas",400:"far",normal:"far",300:"fal"},"Font Awesome 5 Brands":{400:"fab",normal:"fab"},"Font Awesome 5 Duotone":{900:"fad"}},N="___FONT_AWESOME___",Ft=16,xa="fa",wa="svg-inline--fa",R="data-fa-i2svg",Et="data-fa-pseudo-element",Yr="data-fa-pseudo-element-pending",Ut="data-prefix",Yt="data-icon",ke="fontawesome-i2svg",Br="async",Gr=["HTML","HEAD","STYLE","SCRIPT"],ka=["::before","::after",":before",":after"],Sa=(function(){try{return!0}catch{return!1}})();function Q(t){return new Proxy(t,{get:function(e,n){return n in e?e[n]:e[w]}})}var Aa=f({},qe);Aa[w]=f(f(f(f({},{"fa-duotone":"duotone"}),qe[w]),xe.kit),xe["kit-duotone"]);var Vr=Q(Aa),Ot=f({},$n);Ot[w]=f(f(f(f({},{duotone:"fad"}),Ot[w]),we.kit),we["kit-duotone"]);var Se=Q(Ot),Nt=f({},Pt);Nt[w]=f(f({},Nt[w]),Gn.kit);var Bt=Q(Nt),Tt=f({},_r);Tt[w]=f(f({},Tt[w]),Yn.kit);var $o=Q(Tt),Xr=mn,Ia="fa-layers-text",Kr=hn,Jr=f({},Mn),Lo=Q(Jr),qr=["class","data-prefix","data-icon","data-fa-transform","data-fa-mask"],wt=pn,Qr=[].concat(F(Ln),F(Hr)),X=M.FontAwesomeConfig||{};function Zr(t){var a=g.querySelector("script["+t+"]");if(a)return a.getAttribute(t)}function ti(t){return t===""?!0:t==="false"?!1:t==="true"?!0:t}g&&typeof g.querySelector=="function"&&(Ae=[["data-family-prefix","familyPrefix"],["data-css-prefix","cssPrefix"],["data-family-default","familyDefault"],["data-style-default","styleDefault"],["data-replacement-class","replacementClass"],["data-auto-replace-svg","autoReplaceSvg"],["data-auto-add-css","autoAddCss"],["data-search-pseudo-elements","searchPseudoElements"],["data-search-pseudo-elements-warnings","searchPseudoElementsWarnings"],["data-search-pseudo-elements-full-scan","searchPseudoElementsFullScan"],["data-observe-mutations","observeMutations"],["data-mutate-approach","mutateApproach"],["data-keep-original-source","keepOriginalSource"],["data-measure-performance","measurePerformance"],["data-show-missing-icons","showMissingIcons"]],Ae.forEach(function(t){var a=ft(t,2),e=a[0],n=a[1],r=ti(Zr(e));r!=null&&(X[n]=r)}));var Ae,Ca={styleDefault:"solid",familyDefault:w,cssPrefix:xa,replacementClass:wa,autoReplaceSvg:!0,autoAddCss:!0,searchPseudoElements:!1,searchPseudoElementsWarnings:!0,searchPseudoElementsFullScan:!1,observeMutations:!0,mutateApproach:"async",keepOriginalSource:!0,measurePerformance:!1,showMissingIcons:!0};X.familyPrefix&&(X.cssPrefix=X.familyPrefix);var B=f(f({},Ca),X);B.autoReplaceSvg||(B.observeMutations=!1);var m={};Object.keys(Ca).forEach(function(t){Object.defineProperty(m,t,{enumerable:!0,set:function(e){B[t]=e,K.forEach(function(n){return n(m)})},get:function(){return B[t]}})});Object.defineProperty(m,"familyPrefix",{enumerable:!0,set:function(a){B.cssPrefix=a,K.forEach(function(e){return e(m)})},get:function(){return B.cssPrefix}});M.FontAwesomeConfig=m;var K=[];function ei(t){return K.push(t),function(){K.splice(K.indexOf(t),1)}}var D=Ft,E={size:16,x:0,y:0,rotate:0,flipX:!1,flipY:!1};function ai(t){if(!(!t||!j)){var a=g.createElement("style");a.setAttribute("type","text/css"),a.innerHTML=t;for(var e=g.head.childNodes,n=null,r=e.length-1;r>-1;r--){var i=e[r],o=(i.tagName||"").toUpperCase();["STYLE","LINK"].indexOf(o)>-1&&(n=i)}return g.head.insertBefore(a,n),t}}var ni="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";function Ie(){for(var t=12,a="";t-- >0;)a+=ni[Math.random()*62|0];return a}function G(t){for(var a=[],e=(t||[]).length>>>0;e--;)a[e]=t[e];return a}function Gt(t){return t.classList?G(t.classList):(t.getAttribute("class")||"").split(" ").filter(function(a){return a})}function Pa(t){return"".concat(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function ri(t){return Object.keys(t||{}).reduce(function(a,e){return a+"".concat(e,'="').concat(Pa(t[e]),'" ')},"").trim()}function ut(t){return Object.keys(t||{}).reduce(function(a,e){return a+"".concat(e,": ").concat(t[e].trim(),";")},"")}function Vt(t){return t.size!==E.size||t.x!==E.x||t.y!==E.y||t.rotate!==E.rotate||t.flipX||t.flipY}function ii(t){var a=t.transform,e=t.containerWidth,n=t.iconWidth,r={transform:"translate(".concat(e/2," 256)")},i="translate(".concat(a.x*32,", ").concat(a.y*32,") "),o="scale(".concat(a.size/16*(a.flipX?-1:1),", ").concat(a.size/16*(a.flipY?-1:1),") "),s="rotate(".concat(a.rotate," 0 0)"),l={transform:"".concat(i," ").concat(o," ").concat(s)},u={transform:"translate(".concat(n/2*-1," -256)")};return{outer:r,inner:l,path:u}}function oi(t){var a=t.transform,e=t.width,n=e===void 0?Ft:e,r=t.height,i=r===void 0?Ft:r,o=t.startCentered,s=o===void 0?!1:o,l="";return s&&Je?l+="translate(".concat(a.x/D-n/2,"em, ").concat(a.y/D-i/2,"em) "):s?l+="translate(calc(-50% + ".concat(a.x/D,"em), calc(-50% + ").concat(a.y/D,"em)) "):l+="translate(".concat(a.x/D,"em, ").concat(a.y/D,"em) "),l+="scale(".concat(a.size/D*(a.flipX?-1:1),", ").concat(a.size/D*(a.flipY?-1:1),") "),l+="rotate(".concat(a.rotate,"deg) "),l}var si=`:root, :host {
  --fa-font-solid: normal 900 1em/1 'Font Awesome 7 Free';
  --fa-font-regular: normal 400 1em/1 'Font Awesome 7 Free';
  --fa-font-light: normal 300 1em/1 'Font Awesome 7 Pro';
  --fa-font-thin: normal 100 1em/1 'Font Awesome 7 Pro';
  --fa-font-duotone: normal 900 1em/1 'Font Awesome 7 Duotone';
  --fa-font-duotone-regular: normal 400 1em/1 'Font Awesome 7 Duotone';
  --fa-font-duotone-light: normal 300 1em/1 'Font Awesome 7 Duotone';
  --fa-font-duotone-thin: normal 100 1em/1 'Font Awesome 7 Duotone';
  --fa-font-brands: normal 400 1em/1 'Font Awesome 7 Brands';
  --fa-font-sharp-solid: normal 900 1em/1 'Font Awesome 7 Sharp';
  --fa-font-sharp-regular: normal 400 1em/1 'Font Awesome 7 Sharp';
  --fa-font-sharp-light: normal 300 1em/1 'Font Awesome 7 Sharp';
  --fa-font-sharp-thin: normal 100 1em/1 'Font Awesome 7 Sharp';
  --fa-font-sharp-duotone-solid: normal 900 1em/1 'Font Awesome 7 Sharp Duotone';
  --fa-font-sharp-duotone-regular: normal 400 1em/1 'Font Awesome 7 Sharp Duotone';
  --fa-font-sharp-duotone-light: normal 300 1em/1 'Font Awesome 7 Sharp Duotone';
  --fa-font-sharp-duotone-thin: normal 100 1em/1 'Font Awesome 7 Sharp Duotone';
  --fa-font-slab-regular: normal 400 1em/1 'Font Awesome 7 Slab';
  --fa-font-slab-press-regular: normal 400 1em/1 'Font Awesome 7 Slab Press';
  --fa-font-whiteboard-semibold: normal 600 1em/1 'Font Awesome 7 Whiteboard';
  --fa-font-thumbprint-light: normal 300 1em/1 'Font Awesome 7 Thumbprint';
  --fa-font-notdog-solid: normal 900 1em/1 'Font Awesome 7 Notdog';
  --fa-font-notdog-duo-solid: normal 900 1em/1 'Font Awesome 7 Notdog Duo';
  --fa-font-etch-solid: normal 900 1em/1 'Font Awesome 7 Etch';
  --fa-font-graphite-thin: normal 100 1em/1 'Font Awesome 7 Graphite';
  --fa-font-jelly-regular: normal 400 1em/1 'Font Awesome 7 Jelly';
  --fa-font-jelly-fill-regular: normal 400 1em/1 'Font Awesome 7 Jelly Fill';
  --fa-font-jelly-duo-regular: normal 400 1em/1 'Font Awesome 7 Jelly Duo';
  --fa-font-chisel-regular: normal 400 1em/1 'Font Awesome 7 Chisel';
  --fa-font-utility-semibold: normal 600 1em/1 'Font Awesome 7 Utility';
  --fa-font-utility-duo-semibold: normal 600 1em/1 'Font Awesome 7 Utility Duo';
  --fa-font-utility-fill-semibold: normal 600 1em/1 'Font Awesome 7 Utility Fill';
}

.svg-inline--fa {
  box-sizing: content-box;
  display: var(--fa-display, inline-block);
  height: 1em;
  overflow: visible;
  vertical-align: -0.125em;
  width: var(--fa-width, 1.25em);
}
.svg-inline--fa.fa-2xs {
  vertical-align: 0.1em;
}
.svg-inline--fa.fa-xs {
  vertical-align: 0em;
}
.svg-inline--fa.fa-sm {
  vertical-align: -0.0714285714em;
}
.svg-inline--fa.fa-lg {
  vertical-align: -0.2em;
}
.svg-inline--fa.fa-xl {
  vertical-align: -0.25em;
}
.svg-inline--fa.fa-2xl {
  vertical-align: -0.3125em;
}
.svg-inline--fa.fa-pull-left,
.svg-inline--fa .fa-pull-start {
  float: inline-start;
  margin-inline-end: var(--fa-pull-margin, 0.3em);
}
.svg-inline--fa.fa-pull-right,
.svg-inline--fa .fa-pull-end {
  float: inline-end;
  margin-inline-start: var(--fa-pull-margin, 0.3em);
}
.svg-inline--fa.fa-li {
  width: var(--fa-li-width, 2em);
  inset-inline-start: calc(-1 * var(--fa-li-width, 2em));
  inset-block-start: 0.25em; /* syncing vertical alignment with Web Font rendering */
}

.fa-layers-counter, .fa-layers-text {
  display: inline-block;
  position: absolute;
  text-align: center;
}

.fa-layers {
  display: inline-block;
  height: 1em;
  position: relative;
  text-align: center;
  vertical-align: -0.125em;
  width: var(--fa-width, 1.25em);
}
.fa-layers .svg-inline--fa {
  inset: 0;
  margin: auto;
  position: absolute;
  transform-origin: center center;
}

.fa-layers-text {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  transform-origin: center center;
}

.fa-layers-counter {
  background-color: var(--fa-counter-background-color, #ff253a);
  border-radius: var(--fa-counter-border-radius, 1em);
  box-sizing: border-box;
  color: var(--fa-inverse, #fff);
  line-height: var(--fa-counter-line-height, 1);
  max-width: var(--fa-counter-max-width, 5em);
  min-width: var(--fa-counter-min-width, 1.5em);
  overflow: hidden;
  padding: var(--fa-counter-padding, 0.25em 0.5em);
  right: var(--fa-right, 0);
  text-overflow: ellipsis;
  top: var(--fa-top, 0);
  transform: scale(var(--fa-counter-scale, 0.25));
  transform-origin: top right;
}

.fa-layers-bottom-right {
  bottom: var(--fa-bottom, 0);
  right: var(--fa-right, 0);
  top: auto;
  transform: scale(var(--fa-layers-scale, 0.25));
  transform-origin: bottom right;
}

.fa-layers-bottom-left {
  bottom: var(--fa-bottom, 0);
  left: var(--fa-left, 0);
  right: auto;
  top: auto;
  transform: scale(var(--fa-layers-scale, 0.25));
  transform-origin: bottom left;
}

.fa-layers-top-right {
  top: var(--fa-top, 0);
  right: var(--fa-right, 0);
  transform: scale(var(--fa-layers-scale, 0.25));
  transform-origin: top right;
}

.fa-layers-top-left {
  left: var(--fa-left, 0);
  right: auto;
  top: var(--fa-top, 0);
  transform: scale(var(--fa-layers-scale, 0.25));
  transform-origin: top left;
}

.fa-1x {
  font-size: 1em;
}

.fa-2x {
  font-size: 2em;
}

.fa-3x {
  font-size: 3em;
}

.fa-4x {
  font-size: 4em;
}

.fa-5x {
  font-size: 5em;
}

.fa-6x {
  font-size: 6em;
}

.fa-7x {
  font-size: 7em;
}

.fa-8x {
  font-size: 8em;
}

.fa-9x {
  font-size: 9em;
}

.fa-10x {
  font-size: 10em;
}

.fa-2xs {
  font-size: calc(10 / 16 * 1em); /* converts a 10px size into an em-based value that's relative to the scale's 16px base */
  line-height: calc(1 / 10 * 1em); /* sets the line-height of the icon back to that of it's parent */
  vertical-align: calc((6 / 10 - 0.375) * 1em); /* vertically centers the icon taking into account the surrounding text's descender */
}

.fa-xs {
  font-size: calc(12 / 16 * 1em); /* converts a 12px size into an em-based value that's relative to the scale's 16px base */
  line-height: calc(1 / 12 * 1em); /* sets the line-height of the icon back to that of it's parent */
  vertical-align: calc((6 / 12 - 0.375) * 1em); /* vertically centers the icon taking into account the surrounding text's descender */
}

.fa-sm {
  font-size: calc(14 / 16 * 1em); /* converts a 14px size into an em-based value that's relative to the scale's 16px base */
  line-height: calc(1 / 14 * 1em); /* sets the line-height of the icon back to that of it's parent */
  vertical-align: calc((6 / 14 - 0.375) * 1em); /* vertically centers the icon taking into account the surrounding text's descender */
}

.fa-lg {
  font-size: calc(20 / 16 * 1em); /* converts a 20px size into an em-based value that's relative to the scale's 16px base */
  line-height: calc(1 / 20 * 1em); /* sets the line-height of the icon back to that of it's parent */
  vertical-align: calc((6 / 20 - 0.375) * 1em); /* vertically centers the icon taking into account the surrounding text's descender */
}

.fa-xl {
  font-size: calc(24 / 16 * 1em); /* converts a 24px size into an em-based value that's relative to the scale's 16px base */
  line-height: calc(1 / 24 * 1em); /* sets the line-height of the icon back to that of it's parent */
  vertical-align: calc((6 / 24 - 0.375) * 1em); /* vertically centers the icon taking into account the surrounding text's descender */
}

.fa-2xl {
  font-size: calc(32 / 16 * 1em); /* converts a 32px size into an em-based value that's relative to the scale's 16px base */
  line-height: calc(1 / 32 * 1em); /* sets the line-height of the icon back to that of it's parent */
  vertical-align: calc((6 / 32 - 0.375) * 1em); /* vertically centers the icon taking into account the surrounding text's descender */
}

.fa-width-auto {
  --fa-width: auto;
}

.fa-fw,
.fa-width-fixed {
  --fa-width: 1.25em;
}

.fa-ul {
  list-style-type: none;
  margin-inline-start: var(--fa-li-margin, 2.5em);
  padding-inline-start: 0;
}
.fa-ul > li {
  position: relative;
}

.fa-li {
  inset-inline-start: calc(-1 * var(--fa-li-width, 2em));
  position: absolute;
  text-align: center;
  width: var(--fa-li-width, 2em);
  line-height: inherit;
}

/* Heads Up: Bordered Icons will not be supported in the future!
  - This feature will be deprecated in the next major release of Font Awesome (v8)!
  - You may continue to use it in this version *v7), but it will not be supported in Font Awesome v8.
*/
/* Notes:
* --@{v.$css-prefix}-border-width = 1/16 by default (to render as ~1px based on a 16px default font-size)
* --@{v.$css-prefix}-border-padding =
  ** 3/16 for vertical padding (to give ~2px of vertical whitespace around an icon considering it's vertical alignment)
  ** 4/16 for horizontal padding (to give ~4px of horizontal whitespace around an icon)
*/
.fa-border {
  border-color: var(--fa-border-color, #eee);
  border-radius: var(--fa-border-radius, 0.1em);
  border-style: var(--fa-border-style, solid);
  border-width: var(--fa-border-width, 0.0625em);
  box-sizing: var(--fa-border-box-sizing, content-box);
  padding: var(--fa-border-padding, 0.1875em 0.25em);
}

.fa-pull-left,
.fa-pull-start {
  float: inline-start;
  margin-inline-end: var(--fa-pull-margin, 0.3em);
}

.fa-pull-right,
.fa-pull-end {
  float: inline-end;
  margin-inline-start: var(--fa-pull-margin, 0.3em);
}

.fa-beat {
  animation-name: fa-beat;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, ease-in-out);
}

.fa-bounce {
  animation-name: fa-bounce;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.28, 0.84, 0.42, 1));
}

.fa-fade {
  animation-name: fa-fade;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.4, 0, 0.6, 1));
}

.fa-beat-fade {
  animation-name: fa-beat-fade;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.4, 0, 0.6, 1));
}

.fa-flip {
  animation-name: fa-flip;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, ease-in-out);
}

.fa-shake {
  animation-name: fa-shake;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, linear);
}

.fa-spin {
  animation-name: fa-spin;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 2s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, linear);
}

.fa-spin-reverse {
  --fa-animation-direction: reverse;
}

.fa-pulse,
.fa-spin-pulse {
  animation-name: fa-spin;
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, steps(8));
}

@media (prefers-reduced-motion: reduce) {
  .fa-beat,
  .fa-bounce,
  .fa-fade,
  .fa-beat-fade,
  .fa-flip,
  .fa-pulse,
  .fa-shake,
  .fa-spin,
  .fa-spin-pulse {
    animation: none !important;
    transition: none !important;
  }
}
@keyframes fa-beat {
  0%, 90% {
    transform: scale(1);
  }
  45% {
    transform: scale(var(--fa-beat-scale, 1.25));
  }
}
@keyframes fa-bounce {
  0% {
    transform: scale(1, 1) translateY(0);
  }
  10% {
    transform: scale(var(--fa-bounce-start-scale-x, 1.1), var(--fa-bounce-start-scale-y, 0.9)) translateY(0);
  }
  30% {
    transform: scale(var(--fa-bounce-jump-scale-x, 0.9), var(--fa-bounce-jump-scale-y, 1.1)) translateY(var(--fa-bounce-height, -0.5em));
  }
  50% {
    transform: scale(var(--fa-bounce-land-scale-x, 1.05), var(--fa-bounce-land-scale-y, 0.95)) translateY(0);
  }
  57% {
    transform: scale(1, 1) translateY(var(--fa-bounce-rebound, -0.125em));
  }
  64% {
    transform: scale(1, 1) translateY(0);
  }
  100% {
    transform: scale(1, 1) translateY(0);
  }
}
@keyframes fa-fade {
  50% {
    opacity: var(--fa-fade-opacity, 0.4);
  }
}
@keyframes fa-beat-fade {
  0%, 100% {
    opacity: var(--fa-beat-fade-opacity, 0.4);
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(var(--fa-beat-fade-scale, 1.125));
  }
}
@keyframes fa-flip {
  50% {
    transform: rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), var(--fa-flip-angle, -180deg));
  }
}
@keyframes fa-shake {
  0% {
    transform: rotate(-15deg);
  }
  4% {
    transform: rotate(15deg);
  }
  8%, 24% {
    transform: rotate(-18deg);
  }
  12%, 28% {
    transform: rotate(18deg);
  }
  16% {
    transform: rotate(-22deg);
  }
  20% {
    transform: rotate(22deg);
  }
  32% {
    transform: rotate(-12deg);
  }
  36% {
    transform: rotate(12deg);
  }
  40%, 100% {
    transform: rotate(0deg);
  }
}
@keyframes fa-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
.fa-rotate-90 {
  transform: rotate(90deg);
}

.fa-rotate-180 {
  transform: rotate(180deg);
}

.fa-rotate-270 {
  transform: rotate(270deg);
}

.fa-flip-horizontal {
  transform: scale(-1, 1);
}

.fa-flip-vertical {
  transform: scale(1, -1);
}

.fa-flip-both,
.fa-flip-horizontal.fa-flip-vertical {
  transform: scale(-1, -1);
}

.fa-rotate-by {
  transform: rotate(var(--fa-rotate-angle, 0));
}

.svg-inline--fa .fa-primary {
  fill: var(--fa-primary-color, currentColor);
  opacity: var(--fa-primary-opacity, 1);
}

.svg-inline--fa .fa-secondary {
  fill: var(--fa-secondary-color, currentColor);
  opacity: var(--fa-secondary-opacity, 0.4);
}

.svg-inline--fa.fa-swap-opacity .fa-primary {
  opacity: var(--fa-secondary-opacity, 0.4);
}

.svg-inline--fa.fa-swap-opacity .fa-secondary {
  opacity: var(--fa-primary-opacity, 1);
}

.svg-inline--fa mask .fa-primary,
.svg-inline--fa mask .fa-secondary {
  fill: black;
}

.svg-inline--fa.fa-inverse {
  fill: var(--fa-inverse, #fff);
}

.fa-stack {
  display: inline-block;
  height: 2em;
  line-height: 2em;
  position: relative;
  vertical-align: middle;
  width: 2.5em;
}

.fa-inverse {
  color: var(--fa-inverse, #fff);
}

.svg-inline--fa.fa-stack-1x {
  --fa-width: 1.25em;
  height: 1em;
  width: var(--fa-width);
}
.svg-inline--fa.fa-stack-2x {
  --fa-width: 2.5em;
  height: 2em;
  width: var(--fa-width);
}

.fa-stack-1x,
.fa-stack-2x {
  inset: 0;
  margin: auto;
  position: absolute;
  z-index: var(--fa-stack-z-index, auto);
}`;function Fa(){var t=xa,a=wa,e=m.cssPrefix,n=m.replacementClass,r=si;if(e!==t||n!==a){var i=new RegExp("\\.".concat(t,"\\-"),"g"),o=new RegExp("\\--".concat(t,"\\-"),"g"),s=new RegExp("\\.".concat(a),"g");r=r.replace(i,".".concat(e,"-")).replace(o,"--".concat(e,"-")).replace(s,".".concat(n))}return r}var Ce=!1;function kt(){m.autoAddCss&&!Ce&&(ai(Fa()),Ce=!0)}var li={mixout:function(){return{dom:{css:Fa,insertCss:kt}}},hooks:function(){return{beforeDOMElementCreation:function(){kt()},beforeI2svg:function(){kt()}}}},T=M||{};T[N]||(T[N]={});T[N].styles||(T[N].styles={});T[N].hooks||(T[N].hooks={});T[N].shims||(T[N].shims=[]);var P=T[N],Ea=[],Oa=function(){g.removeEventListener("DOMContentLoaded",Oa),st=1,Ea.map(function(a){return a()})},st=!1;j&&(st=(g.documentElement.doScroll?/^loaded|^c/:/^loaded|^i|^c/).test(g.readyState),st||g.addEventListener("DOMContentLoaded",Oa));function fi(t){j&&(st?setTimeout(t,0):Ea.push(t))}function Z(t){var a=t.tag,e=t.attributes,n=e===void 0?{}:e,r=t.children,i=r===void 0?[]:r;return typeof t=="string"?Pa(t):"<".concat(a," ").concat(ri(n),">").concat(i.map(Z).join(""),"</").concat(a,">")}function Pe(t,a,e){if(t&&t[a]&&t[a][e])return{prefix:a,iconName:e,icon:t[a][e]}}var ui=function(a,e){return function(n,r,i,o){return a.call(e,n,r,i,o)}},St=function(a,e,n,r){var i=Object.keys(a),o=i.length,s=r!==void 0?ui(e,r):e,l,u,d;for(n===void 0?(l=1,d=a[i[0]]):(l=0,d=n);l<o;l++)u=i[l],d=s(d,a[u],u,a);return d};function Na(t){return F(t).length!==1?null:t.codePointAt(0).toString(16)}function Fe(t){return Object.keys(t).reduce(function(a,e){var n=t[e],r=!!n.icon;return r?a[n.iconName]=n.icon:a[e]=n,a},{})}function jt(t,a){var e=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{},n=e.skipHooks,r=n===void 0?!1:n,i=Fe(a);typeof P.hooks.addPack=="function"&&!r?P.hooks.addPack(t,Fe(a)):P.styles[t]=f(f({},P.styles[t]||{}),i),t==="fas"&&jt("fa",a)}var J=P.styles,ci=P.shims,Ta=Object.keys(Bt),di=Ta.reduce(function(t,a){return t[a]=Object.keys(Bt[a]),t},{}),Xt=null,ja={},Da={},Ma={},_a={},za={};function mi(t){return~Qr.indexOf(t)}function hi(t,a){var e=a.split("-"),n=e[0],r=e.slice(1).join("-");return n===t&&r!==""&&!mi(r)?r:null}var $a=function(){var a=function(i){return St(J,function(o,s,l){return o[l]=St(s,i,{}),o},{})};ja=a(function(r,i,o){if(i[3]&&(r[i[3]]=o),i[2]){var s=i[2].filter(function(l){return typeof l=="number"});s.forEach(function(l){r[l.toString(16)]=o})}return r}),Da=a(function(r,i,o){if(r[o]=o,i[2]){var s=i[2].filter(function(l){return typeof l=="string"});s.forEach(function(l){r[l]=o})}return r}),za=a(function(r,i,o){var s=i[2];return r[o]=o,s.forEach(function(l){r[l]=o}),r});var e="far"in J||m.autoFetchSvg,n=St(ci,function(r,i){var o=i[0],s=i[1],l=i[2];return s==="far"&&!e&&(s="fas"),typeof o=="string"&&(r.names[o]={prefix:s,iconName:l}),typeof o=="number"&&(r.unicodes[o.toString(16)]={prefix:s,iconName:l}),r},{names:{},unicodes:{}});Ma=n.names,_a=n.unicodes,Xt=ct(m.styleDefault,{family:m.familyDefault})};ei(function(t){Xt=ct(t.styleDefault,{family:m.familyDefault})});$a();function Kt(t,a){return(ja[t]||{})[a]}function pi(t,a){return(Da[t]||{})[a]}function L(t,a){return(za[t]||{})[a]}function La(t){return Ma[t]||{prefix:null,iconName:null}}function vi(t){var a=_a[t],e=Kt("fas",t);return a||(e?{prefix:"fas",iconName:e}:null)||{prefix:null,iconName:null}}function _(){return Xt}var Ra=function(){return{prefix:null,iconName:null,rest:[]}};function gi(t){var a=w,e=Ta.reduce(function(n,r){return n[r]="".concat(m.cssPrefix,"-").concat(r),n},{});return va.forEach(function(n){(t.includes(e[n])||t.some(function(r){return di[n].includes(r)}))&&(a=n)}),a}function ct(t){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},e=a.family,n=e===void 0?w:e,r=Vr[n][t];if(n===q&&!t)return"fad";var i=Se[n][t]||Se[n][r],o=t in P.styles?t:null,s=i||o||null;return s}function yi(t){var a=[],e=null;return t.forEach(function(n){var r=hi(m.cssPrefix,n);r?e=r:n&&a.push(n)}),{iconName:e,rest:a}}function Ee(t){return t.sort().filter(function(a,e,n){return n.indexOf(a)===e})}var Oe=ya.concat(ga);function dt(t){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},e=a.skipLookups,n=e===void 0?!1:e,r=null,i=Ee(t.filter(function(p){return Oe.includes(p)})),o=Ee(t.filter(function(p){return!Oe.includes(p)})),s=i.filter(function(p){return r=p,!Qe.includes(p)}),l=ft(s,1),u=l[0],d=u===void 0?null:u,c=gi(i),v=f(f({},yi(o)),{},{prefix:ct(d,{family:c})});return f(f(f({},v),ki({values:t,family:c,styles:J,config:m,canonical:v,givenPrefix:r})),bi(n,r,v))}function bi(t,a,e){var n=e.prefix,r=e.iconName;if(t||!n||!r)return{prefix:n,iconName:r};var i=a==="fa"?La(r):{},o=L(n,r);return r=i.iconName||o||r,n=i.prefix||n,n==="far"&&!J.far&&J.fas&&!m.autoFetchSvg&&(n="fas"),{prefix:n,iconName:r}}var xi=va.filter(function(t){return t!==w||t!==q}),wi=Object.keys(Pt).filter(function(t){return t!==w}).map(function(t){return Object.keys(Pt[t])}).flat();function ki(t){var a=t.values,e=t.family,n=t.canonical,r=t.givenPrefix,i=r===void 0?"":r,o=t.styles,s=o===void 0?{}:o,l=t.config,u=l===void 0?{}:l,d=e===q,c=a.includes("fa-duotone")||a.includes("fad"),v=u.familyDefault==="duotone",p=n.prefix==="fad"||n.prefix==="fa-duotone";if(!d&&(c||v||p)&&(n.prefix="fad"),(a.includes("fa-brands")||a.includes("fab"))&&(n.prefix="fab"),!n.prefix&&xi.includes(e)){var b=Object.keys(s).find(function(k){return wi.includes(k)});if(b||u.autoFetchSvg){var y=zn.get(e).defaultShortPrefixId;n.prefix=y,n.iconName=L(n.prefix,n.iconName)||n.iconName}}return(n.prefix==="fa"||i==="fa")&&(n.prefix=_()||"fas"),n}var Si=(function(){function t(){rn(this,t),this.definitions={}}return on(t,[{key:"add",value:function(){for(var e=this,n=arguments.length,r=new Array(n),i=0;i<n;i++)r[i]=arguments[i];var o=r.reduce(this._pullDefinitions,{});Object.keys(o).forEach(function(s){e.definitions[s]=f(f({},e.definitions[s]||{}),o[s]),jt(s,o[s]);var l=Bt[w][s];l&&jt(l,o[s]),$a()})}},{key:"reset",value:function(){this.definitions={}}},{key:"_pullDefinitions",value:function(e,n){var r=n.prefix&&n.iconName&&n.icon?{0:n}:n;return Object.keys(r).map(function(i){var o=r[i],s=o.prefix,l=o.iconName,u=o.icon,d=u[2];e[s]||(e[s]={}),d.length>0&&d.forEach(function(c){typeof c=="string"&&(e[s][c]=u)}),e[s][l]=u}),e}}])})(),Ne=[],U={},Y={},Ai=Object.keys(Y);function Ii(t,a){var e=a.mixoutsTo;return Ne=t,U={},Object.keys(Y).forEach(function(n){Ai.indexOf(n)===-1&&delete Y[n]}),Ne.forEach(function(n){var r=n.mixout?n.mixout():{};if(Object.keys(r).forEach(function(o){typeof r[o]=="function"&&(e[o]=r[o]),ot(r[o])==="object"&&Object.keys(r[o]).forEach(function(s){e[o]||(e[o]={}),e[o][s]=r[o][s]})}),n.hooks){var i=n.hooks();Object.keys(i).forEach(function(o){U[o]||(U[o]=[]),U[o].push(i[o])})}n.provides&&n.provides(Y)}),e}function Dt(t,a){for(var e=arguments.length,n=new Array(e>2?e-2:0),r=2;r<e;r++)n[r-2]=arguments[r];var i=U[t]||[];return i.forEach(function(o){a=o.apply(null,[a].concat(n))}),a}function W(t){for(var a=arguments.length,e=new Array(a>1?a-1:0),n=1;n<a;n++)e[n-1]=arguments[n];var r=U[t]||[];r.forEach(function(i){i.apply(null,e)})}function z(){var t=arguments[0],a=Array.prototype.slice.call(arguments,1);return Y[t]?Y[t].apply(null,a):void 0}function Mt(t){t.prefix==="fa"&&(t.prefix="fas");var a=t.iconName,e=t.prefix||_();if(a)return a=L(e,a)||a,Pe(Wa.definitions,e,a)||Pe(P.styles,e,a)}var Wa=new Si,Ci=function(){m.autoReplaceSvg=!1,m.observeMutations=!1,W("noAuto")},Pi={i2svg:function(){var a=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};return j?(W("beforeI2svg",a),z("pseudoElements2svg",a),z("i2svg",a)):Promise.reject(new Error("Operation requires a DOM of some kind."))},watch:function(){var a=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},e=a.autoReplaceSvgRoot;m.autoReplaceSvg===!1&&(m.autoReplaceSvg=!0),m.observeMutations=!0,fi(function(){Ei({autoReplaceSvgRoot:e}),W("watch",a)})}},Fi={icon:function(a){if(a===null)return null;if(ot(a)==="object"&&a.prefix&&a.iconName)return{prefix:a.prefix,iconName:L(a.prefix,a.iconName)||a.iconName};if(Array.isArray(a)&&a.length===2){var e=a[1].indexOf("fa-")===0?a[1].slice(3):a[1],n=ct(a[0]);return{prefix:n,iconName:L(n,e)||e}}if(typeof a=="string"&&(a.indexOf("".concat(m.cssPrefix,"-"))>-1||a.match(Xr))){var r=dt(a.split(" "),{skipLookups:!0});return{prefix:r.prefix||_(),iconName:L(r.prefix,r.iconName)||r.iconName}}if(typeof a=="string"){var i=_();return{prefix:i,iconName:L(i,a)||a}}}},I={noAuto:Ci,config:m,dom:Pi,parse:Fi,library:Wa,findIconDefinition:Mt,toHtml:Z},Ei=function(){var a=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},e=a.autoReplaceSvgRoot,n=e===void 0?g:e;(Object.keys(P.styles).length>0||m.autoFetchSvg)&&j&&m.autoReplaceSvg&&I.dom.i2svg({node:n})};function mt(t,a){return Object.defineProperty(t,"abstract",{get:a}),Object.defineProperty(t,"html",{get:function(){return t.abstract.map(function(n){return Z(n)})}}),Object.defineProperty(t,"node",{get:function(){if(j){var n=g.createElement("div");return n.innerHTML=t.html,n.children}}}),t}function Oi(t){var a=t.children,e=t.main,n=t.mask,r=t.attributes,i=t.styles,o=t.transform;if(Vt(o)&&e.found&&!n.found){var s=e.width,l=e.height,u={x:s/l/2,y:.5};r.style=ut(f(f({},i),{},{"transform-origin":"".concat(u.x+o.x/16,"em ").concat(u.y+o.y/16,"em")}))}return[{tag:"svg",attributes:r,children:a}]}function Ni(t){var a=t.prefix,e=t.iconName,n=t.children,r=t.attributes,i=t.symbol,o=i===!0?"".concat(a,"-").concat(m.cssPrefix,"-").concat(e):i;return[{tag:"svg",attributes:{style:"display: none;"},children:[{tag:"symbol",attributes:f(f({},r),{},{id:o}),children:n}]}]}function Ti(t){var a=["aria-label","aria-labelledby","title","role"];return a.some(function(e){return e in t})}function Jt(t){var a=t.icons,e=a.main,n=a.mask,r=t.prefix,i=t.iconName,o=t.transform,s=t.symbol,l=t.maskId,u=t.extra,d=t.watchable,c=d===void 0?!1:d,v=n.found?n:e,p=v.width,b=v.height,y=[m.replacementClass,i?"".concat(m.cssPrefix,"-").concat(i):""].filter(function(O){return u.classes.indexOf(O)===-1}).filter(function(O){return O!==""||!!O}).concat(u.classes).join(" "),k={children:[],attributes:f(f({},u.attributes),{},{"data-prefix":r,"data-icon":i,class:y,role:u.attributes.role||"img",viewBox:"0 0 ".concat(p," ").concat(b)})};!Ti(u.attributes)&&!u.attributes["aria-hidden"]&&(k.attributes["aria-hidden"]="true"),c&&(k.attributes[R]="");var x=f(f({},k),{},{prefix:r,iconName:i,main:e,mask:n,maskId:l,transform:o,symbol:s,styles:f({},u.styles)}),A=n.found&&e.found?z("generateAbstractMask",x)||{children:[],attributes:{}}:z("generateAbstractIcon",x)||{children:[],attributes:{}},C=A.children,H=A.attributes;return x.children=C,x.attributes=H,s?Ni(x):Oi(x)}function Te(t){var a=t.content,e=t.width,n=t.height,r=t.transform,i=t.extra,o=t.watchable,s=o===void 0?!1:o,l=f(f({},i.attributes),{},{class:i.classes.join(" ")});s&&(l[R]="");var u=f({},i.styles);Vt(r)&&(u.transform=oi({transform:r,startCentered:!0,width:e,height:n}),u["-webkit-transform"]=u.transform);var d=ut(u);d.length>0&&(l.style=d);var c=[];return c.push({tag:"span",attributes:l,children:[a]}),c}function ji(t){var a=t.content,e=t.extra,n=f(f({},e.attributes),{},{class:e.classes.join(" ")}),r=ut(e.styles);r.length>0&&(n.style=r);var i=[];return i.push({tag:"span",attributes:n,children:[a]}),i}var At=P.styles;function _t(t){var a=t[0],e=t[1],n=t.slice(4),r=ft(n,1),i=r[0],o=null;return Array.isArray(i)?o={tag:"g",attributes:{class:"".concat(m.cssPrefix,"-").concat(wt.GROUP)},children:[{tag:"path",attributes:{class:"".concat(m.cssPrefix,"-").concat(wt.SECONDARY),fill:"currentColor",d:i[0]}},{tag:"path",attributes:{class:"".concat(m.cssPrefix,"-").concat(wt.PRIMARY),fill:"currentColor",d:i[1]}}]}:o={tag:"path",attributes:{fill:"currentColor",d:i}},{found:!0,width:a,height:e,icon:o}}var Di={found:!1,width:512,height:512};function Mi(t,a){!Sa&&!m.showMissingIcons&&t&&console.error('Icon with name "'.concat(t,'" and prefix "').concat(a,'" is missing.'))}function zt(t,a){var e=a;return a==="fa"&&m.styleDefault!==null&&(a=_()),new Promise(function(n,r){if(e==="fa"){var i=La(t)||{};t=i.iconName||t,a=i.prefix||a}if(t&&a&&At[a]&&At[a][t]){var o=At[a][t];return n(_t(o))}Mi(t,a),n(f(f({},Di),{},{icon:m.showMissingIcons&&t?z("missingIconAbstract")||{}:{}}))})}var je=function(){},$t=m.measurePerformance&&et&&et.mark&&et.measure?et:{mark:je,measure:je},V='FA "7.2.0"',_i=function(a){return $t.mark("".concat(V," ").concat(a," begins")),function(){return Ha(a)}},Ha=function(a){$t.mark("".concat(V," ").concat(a," ends")),$t.measure("".concat(V," ").concat(a),"".concat(V," ").concat(a," begins"),"".concat(V," ").concat(a," ends"))},qt={begin:_i,end:Ha},rt=function(){};function De(t){var a=t.getAttribute?t.getAttribute(R):null;return typeof a=="string"}function zi(t){var a=t.getAttribute?t.getAttribute(Ut):null,e=t.getAttribute?t.getAttribute(Yt):null;return a&&e}function $i(t){return t&&t.classList&&t.classList.contains&&t.classList.contains(m.replacementClass)}function Li(){if(m.autoReplaceSvg===!0)return it.replace;var t=it[m.autoReplaceSvg];return t||it.replace}function Ri(t){return g.createElementNS("http://www.w3.org/2000/svg",t)}function Wi(t){return g.createElement(t)}function Ua(t){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},e=a.ceFn,n=e===void 0?t.tag==="svg"?Ri:Wi:e;if(typeof t=="string")return g.createTextNode(t);var r=n(t.tag);Object.keys(t.attributes||[]).forEach(function(o){r.setAttribute(o,t.attributes[o])});var i=t.children||[];return i.forEach(function(o){r.appendChild(Ua(o,{ceFn:n}))}),r}function Hi(t){var a=" ".concat(t.outerHTML," ");return a="".concat(a,"Font Awesome fontawesome.com "),a}var it={replace:function(a){var e=a[0];if(e.parentNode)if(a[1].forEach(function(r){e.parentNode.insertBefore(Ua(r),e)}),e.getAttribute(R)===null&&m.keepOriginalSource){var n=g.createComment(Hi(e));e.parentNode.replaceChild(n,e)}else e.remove()},nest:function(a){var e=a[0],n=a[1];if(~Gt(e).indexOf(m.replacementClass))return it.replace(a);var r=new RegExp("".concat(m.cssPrefix,"-.*"));if(delete n[0].attributes.id,n[0].attributes.class){var i=n[0].attributes.class.split(" ").reduce(function(s,l){return l===m.replacementClass||l.match(r)?s.toSvg.push(l):s.toNode.push(l),s},{toNode:[],toSvg:[]});n[0].attributes.class=i.toSvg.join(" "),i.toNode.length===0?e.removeAttribute("class"):e.setAttribute("class",i.toNode.join(" "))}var o=n.map(function(s){return Z(s)}).join(`
`);e.setAttribute(R,""),e.innerHTML=o}};function Me(t){t()}function Ya(t,a){var e=typeof a=="function"?a:rt;if(t.length===0)e();else{var n=Me;m.mutateApproach===Br&&(n=M.requestAnimationFrame||Me),n(function(){var r=Li(),i=qt.begin("mutate");t.map(r),i(),e()})}}var Qt=!1;function Ba(){Qt=!0}function Lt(){Qt=!1}var lt=null;function _e(t){if(be&&m.observeMutations){var a=t.treeCallback,e=a===void 0?rt:a,n=t.nodeCallback,r=n===void 0?rt:n,i=t.pseudoElementsCallback,o=i===void 0?rt:i,s=t.observeMutationsRoot,l=s===void 0?g:s;lt=new be(function(u){if(!Qt){var d=_();G(u).forEach(function(c){if(c.type==="childList"&&c.addedNodes.length>0&&!De(c.addedNodes[0])&&(m.searchPseudoElements&&o(c.target),e(c.target)),c.type==="attributes"&&c.target.parentNode&&m.searchPseudoElements&&o([c.target],!0),c.type==="attributes"&&De(c.target)&&~qr.indexOf(c.attributeName))if(c.attributeName==="class"&&zi(c.target)){var v=dt(Gt(c.target)),p=v.prefix,b=v.iconName;c.target.setAttribute(Ut,p||d),b&&c.target.setAttribute(Yt,b)}else $i(c.target)&&r(c.target)})}}),j&&lt.observe(l,{childList:!0,attributes:!0,characterData:!0,subtree:!0})}}function Ui(){lt&&lt.disconnect()}function Yi(t){var a=t.getAttribute("style"),e=[];return a&&(e=a.split(";").reduce(function(n,r){var i=r.split(":"),o=i[0],s=i.slice(1);return o&&s.length>0&&(n[o]=s.join(":").trim()),n},{})),e}function Bi(t){var a=t.getAttribute("data-prefix"),e=t.getAttribute("data-icon"),n=t.innerText!==void 0?t.innerText.trim():"",r=dt(Gt(t));return r.prefix||(r.prefix=_()),a&&e&&(r.prefix=a,r.iconName=e),r.iconName&&r.prefix||(r.prefix&&n.length>0&&(r.iconName=pi(r.prefix,t.innerText)||Kt(r.prefix,Na(t.innerText))),!r.iconName&&m.autoFetchSvg&&t.firstChild&&t.firstChild.nodeType===Node.TEXT_NODE&&(r.iconName=t.firstChild.data)),r}function Gi(t){var a=G(t.attributes).reduce(function(e,n){return e.name!=="class"&&e.name!=="style"&&(e[n.name]=n.value),e},{});return a}function Vi(){return{iconName:null,prefix:null,transform:E,symbol:!1,mask:{iconName:null,prefix:null,rest:[]},maskId:null,extra:{classes:[],styles:{},attributes:{}}}}function ze(t){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{styleParser:!0},e=Bi(t),n=e.iconName,r=e.prefix,i=e.rest,o=Gi(t),s=Dt("parseNodeAttributes",{},t),l=a.styleParser?Yi(t):[];return f({iconName:n,prefix:r,transform:E,mask:{iconName:null,prefix:null,rest:[]},maskId:null,symbol:!1,extra:{classes:i,styles:l,attributes:o}},s)}var Xi=P.styles;function Ga(t){var a=m.autoReplaceSvg==="nest"?ze(t,{styleParser:!1}):ze(t);return~a.extra.classes.indexOf(Ia)?z("generateLayersText",t,a):z("generateSvgReplacementMutation",t,a)}function Ki(){return[].concat(F(ga),F(ya))}function $e(t){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:null;if(!j)return Promise.resolve();var e=g.documentElement.classList,n=function(c){return e.add("".concat(ke,"-").concat(c))},r=function(c){return e.remove("".concat(ke,"-").concat(c))},i=m.autoFetchSvg?Ki():Qe.concat(Object.keys(Xi));i.includes("fa")||i.push("fa");var o=[".".concat(Ia,":not([").concat(R,"])")].concat(i.map(function(d){return".".concat(d,":not([").concat(R,"])")})).join(", ");if(o.length===0)return Promise.resolve();var s=[];try{s=G(t.querySelectorAll(o))}catch{}if(s.length>0)n("pending"),r("complete");else return Promise.resolve();var l=qt.begin("onTree"),u=s.reduce(function(d,c){try{var v=Ga(c);v&&d.push(v)}catch(p){Sa||p.name==="MissingIcon"&&console.error(p)}return d},[]);return new Promise(function(d,c){Promise.all(u).then(function(v){Ya(v,function(){n("active"),n("complete"),r("pending"),typeof a=="function"&&a(),l(),d()})}).catch(function(v){l(),c(v)})})}function Ji(t){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:null;Ga(t).then(function(e){e&&Ya([e],a)})}function qi(t){return function(a){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},n=(a||{}).icon?a:Mt(a||{}),r=e.mask;return r&&(r=(r||{}).icon?r:Mt(r||{})),t(n,f(f({},e),{},{mask:r}))}}var Qi=function(a){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},n=e.transform,r=n===void 0?E:n,i=e.symbol,o=i===void 0?!1:i,s=e.mask,l=s===void 0?null:s,u=e.maskId,d=u===void 0?null:u,c=e.classes,v=c===void 0?[]:c,p=e.attributes,b=p===void 0?{}:p,y=e.styles,k=y===void 0?{}:y;if(a){var x=a.prefix,A=a.iconName,C=a.icon;return mt(f({type:"icon"},a),function(){return W("beforeDOMElementCreation",{iconDefinition:a,params:e}),Jt({icons:{main:_t(C),mask:l?_t(l.icon):{found:!1,width:null,height:null,icon:{}}},prefix:x,iconName:A,transform:f(f({},E),r),symbol:o,maskId:d,extra:{attributes:b,styles:k,classes:v}})})}},Zi={mixout:function(){return{icon:qi(Qi)}},hooks:function(){return{mutationObserverCallbacks:function(e){return e.treeCallback=$e,e.nodeCallback=Ji,e}}},provides:function(a){a.i2svg=function(e){var n=e.node,r=n===void 0?g:n,i=e.callback,o=i===void 0?function(){}:i;return $e(r,o)},a.generateSvgReplacementMutation=function(e,n){var r=n.iconName,i=n.prefix,o=n.transform,s=n.symbol,l=n.mask,u=n.maskId,d=n.extra;return new Promise(function(c,v){Promise.all([zt(r,i),l.iconName?zt(l.iconName,l.prefix):Promise.resolve({found:!1,width:512,height:512,icon:{}})]).then(function(p){var b=ft(p,2),y=b[0],k=b[1];c([e,Jt({icons:{main:y,mask:k},prefix:i,iconName:r,transform:o,symbol:s,maskId:u,extra:d,watchable:!0})])}).catch(v)})},a.generateAbstractIcon=function(e){var n=e.children,r=e.attributes,i=e.main,o=e.transform,s=e.styles,l=ut(s);l.length>0&&(r.style=l);var u;return Vt(o)&&(u=z("generateAbstractTransformGrouping",{main:i,transform:o,containerWidth:i.width,iconWidth:i.width})),n.push(u||i.icon),{children:n,attributes:r}}}},to={mixout:function(){return{layer:function(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},r=n.classes,i=r===void 0?[]:r;return mt({type:"layer"},function(){W("beforeDOMElementCreation",{assembler:e,params:n});var o=[];return e(function(s){Array.isArray(s)?s.map(function(l){o=o.concat(l.abstract)}):o=o.concat(s.abstract)}),[{tag:"span",attributes:{class:["".concat(m.cssPrefix,"-layers")].concat(F(i)).join(" ")},children:o}]})}}}},eo={mixout:function(){return{counter:function(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},r=n.title,i=r===void 0?null:r,o=n.classes,s=o===void 0?[]:o,l=n.attributes,u=l===void 0?{}:l,d=n.styles,c=d===void 0?{}:d;return mt({type:"counter",content:e},function(){return W("beforeDOMElementCreation",{content:e,params:n}),ji({content:e.toString(),title:i,extra:{attributes:u,styles:c,classes:["".concat(m.cssPrefix,"-layers-counter")].concat(F(s))}})})}}}},ao={mixout:function(){return{text:function(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},r=n.transform,i=r===void 0?E:r,o=n.classes,s=o===void 0?[]:o,l=n.attributes,u=l===void 0?{}:l,d=n.styles,c=d===void 0?{}:d;return mt({type:"text",content:e},function(){return W("beforeDOMElementCreation",{content:e,params:n}),Te({content:e,transform:f(f({},E),i),extra:{attributes:u,styles:c,classes:["".concat(m.cssPrefix,"-layers-text")].concat(F(s))}})})}}},provides:function(a){a.generateLayersText=function(e,n){var r=n.transform,i=n.extra,o=null,s=null;if(Je){var l=parseInt(getComputedStyle(e).fontSize,10),u=e.getBoundingClientRect();o=u.width/l,s=u.height/l}return Promise.resolve([e,Te({content:e.innerHTML,width:o,height:s,transform:r,extra:i,watchable:!0})])}}},Va=new RegExp('"',"ug"),Le=[1105920,1112319],Re=f(f(f(f({},{FontAwesome:{normal:"fas",400:"fas"}}),_n),Ur),Bn),Rt=Object.keys(Re).reduce(function(t,a){return t[a.toLowerCase()]=Re[a],t},{}),no=Object.keys(Rt).reduce(function(t,a){var e=Rt[a];return t[a]=e[900]||F(Object.entries(e))[0][1],t},{});function ro(t){var a=t.replace(Va,"");return Na(F(a)[0]||"")}function io(t){var a=t.getPropertyValue("font-feature-settings").includes("ss01"),e=t.getPropertyValue("content"),n=e.replace(Va,""),r=n.codePointAt(0),i=r>=Le[0]&&r<=Le[1],o=n.length===2?n[0]===n[1]:!1;return i||o||a}function oo(t,a){var e=t.replace(/^['"]|['"]$/g,"").toLowerCase(),n=parseInt(a),r=isNaN(n)?"normal":n;return(Rt[e]||{})[r]||no[e]}function We(t,a){var e="".concat(Yr).concat(a.replace(":","-"));return new Promise(function(n,r){if(t.getAttribute(e)!==null)return n();var i=G(t.children),o=i.filter(function(ht){return ht.getAttribute(Et)===a})[0],s=M.getComputedStyle(t,a),l=s.getPropertyValue("font-family"),u=l.match(Kr),d=s.getPropertyValue("font-weight"),c=s.getPropertyValue("content");if(o&&!u)return t.removeChild(o),n();if(u&&c!=="none"&&c!==""){var v=s.getPropertyValue("content"),p=oo(l,d),b=ro(v),y=u[0].startsWith("FontAwesome"),k=io(s),x=Kt(p,b),A=x;if(y){var C=vi(b);C.iconName&&C.prefix&&(x=C.iconName,p=C.prefix)}if(x&&!k&&(!o||o.getAttribute(Ut)!==p||o.getAttribute(Yt)!==A)){t.setAttribute(e,A),o&&t.removeChild(o);var H=Vi(),O=H.extra;O.attributes[Et]=a,zt(x,p).then(function(ht){var tn=Jt(f(f({},H),{},{icons:{main:ht,mask:Ra()},prefix:p,iconName:A,extra:O,watchable:!0})),pt=g.createElementNS("http://www.w3.org/2000/svg","svg");a==="::before"?t.insertBefore(pt,t.firstChild):t.appendChild(pt),pt.outerHTML=tn.map(function(en){return Z(en)}).join(`
`),t.removeAttribute(e),n()}).catch(r)}else n()}else n()})}function so(t){return Promise.all([We(t,"::before"),We(t,"::after")])}function lo(t){return t.parentNode!==document.head&&!~Gr.indexOf(t.tagName.toUpperCase())&&!t.getAttribute(Et)&&(!t.parentNode||t.parentNode.tagName!=="svg")}var fo=function(a){return!!a&&ka.some(function(e){return a.includes(e)})},uo=function(a){if(!a)return[];var e=new Set,n=a.split(/,(?![^()]*\))/).map(function(l){return l.trim()});n=n.flatMap(function(l){return l.includes("(")?l:l.split(",").map(function(u){return u.trim()})});var r=nt(n),i;try{for(r.s();!(i=r.n()).done;){var o=i.value;if(fo(o)){var s=ka.reduce(function(l,u){return l.replace(u,"")},o);s!==""&&s!=="*"&&e.add(s)}}}catch(l){r.e(l)}finally{r.f()}return e};function He(t){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!1;if(j){var e;if(a)e=t;else if(m.searchPseudoElementsFullScan)e=t.querySelectorAll("*");else{var n=new Set,r=nt(document.styleSheets),i;try{for(r.s();!(i=r.n()).done;){var o=i.value;try{var s=nt(o.cssRules),l;try{for(s.s();!(l=s.n()).done;){var u=l.value,d=uo(u.selectorText),c=nt(d),v;try{for(c.s();!(v=c.n()).done;){var p=v.value;n.add(p)}}catch(y){c.e(y)}finally{c.f()}}}catch(y){s.e(y)}finally{s.f()}}catch(y){m.searchPseudoElementsWarnings&&console.warn("Font Awesome: cannot parse stylesheet: ".concat(o.href," (").concat(y.message,`)
If it declares any Font Awesome CSS pseudo-elements, they will not be rendered as SVG icons. Add crossorigin="anonymous" to the <link>, enable searchPseudoElementsFullScan for slower but more thorough DOM parsing, or suppress this warning by setting searchPseudoElementsWarnings to false.`))}}}catch(y){r.e(y)}finally{r.f()}if(!n.size)return;var b=Array.from(n).join(", ");try{e=t.querySelectorAll(b)}catch{}}return new Promise(function(y,k){var x=G(e).filter(lo).map(so),A=qt.begin("searchPseudoElements");Ba(),Promise.all(x).then(function(){A(),Lt(),y()}).catch(function(){A(),Lt(),k()})})}}var co={hooks:function(){return{mutationObserverCallbacks:function(e){return e.pseudoElementsCallback=He,e}}},provides:function(a){a.pseudoElements2svg=function(e){var n=e.node,r=n===void 0?g:n;m.searchPseudoElements&&He(r)}}},Ue=!1,mo={mixout:function(){return{dom:{unwatch:function(){Ba(),Ue=!0}}}},hooks:function(){return{bootstrap:function(){_e(Dt("mutationObserverCallbacks",{}))},noAuto:function(){Ui()},watch:function(e){var n=e.observeMutationsRoot;Ue?Lt():_e(Dt("mutationObserverCallbacks",{observeMutationsRoot:n}))}}}},Ye=function(a){var e={size:16,x:0,y:0,flipX:!1,flipY:!1,rotate:0};return a.toLowerCase().split(" ").reduce(function(n,r){var i=r.toLowerCase().split("-"),o=i[0],s=i.slice(1).join("-");if(o&&s==="h")return n.flipX=!0,n;if(o&&s==="v")return n.flipY=!0,n;if(s=parseFloat(s),isNaN(s))return n;switch(o){case"grow":n.size=n.size+s;break;case"shrink":n.size=n.size-s;break;case"left":n.x=n.x-s;break;case"right":n.x=n.x+s;break;case"up":n.y=n.y-s;break;case"down":n.y=n.y+s;break;case"rotate":n.rotate=n.rotate+s;break}return n},e)},ho={mixout:function(){return{parse:{transform:function(e){return Ye(e)}}}},hooks:function(){return{parseNodeAttributes:function(e,n){var r=n.getAttribute("data-fa-transform");return r&&(e.transform=Ye(r)),e}}},provides:function(a){a.generateAbstractTransformGrouping=function(e){var n=e.main,r=e.transform,i=e.containerWidth,o=e.iconWidth,s={transform:"translate(".concat(i/2," 256)")},l="translate(".concat(r.x*32,", ").concat(r.y*32,") "),u="scale(".concat(r.size/16*(r.flipX?-1:1),", ").concat(r.size/16*(r.flipY?-1:1),") "),d="rotate(".concat(r.rotate," 0 0)"),c={transform:"".concat(l," ").concat(u," ").concat(d)},v={transform:"translate(".concat(o/2*-1," -256)")},p={outer:s,inner:c,path:v};return{tag:"g",attributes:f({},p.outer),children:[{tag:"g",attributes:f({},p.inner),children:[{tag:n.icon.tag,children:n.icon.children,attributes:f(f({},n.icon.attributes),p.path)}]}]}}}},It={x:0,y:0,width:"100%",height:"100%"};function Be(t){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!0;return t.attributes&&(t.attributes.fill||a)&&(t.attributes.fill="black"),t}function po(t){return t.tag==="g"?t.children:[t]}var vo={hooks:function(){return{parseNodeAttributes:function(e,n){var r=n.getAttribute("data-fa-mask"),i=r?dt(r.split(" ").map(function(o){return o.trim()})):Ra();return i.prefix||(i.prefix=_()),e.mask=i,e.maskId=n.getAttribute("data-fa-mask-id"),e}}},provides:function(a){a.generateAbstractMask=function(e){var n=e.children,r=e.attributes,i=e.main,o=e.mask,s=e.maskId,l=e.transform,u=i.width,d=i.icon,c=o.width,v=o.icon,p=ii({transform:l,containerWidth:c,iconWidth:u}),b={tag:"rect",attributes:f(f({},It),{},{fill:"white"})},y=d.children?{children:d.children.map(Be)}:{},k={tag:"g",attributes:f({},p.inner),children:[Be(f({tag:d.tag,attributes:f(f({},d.attributes),p.path)},y))]},x={tag:"g",attributes:f({},p.outer),children:[k]},A="mask-".concat(s||Ie()),C="clip-".concat(s||Ie()),H={tag:"mask",attributes:f(f({},It),{},{id:A,maskUnits:"userSpaceOnUse",maskContentUnits:"userSpaceOnUse"}),children:[b,x]},O={tag:"defs",children:[{tag:"clipPath",attributes:{id:C},children:po(v)},H]};return n.push(O,{tag:"rect",attributes:f({fill:"currentColor","clip-path":"url(#".concat(C,")"),mask:"url(#".concat(A,")")},It)}),{children:n,attributes:r}}}},go={provides:function(a){var e=!1;M.matchMedia&&(e=M.matchMedia("(prefers-reduced-motion: reduce)").matches),a.missingIconAbstract=function(){var n=[],r={fill:"currentColor"},i={attributeType:"XML",repeatCount:"indefinite",dur:"2s"};n.push({tag:"path",attributes:f(f({},r),{},{d:"M156.5,447.7l-12.6,29.5c-18.7-9.5-35.9-21.2-51.5-34.9l22.7-22.7C127.6,430.5,141.5,440,156.5,447.7z M40.6,272H8.5 c1.4,21.2,5.4,41.7,11.7,61.1L50,321.2C45.1,305.5,41.8,289,40.6,272z M40.6,240c1.4-18.8,5.2-37,11.1-54.1l-29.5-12.6 C14.7,194.3,10,216.7,8.5,240H40.6z M64.3,156.5c7.8-14.9,17.2-28.8,28.1-41.5L69.7,92.3c-13.7,15.6-25.5,32.8-34.9,51.5 L64.3,156.5z M397,419.6c-13.9,12-29.4,22.3-46.1,30.4l11.9,29.8c20.7-9.9,39.8-22.6,56.9-37.6L397,419.6z M115,92.4 c13.9-12,29.4-22.3,46.1-30.4l-11.9-29.8c-20.7,9.9-39.8,22.6-56.8,37.6L115,92.4z M447.7,355.5c-7.8,14.9-17.2,28.8-28.1,41.5 l22.7,22.7c13.7-15.6,25.5-32.9,34.9-51.5L447.7,355.5z M471.4,272c-1.4,18.8-5.2,37-11.1,54.1l29.5,12.6 c7.5-21.1,12.2-43.5,13.6-66.8H471.4z M321.2,462c-15.7,5-32.2,8.2-49.2,9.4v32.1c21.2-1.4,41.7-5.4,61.1-11.7L321.2,462z M240,471.4c-18.8-1.4-37-5.2-54.1-11.1l-12.6,29.5c21.1,7.5,43.5,12.2,66.8,13.6V471.4z M462,190.8c5,15.7,8.2,32.2,9.4,49.2h32.1 c-1.4-21.2-5.4-41.7-11.7-61.1L462,190.8z M92.4,397c-12-13.9-22.3-29.4-30.4-46.1l-29.8,11.9c9.9,20.7,22.6,39.8,37.6,56.9 L92.4,397z M272,40.6c18.8,1.4,36.9,5.2,54.1,11.1l12.6-29.5C317.7,14.7,295.3,10,272,8.5V40.6z M190.8,50 c15.7-5,32.2-8.2,49.2-9.4V8.5c-21.2,1.4-41.7,5.4-61.1,11.7L190.8,50z M442.3,92.3L419.6,115c12,13.9,22.3,29.4,30.5,46.1 l29.8-11.9C470,128.5,457.3,109.4,442.3,92.3z M397,92.4l22.7-22.7c-15.6-13.7-32.8-25.5-51.5-34.9l-12.6,29.5 C370.4,72.1,384.4,81.5,397,92.4z"})});var o=f(f({},i),{},{attributeName:"opacity"}),s={tag:"circle",attributes:f(f({},r),{},{cx:"256",cy:"364",r:"28"}),children:[]};return e||s.children.push({tag:"animate",attributes:f(f({},i),{},{attributeName:"r",values:"28;14;28;28;14;28;"})},{tag:"animate",attributes:f(f({},o),{},{values:"1;0;1;1;0;1;"})}),n.push(s),n.push({tag:"path",attributes:f(f({},r),{},{opacity:"1",d:"M263.7,312h-16c-6.6,0-12-5.4-12-12c0-71,77.4-63.9,77.4-107.8c0-20-17.8-40.2-57.4-40.2c-29.1,0-44.3,9.6-59.2,28.7 c-3.9,5-11.1,6-16.2,2.4l-13.1-9.2c-5.6-3.9-6.9-11.8-2.6-17.2c21.2-27.2,46.4-44.7,91.2-44.7c52.3,0,97.4,29.8,97.4,80.2 c0,67.6-77.4,63.5-77.4,107.8C275.7,306.6,270.3,312,263.7,312z"}),children:e?[]:[{tag:"animate",attributes:f(f({},o),{},{values:"1;0;0;0;0;1;"})}]}),e||n.push({tag:"path",attributes:f(f({},r),{},{opacity:"0",d:"M232.5,134.5l7,168c0.3,6.4,5.6,11.5,12,11.5h9c6.4,0,11.7-5.1,12-11.5l7-168c0.3-6.8-5.2-12.5-12-12.5h-23 C237.7,122,232.2,127.7,232.5,134.5z"}),children:[{tag:"animate",attributes:f(f({},o),{},{values:"0;0;1;1;0;0;"})}]}),{tag:"g",attributes:{class:"missing"},children:n}}}},yo={hooks:function(){return{parseNodeAttributes:function(e,n){var r=n.getAttribute("data-fa-symbol"),i=r===null?!1:r===""?!0:r;return e.symbol=i,e}}}},bo=[li,Zi,to,eo,ao,co,mo,ho,vo,go,yo];Ii(bo,{mixoutsTo:I});var Ro=I.noAuto,Xa=I.config,Wo=I.library,Ka=I.dom,Ja=I.parse,Ho=I.findIconDefinition,Uo=I.toHtml,qa=I.icon,Yo=I.layer,xo=I.text,wo=I.counter;var ko=["*"],So=(()=>{class t{defaultPrefix="fas";fallbackIcon=null;fixedWidth;set autoAddCss(e){Xa.autoAddCss=e,this._autoAddCss=e}get autoAddCss(){return this._autoAddCss}_autoAddCss=!0;static \u0275fac=function(n){return new(n||t)};static \u0275prov=vt({token:t,factory:t.\u0275fac,providedIn:"root"})}return t})(),Ao=(()=>{class t{definitions={};addIcons(...e){for(let n of e){n.prefix in this.definitions||(this.definitions[n.prefix]={}),this.definitions[n.prefix][n.iconName]=n;for(let r of n.icon[2])typeof r=="string"&&(this.definitions[n.prefix][r]=n)}}addIconPacks(...e){for(let n of e){let r=Object.keys(n).map(i=>n[i]);this.addIcons(...r)}}getIconDefinition(e,n){return e in this.definitions&&n in this.definitions[e]?this.definitions[e][n]:null}static \u0275fac=function(n){return new(n||t)};static \u0275prov=vt({token:t,factory:t.\u0275fac,providedIn:"root"})}return t})(),Io=t=>{throw new Error(`Could not find icon with iconName=${t.iconName} and prefix=${t.prefix} in the icon library.`)},Co=()=>{throw new Error("Property `icon` is required for `fa-icon`/`fa-duotone-icon` components.")},Za=t=>t!=null&&(t===90||t===180||t===270||t==="90"||t==="180"||t==="270"),Po=t=>{let a=Za(t.rotate),e={[`fa-${t.animation}`]:t.animation!=null&&!t.animation.startsWith("spin"),"fa-spin":t.animation==="spin"||t.animation==="spin-reverse","fa-spin-pulse":t.animation==="spin-pulse"||t.animation==="spin-pulse-reverse","fa-spin-reverse":t.animation==="spin-reverse"||t.animation==="spin-pulse-reverse","fa-pulse":t.animation==="spin-pulse"||t.animation==="spin-pulse-reverse","fa-fw":t.fixedWidth,"fa-border":t.border,"fa-inverse":t.inverse,"fa-layers-counter":t.counter,"fa-flip-horizontal":t.flip==="horizontal"||t.flip==="both","fa-flip-vertical":t.flip==="vertical"||t.flip==="both",[`fa-${t.size}`]:t.size!==null,[`fa-rotate-${t.rotate}`]:a,"fa-rotate-by":t.rotate!=null&&!a,[`fa-pull-${t.pull}`]:t.pull!==null,[`fa-stack-${t.stackItemSize}`]:t.stackItemSize!=null};return Object.keys(e).map(n=>e[n]?n:null).filter(n=>n!=null)},Zt=new WeakSet,Qa="fa-auto-css";function Fo(t,a){if(!a.autoAddCss||Zt.has(t))return;if(t.getElementById(Qa)!=null){a.autoAddCss=!1,Zt.add(t);return}let e=t.createElement("style");e.setAttribute("type","text/css"),e.setAttribute("id",Qa),e.innerHTML=Ka.css();let n=t.head.childNodes,r=null;for(let i=n.length-1;i>-1;i--){let o=n[i],s=o.nodeName.toUpperCase();["STYLE","LINK"].indexOf(s)>-1&&(r=o)}t.head.insertBefore(e,r),a.autoAddCss=!1,Zt.add(t)}var Eo=t=>t.prefix!==void 0&&t.iconName!==void 0,Oo=(t,a)=>Eo(t)?t:Array.isArray(t)&&t.length===2?{prefix:t[0],iconName:t[1]}:{prefix:a,iconName:t},No=(()=>{class t{stackItemSize=tt("1x");size=tt();_effect=de(()=>{if(this.size())throw new Error('fa-icon is not allowed to customize size when used inside fa-stack. Set size on the enclosing fa-stack instead: <fa-stack size="4x">...</fa-stack>.')});static \u0275fac=function(n){return new(n||t)};static \u0275dir=oe({type:t,selectors:[["fa-icon","stackItemSize",""],["fa-duotone-icon","stackItemSize",""]],inputs:{stackItemSize:[1,"stackItemSize"],size:[1,"size"]}})}return t})(),To=(()=>{class t{size=tt();classes=yt(()=>{let e=this.size(),n=e?{[`fa-${e}`]:!0}:{};return ee(te({},n),{"fa-stack":!0})});static \u0275fac=function(n){return new(n||t)};static \u0275cmp=gt({type:t,selectors:[["fa-stack"]],hostVars:2,hostBindings:function(n,r){n&2&&ce(r.classes())},inputs:{size:[1,"size"]},ngContentSelectors:ko,decls:1,vars:0,template:function(n,r){n&1&&(fe(),ue(0))},encapsulation:2,changeDetection:0})}return t})(),ns=(()=>{class t{icon=S();title=S();animation=S();mask=S();flip=S();size=S();pull=S();border=S();inverse=S();symbol=S();rotate=S();fixedWidth=S();transform=S();a11yRole=S();renderedIconHTML=yt(()=>{let e=this.icon()??this.config.fallbackIcon;if(!e)return Co(),"";let n=this.findIconDefinition(e);if(!n)return"";let r=this.buildParams();Fo(this.document,this.config);let i=qa(n,r);return this.sanitizer.bypassSecurityTrustHtml(i.html.join(`
`))});document=$(ne);sanitizer=$(me);config=$(So);iconLibrary=$(Ao);stackItem=$(No,{optional:!0});stack=$(To,{optional:!0});constructor(){this.stack!=null&&this.stackItem==null&&console.error('FontAwesome: fa-icon and fa-duotone-icon elements must specify stackItemSize attribute when wrapped into fa-stack. Example: <fa-icon stackItemSize="2x" />.')}findIconDefinition(e){let n=Oo(e,this.config.defaultPrefix);if("icon"in n)return n;let r=this.iconLibrary.getIconDefinition(n.prefix,n.iconName);return r??(Io(n),null)}buildParams(){let e=this.fixedWidth(),n={flip:this.flip(),animation:this.animation(),border:this.border(),inverse:this.inverse(),size:this.size(),pull:this.pull(),rotate:this.rotate(),fixedWidth:typeof e=="boolean"?e:this.config.fixedWidth,stackItemSize:this.stackItem!=null?this.stackItem.stackItemSize():void 0},r=this.transform(),i=typeof r=="string"?Ja.transform(r):r,o=this.mask(),s=o!=null?this.findIconDefinition(o):null,l={},u=this.a11yRole();u!=null&&(l.role=u);let d={};return n.rotate!=null&&!Za(n.rotate)&&(d["--fa-rotate-angle"]=`${n.rotate}`),{title:this.title(),transform:i,classes:Po(n),mask:s??void 0,symbol:this.symbol(),attributes:l,styles:d}}static \u0275fac=function(n){return new(n||t)};static \u0275cmp=gt({type:t,selectors:[["fa-icon"]],hostAttrs:[1,"ng-fa-icon"],hostVars:2,hostBindings:function(n,r){n&2&&(le("innerHTML",r.renderedIconHTML(),re),se("title",r.title()??void 0))},inputs:{icon:[1,"icon"],title:[1,"title"],animation:[1,"animation"],mask:[1,"mask"],flip:[1,"flip"],size:[1,"size"],pull:[1,"pull"],border:[1,"border"],inverse:[1,"inverse"],symbol:[1,"symbol"],rotate:[1,"rotate"],fixedWidth:[1,"fixedWidth"],transform:[1,"transform"],a11yRole:[1,"a11yRole"]},outputs:{icon:"iconChange",title:"titleChange",animation:"animationChange",mask:"maskChange",flip:"flipChange",size:"sizeChange",pull:"pullChange",border:"borderChange",inverse:"inverseChange",symbol:"symbolChange",rotate:"rotateChange",fixedWidth:"fixedWidthChange",transform:"transformChange",a11yRole:"a11yRoleChange"},decls:0,vars:0,template:function(n,r){},encapsulation:2,changeDetection:0})}return t})();var rs=(()=>{class t{static \u0275fac=function(n){return new(n||t)};static \u0275mod=ie({type:t});static \u0275inj=ae({})}return t})();export{Ao as a,ns as b,rs as c};
