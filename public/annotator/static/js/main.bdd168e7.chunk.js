(this["webpackJsonplabelbox-annotator"]=this["webpackJsonplabelbox-annotator"]||[]).push([[0],{104:function(e,t,a){},105:function(e,t,a){},108:function(e,t,a){},110:function(e,t,a){"use strict";a.r(t);var n=a(1),r=a.n(n),c=a(18),i=a.n(c),s=(a(94),a(3)),l=a(7),o=a(118),u=a(119),d=a(122),m=a(48),v=a(81),j=a(47),b=Object(n.createContext)({}),g=(a(95),a(2));function f(e){var t=e.state,a=Object(n.useContext)(b);return a?Object(g.jsxs)("div",{children:[Object(g.jsx)("h4",{className:"text-center mt-3",children:"Agents Present"}),Object(g.jsx)("p",{className:"small text-secondary text-center",children:"Applies to the entire video"}),Object(g.jsx)("ol",{className:"list-unstyled m-3",children:j.map((function(e){var n,r,c,i;return Object(g.jsx)(h,{agent:e,active:e.name===t.activeAgent,onActivate:function(){return a({type:"set_active_agent",activeAgent:e.name})},checked:null!==(n=null===(r=t.agentPresent)||void 0===r?void 0:r[e.name])&&void 0!==n&&n,onChange:function(t){return a({type:"set_agent_present",agent:e.name,isPresent:t.currentTarget.checked})},flipped:null!==(c=null===(i=t.agentFlipped)||void 0===i?void 0:i[e.name])&&void 0!==c&&c,onFlip:function(t){return a({type:"set_agent_flipped",agent:e.name,isFlipped:t.currentTarget.checked})}},e.name)}))})]}):null}function h(e){var t=e.agent,a=e.checked,n=e.onChange,r=e.flipped,c=e.onFlip;return Object(g.jsxs)("li",{children:[Object(g.jsx)(d.a.Check,{type:"checkbox",id:t.name+"-active",label:t.display_name,checked:a,onChange:n}),!t.symmetrical&&Object(g.jsx)(d.a.Check,{className:"indented-checkbox",type:"checkbox",id:t.name+"-flip",label:"Flip",checked:r,onChange:c})]})}function p(e){var t,a,r=e.state,c=e.agent,i=e.label,s=Object(n.useContext)(b);return s?Object(g.jsxs)("li",{className:"list-group-item py-2 px-3 "+(r.activeAgent===c.name?"active":""),onClick:function(){return s({type:"set_active_agent",activeAgent:c.name})},children:[c.display_name,Object(g.jsxs)(d.a,{children:[Object(g.jsx)(m.a,{id:"agent-".concat(c.name,"-blurred"),label:"Blurred",checked:null!==(t=null===i||void 0===i?void 0:i.isBlurred)&&void 0!==t&&t,onChange:function(e){return s({type:"set_agent_is_blurred",agentName:c.name,isBlurred:e.currentTarget.checked})}}),Object(g.jsx)(m.a,{id:"agent-".concat(c.name,"-obscured"),label:"Obscured",checked:null!==(a=null===i||void 0===i?void 0:i.isObscured)&&void 0!==a&&a,onChange:function(e){return s({type:"set_agent_is_obscured",agentName:c.name,isObscured:e.currentTarget.checked})}})]})]}):null}function O(e){var t=e.state;return Object(g.jsxs)("div",{className:"flex-grow-1",children:[Object(g.jsx)("h4",{className:"text-center mt-3",children:"Agent Annotations"}),Object(g.jsx)("p",{className:"small text-secondary text-center",children:"Applies to the current frame"}),Object(g.jsx)("ul",{className:"list-group list-group-flush",children:j.map((function(e){var a,n,r;return(null===(a=t.agentPresent)||void 0===a?void 0:a[e.name])&&Object(g.jsx)(p,{state:t,agent:e,label:null===(n=t.frames)||void 0===n||null===(r=n[t.activeFrame])||void 0===r?void 0:r[e.name]},e.name)}))}),Object.values(t.agentPresent).every((function(e){return!e}))&&Object(g.jsx)("p",{className:"text-center mx-2",children:"Use the checkboxes below to select the agents that are present in this video"})]})}function x(e){var t=e.state;return Object(g.jsxs)(v.a,{md:4,lg:3,xl:2,className:"bg-light h-100 border-end border-dark d-flex flex-column gx-0",children:[Object(g.jsx)(O,{state:t}),Object(g.jsx)(f,{state:t})]})}var _=a(30),y=a(82),k=a.n(y),w=(a(104),a(4)),F=(a(105),a(88)),M=a(123),A=a(83),N=a(124),C="//127.0.0.1:8011";function E(e,t){return e?"".concat(C,"/api/frame.jpg?experiment=").concat(e,"&frame=").concat(t):""}var P=["popper","children","show"];function S(e,t){var a;return t===e.activeFrame?"active":(null===(a=e.frames)||void 0===a?void 0:a[t])?"labeled":"unlabeled"}var T=Object(n.forwardRef)((function(e,t){var a=e.popper,r=e.children,c=(e.show,Object(w.a)(e,P));return Object(n.useEffect)((function(){a.scheduleUpdate()}),[r,a]),Object(g.jsx)(F.a,Object(s.a)(Object(s.a)({ref:t,body:!0},c),{},{children:r}))}));function I(e){var t=e.sample,a=e.state,r=Object(n.useContext)(b),c=Object(n.useMemo)((function(){for(var e=[],n=null,r=0,c=1;c<=t.numFrames;c++){var i=S(a,c);i!==n&&null!==n&&(e.push({componentType:n,componentLength:r}),r=0),r+=1,n=i}return 0!==r&&e.push({componentType:n,componentLength:r}),e}),[t.numFrames,a]),i=Object(n.useState)(null),s=Object(l.a)(i,2),o=s[0],u=s[1],d=Object(n.useState)(null),m=Object(l.a)(d,2),v=m[0],j=m[1];var f=null===o?null:Math.min(Math.floor(o*t.numFrames),t.numFrames-1);return Object(g.jsxs)(g.Fragment,{children:[Object(g.jsxs)(M.a,{show:null!==v,onHide:function(){return j(null)},children:[Object(g.jsx)(M.a.Header,{closeButton:!0,children:Object(g.jsxs)(M.a.Title,{children:["Jump to frame ",v,"?"]})}),Object(g.jsx)(M.a.Body,{children:Object(g.jsx)("p",{children:"You will automatically start annotating at this position. Removing annotations is not yet supported, so be sure this is the frame you want."})}),Object(g.jsxs)(M.a.Footer,{children:[Object(g.jsx)(A.a,{onClick:function(){return j(null)},variant:"secondary",children:"Cancel"}),Object(g.jsx)(A.a,{onClick:function(){r({type:"jump_to_frame",frame:v}),j(null)},variant:"primary",children:"Jump to frame"})]})]}),Object(g.jsxs)("div",{className:"timeline",onMouseMove:function(e){var t=e.currentTarget.getBoundingClientRect(),a=(e.clientX-t.x)/t.width;u(Math.max(0,Math.min(a,1))),e.preventDefault()},onMouseLeave:function(){u(null)},onClick:function(){j(f)},children:[null!==f&&Object(g.jsx)(N.a,{show:!0,placement:"top",overlay:Object(g.jsx)(T,{className:"p-0",children:Object(g.jsx)("img",{src:E(t.id,f),alt:"Frame ".concat(f),height:180})}),children:Object(g.jsx)("div",{className:"timeline-cursor",style:{width:"min(2px, ".concat(100/t.numFrames,"%)"),left:"".concat(100*f/t.numFrames,"%")}})}),c.map((function(e,t){var a=e.componentType,n=e.componentLength;return Object(g.jsx)("div",{className:"timeline-component timeline-component-".concat(a),style:{flexGrow:n}},t)}))]})]})}var R=a(121),B=a(125),H=a(116),L=a(117),D=a(120),W=a(126),J=a(77),U=a(86),Y=a(87),G=a(78);function K(e){var t,a,r,c=e.sample,i=e.state,s=e.returnToIndex,o=Object(n.useContext)(b),u=Object(n.useState)(!1),d=Object(l.a)(u,2),m=d[0],v=d[1];return Object(g.jsxs)(g.Fragment,{children:[Object(g.jsxs)(R.a,{className:"d-flex justify-content-between",children:[Object(g.jsx)(B.a,{children:Object(g.jsxs)(R.a.Text,{children:[Object(g.jsx)(H.a,{animation:"border",size:"sm",className:"me-2 ".concat(i.loading?"visible":"invisible")}),"Frame ",i.activeFrame," of ",c.numFrames]})}),Object(g.jsx)(B.a,{children:Object(g.jsxs)(L.a,{children:[Object(g.jsx)(A.a,{onClick:function(){return o({type:"previous_frame"})},disabled:i.activeFrame<=1,children:Object(g.jsx)(J.a,{})}),Object(g.jsx)(A.a,{onClick:function(){return o({type:"next_frame"})},disabled:i.activeFrame+c.sampleRate>c.numFrames,children:Object(g.jsx)(J.b,{})})]})}),Object(g.jsxs)(B.a,{children:[Object(g.jsxs)(D.a,{children:[Object(g.jsxs)(D.a.Toggle,{children:[(null===(t=i.dishMask)||void 0===t?void 0:t.locked)?Object(g.jsx)(G.a,{style:{verticalAlign:"text-top"}}):Object(g.jsx)(G.b,{style:{verticalAlign:"text-top"}})," Dish mask"]}),Object(g.jsxs)(D.a.Menu,{children:[(null===(a=i.dishMask)||void 0===a?void 0:a.locked)&&Object(g.jsx)(D.a.Item,{onClick:function(){return o({type:"set_dish_mask_locked",value:!1})},children:"Unlock"}),!(null===(r=i.dishMask)||void 0===r?void 0:r.locked)&&Object(g.jsx)(D.a.Item,{onClick:function(){return o({type:"set_dish_mask_locked",value:!0})},children:"Lock"}),Object(g.jsx)(D.a.Item,{onClick:function(){return o({type:"reset_dish_mask"})},children:"Reset to center"})]})]}),Object(g.jsx)(A.a,{className:"mx-2",variant:m?"info":"outline-info",onClick:function(){return v(!m)},children:Object(g.jsx)(U.a,{})}),Object(g.jsx)(A.a,{onClick:s,children:"Stop labeling"})]})]}),m&&Object(g.jsxs)(W.a,{border:"info",className:"mb-2",children:[Object(g.jsxs)(W.a.Header,{children:[Object(g.jsx)("button",{className:"float-end border-0",onClick:function(){return v(!m)},children:Object(g.jsx)(Y.a,{})}),"Help"]}),Object(g.jsxs)(W.a.Body,{className:"row",children:[Object(g.jsxs)("dl",{className:"col mb-0",children:[Object(g.jsx)("dt",{children:"Space"}),Object(g.jsx)("dd",{children:"Advance through agents and frames"}),Object(g.jsx)("dt",{children:"b"}),Object(g.jsx)("dd",{children:"Reverse through agents and frames"})]}),Object(g.jsxs)("dl",{className:"col mb-0",children:[Object(g.jsx)("dt",{children:"q/e/scroll"}),Object(g.jsx)("dd",{children:"Rotate selected agent"}),Object(g.jsx)("dt",{children:"w/a/s/d/drag"}),Object(g.jsx)("dd",{children:"Move selected agent"})]}),Object(g.jsxs)("dl",{className:"col mb-0",children:[Object(g.jsx)("dt",{children:"Shift"}),Object(g.jsx)("dd",{children:"Rotate/move by 10x"})]})]})]})]})}function X(e,t,a,n){var r=new DOMMatrix([Math.cos(a),-Math.sin(a),Math.sin(a),Math.cos(a),e,t]);return n&&r.multiplySelf(new DOMMatrix([1,0,0,-1,0,0])),r}var q=Symbol("DISH_MASK");function z(e){var t=e.sample,a=e.state,r=e.returnToIndex,c=Object(n.useContext)(b),i=Object(n.useState)(null),s=Object(l.a)(i,2),o=s[0],u=s[1],d=Object(n.useState)(null),m=Object(l.a)(d,2),f=m[0],h=m[1];Object(n.useEffect)((function(){var e=document.createElement("img");function n(){h(e),c({type:"set_loading_finished"})}return e.addEventListener("load",n),e.src=E(t.id,a.activeFrame),function(){return e.removeEventListener("load",n)}}),[c,t.id,a.activeFrame]);var p=Object(n.useMemo)((function(){var e,t,n,r,c,i;return f?{x:null!==(e=null===(t=a.dishMask)||void 0===t?void 0:t.x)&&void 0!==e?e:f.naturalWidth/2,y:null!==(n=null===(r=a.dishMask)||void 0===r?void 0:r.y)&&void 0!==n?n:f.naturalHeight/2,radius:null!==(c=null===(i=a.dishMask)||void 0===i?void 0:i.radius)&&void 0!==c?c:500}:null}),[f,a]),O=Object(n.useState)(null),x=Object(l.a)(O,2),y=x[0],w=x[1];Object(n.useEffect)((function(){o&&f&&(o.width=f.naturalWidth,o.height=f.naturalHeight,o.getContext("2d").save(),w(o))}),[o,f]),Object(n.useEffect)((function(){if(y&&p){var e=y.getContext("2d");e.restore(),e.save(),e.fillStyle="black",e.fillRect(0,0,y.width,y.height),e.beginPath();var t=p.x,a=p.y,n=p.radius;e.arc(t,a,n,0,2*Math.PI),e.clip()}}),[y,p]);var F=Object(n.useCallback)((function(e,t){var a,n,r,c,i;if(!y)throw new Error("Canvas ref was cleared");if(t===q)return p;console.assert("string"===typeof t);var s=null!==(a=null===(n=e.frames[e.activeFrame])||void 0===n?void 0:n[t])&&void 0!==a?a:{};return{x:null!==(r=s.x)&&void 0!==r?r:y.width/2,y:null!==(c=s.y)&&void 0!==c?c:y.height/2,angle:null!==(i=s.angle)&&void 0!==i?i:0}}),[y,p]);function M(e){if(!y)throw new Error("Canvas ref was cleared");return{x:e.nativeEvent.offsetX*(y.height/y.clientHeight),y:e.nativeEvent.offsetY*(y.width/y.clientWidth)}}Object(n.useEffect)((function(){if(y&&f){var e=y.getContext("2d");e.setTransform(1,0,0,1,0,0),e.drawImage(f,0,0),e.lineWidth=2;var t,n=Object(_.a)(j);try{for(n.s();!(t=n.n()).done;){var r,c=t.value;if(a.agentPresent[c.name]){c.name===a.activeAgent?(e.strokeStyle="red",e.fillStyle="rgba(255, 0, 0, 0.2)"):(e.strokeStyle="darkgrey",e.fillStyle="rgba(0,0,0,0.2)");var i=F(a,c.name),s=i.x,o=i.y,u=i.angle,d=null===(r=a.agentFlipped)||void 0===r?void 0:r[c.name];e.setTransform(X(s,o,u,d)),e.beginPath();var m,v=Object(_.a)(c.shape);try{for(v.s();!(m=v.n()).done;){var b=Object(l.a)(m.value,2),g=b[0],h=b[1];e.lineTo(g,h)}}catch(p){v.e(p)}finally{v.f()}e.stroke(),e.fill()}}}catch(p){n.e(p)}finally{n.f()}}}),[y,F,f,a]),Object(n.useEffect)((function(){var e,t,n,r,i=null!==(e=null===(t=a.frames[a.activeFrame])||void 0===t?void 0:t[a.activeAgent])&&void 0!==e?e:{};c&&f&&("undefined"===typeof i.x||"undefined"===typeof i.y)&&c({type:"set_agent_position",agentName:a.activeAgent,x:null!==(n=i.x)&&void 0!==n?n:f.naturalWidth/2,y:null!==(r=i.y)&&void 0!==r?r:f.naturalHeight/2})}),[c,a,f]),Object(n.useEffect)((function(){(new Image).src=E(t.id,a.activeFrame+1),(new Image).src=E(t.id,a.activeFrame+2),(new Image).src=E(t.id,a.activeFrame+3)}),[t.id,a.activeFrame]);var A=Object(n.useState)(null),N=Object(l.a)(A,2),C=N[0],P=N[1];function S(e,t,n){n&&P({agentName:n,mouse:{x:e,y:t},agent:F(a,n)})}function T(e,t){var n,r=Object(_.a)(j);try{for(r.s();!(n=r.n()).done;){var c=n.value;if(a.agentPresent[c.name]){var i=F(a,c.name),s=e-i.x,l=t-i.y,o=s*Math.cos(-i.angle)+l*Math.sin(-i.angle),u=-s*Math.sin(-i.angle)+l*Math.cos(-i.angle);if(k()(c.shape,[o,u])<=0)return c.name}}}catch(d){r.e(d)}finally{r.f()}return null}function R(e,t){var n;if(null===(n=a.dishMask)||void 0===n?void 0:n.locked)return!1;var r=p.x,c=p.y,i=p.radius;return Math.pow(e-r,2)+Math.pow(t-c,2)>Math.pow(i,2)}function B(){return C&&(C.agentName===a.activeAgent||C.agentName===q)}return Object(g.jsxs)(v.a,{className:"h-100 d-flex flex-column",children:[Object(g.jsx)(K,{sample:t,state:a,returnToIndex:r}),Object(g.jsxs)("div",{className:"labeler-canvas-container",children:[Object(g.jsx)("canvas",{className:"labeler-canvas",ref:u,onMouseDown:function(e){var t=M(e),n=t.x,r=t.y;if(R(n,r))S(n,r,q);else{var i=T(n,r);i&&c({type:"set_active_agent",activeAgent:i}),S(n,r,null!==i&&void 0!==i?i:a.activeAgent)}},onMouseUp:function(){P(null)},onMouseMove:function(e){if(B()){var t=e.nativeEvent.offsetX*(y.height/y.clientHeight)-C.mouse.x,a=e.nativeEvent.offsetY*(y.width/y.clientWidth)-C.mouse.y;C.agentName===q?c({type:"set_dish_mask_position",x:t+C.agent.x,y:a+C.agent.y}):c({type:"set_agent_position",agentName:C.agentName,x:t+C.agent.x,y:a+C.agent.y})}},onWheel:function(e){var t=M(e),n=function(e,t){var n;return B()?C.agentName:R(e,t)?q:null!==(n=T(e,t))&&void 0!==n?n:a.activeAgent}(t.x,t.y);if(n===q){var r=p.radius;c({type:"set_dish_mask_radius",radius:Math.max(10,r+e.deltaY/(e.shiftKey?10:100))})}else n&&(n!==a.activeAgent&&c({type:"set_active_agent",activeAgent:n}),c({type:"rotate_agent",agentName:n,by:e.deltaY/(e.shiftKey?1e3:1e4)}))}}),Object(g.jsx)(I,{sample:t,state:a})]})]})}var Q=a(8);function V(e,t,a){var n,r,c,i;if(!t)return e;"function"===typeof a&&(a=a(null!==(c=null===(i=e.frames[e.activeFrame])||void 0===i?void 0:i[t])&&void 0!==c?c:{}));return Object(s.a)(Object(s.a)({},e),{},{frames:Object(s.a)(Object(s.a)({},e.frames),{},Object(Q.a)({},e.activeFrame,Object(s.a)(Object(s.a)({},e.frames[e.activeFrame]),{},Object(Q.a)({},t,Object(s.a)(Object(s.a)({},null!==(n=null===(r=e.frames[e.activeFrame])||void 0===r?void 0:r[t])&&void 0!==n?n:{}),a)))))})}function Z(e,t){return t-=1,t=Math.max(0,Math.min(t,e.numFrames-1)),t=Math.round(t/e.sampleRate)*e.sampleRate,t+=1}function $(e,t){var a;if(!e.settings&&"set_state"!==t.type)return console.warn("Received",t.type,"action before initial state from server"),e;switch(t.type){case"set_state":return t.state;case"set_loading_finished":return Object(s.a)(Object(s.a)({},e),{},{loading:!1});case"set_active_agent":return Object(s.a)(Object(s.a)({},e),{},{activeAgent:t.activeAgent});case"set_agent_present":return Object(s.a)(Object(s.a)({},e),{},{agentPresent:Object(s.a)(Object(s.a)({},e.agentPresent),{},Object(Q.a)({},t.agent,t.isPresent))});case"set_agent_flipped":return Object(s.a)(Object(s.a)({},e),{},{agentFlipped:Object(s.a)(Object(s.a)({},e.agentFlipped),{},Object(Q.a)({},t.agent,t.isFlipped))});case"active_agent_toggle_present":return Object(s.a)(Object(s.a)({},e),{},{agentPresent:Object(s.a)(Object(s.a)({},e.agentPresent),{},Object(Q.a)({},e.activeAgent,!e.agentPresent[e.activeAgent]))});case"set_agent_position":return V(e,t.agentName,{x:t.x,y:t.y});case"rotate_agent":return V(e,t.agentName,(function(e){return{angle:(a=(e.angle||0)+t.by,a%(2*Math.PI))};var a}));case"rotate_active_agent":return $(e,{type:"rotate_agent",agentName:e.activeAgent,by:t.by});case"move_agent":return V(e,t.agentName,(function(e){return{x:(e.x||0)+(t.x||0),y:(e.y||0)+(t.y||0)}}));case"move_active_agent":return $(e,{type:"move_agent",agentName:e.activeAgent,x:t.x,y:t.y});case"next_frame":return e.loading?e:Object(s.a)(Object(s.a)({},e),{},{loading:!0,activeFrame:Z(e.settings,e.activeFrame+e.settings.sampleRate),frames:Object(s.a)(Object(s.a)({},e.frames),{},Object(Q.a)({},e.activeFrame+1,null!==(a=e.frames[e.activeFrame+1])&&void 0!==a?a:e.frames[e.activeFrame]))});case"previous_frame":return Object(s.a)(Object(s.a)({},e),{},{loading:!0,activeFrame:Z(e.settings,e.activeFrame-e.settings.sampleRate)});case"jump_to_frame":return Object(s.a)(Object(s.a)({},e),{},{loading:!0,activeFrame:Z(e.settings,t.frame)});case"set_agent_is_blurred":return V(e,t.agentName,{isBlurred:t.isBlurred});case"toggle_active_agent_is_blurred":return V(e,e.activeAgent,(function(e){return{isBlurred:!e.isBlurred}}));case"set_agent_is_obscured":return V(e,t.agentName,{isObscured:t.isObscured});case"toggle_active_agent_is_obscured":return V(e,e.activeAgent,(function(e){return{isObscured:!e.isObscured}}));case"step_advance":return $(e,function(e){var t=Object.keys(e.agentPresent).filter((function(t){return e.agentPresent[t]}));if(!e.activeAgent)return t.length>0?{type:"set_active_agent",activeAgent:t[0]}:{type:"next_frame"};var a=t.indexOf(e.activeAgent);if(a<0)throw new Error("Current agent is not present");return a+1<t.length?{type:"set_active_agent",activeAgent:t[a+1]}:{type:"advance_frame_and_set_agent",activeAgent:t[0]}}(e));case"step_retreat":return $(e,function(e){var t=Object.keys(e.agentPresent).filter((function(t){return e.agentPresent[t]})).reverse();if(!e.activeAgent){if(t.length>0)return{type:"set_active_agent",activeAgent:t[0]};throw new Error("Tried to retreat when no agents were active")}var a=t.indexOf(e.activeAgent);if(a<0)throw new Error("Current agent is not present");return a+1<t.length?{type:"set_active_agent",activeAgent:t[a+1]}:{type:"retreat_frame_and_set_agent",activeAgent:t[0]}}(e));case"advance_frame_and_set_agent":return e.loading?e:$($(e,{type:"next_frame"}),{type:"set_active_agent",activeAgent:t.activeAgent});case"retreat_frame_and_set_agent":return e.loading?e:$($(e,{type:"previous_frame"}),{type:"set_active_agent",activeAgent:t.activeAgent});case"set_dish_mask_position":return Object(s.a)(Object(s.a)({},e),{},{dishMask:Object(s.a)(Object(s.a)({},e.dishMask),{},{x:t.x,y:t.y})});case"set_dish_mask_radius":return Object(s.a)(Object(s.a)({},e),{},{dishMask:Object(s.a)(Object(s.a)({},e.dishMask),{},{radius:t.radius})});case"reset_dish_mask":return Object(s.a)(Object(s.a)({},e),{},{dishMask:null});case"set_dish_mask_locked":return Object(s.a)(Object(s.a)({},e),{},{dishMask:Object(s.a)(Object(s.a)({},e.dishMask),{},{locked:t.value})});default:throw new Error("Unknown reducer action")}}var ee={settings:null,loading:!0,activeFrame:1,activeAgent:null,agentPresent:{},frames:{}},te=Symbol("NO_MATCH");function ae(){var e=Object(n.useReducer)($,ee,(function(e){return e})),t=Object(l.a)(e,2),a=t[0],r=t[1],c=Object(n.useState)(null),i=Object(l.a)(c,2),d=i[0],m=i[1],v=Object(n.useMemo)((function(){return new URL(window.location).searchParams.get("experiment_id")}),[]);Object(n.useEffect)((function(){var e=new AbortController,t=e.signal;return fetch("".concat(C,"/api/experiment?id=").concat(v),{signal:t}).then((function(e){return e.json()})).then((function(e){if(t.aborted)console.log("State restoration aborted after fetch finished");else{m(e);var a=Object(s.a)(Object(s.a)({},ee),e.label);delete e.label,a.settings=e,r({type:"set_state",state:a})}})).catch((function(e){"AbortError"!==e.name&&alert("Failed to fetch experiment: ".concat(e))})),function(){return e.abort()}}),[v]),Object(n.useEffect)((function(){function e(e){var t=function(){switch(e.key){case" ":return r({type:"step_advance"});case"b":return r({type:"step_retreat"});case"r":return r({type:"toggle_active_agent_is_blurred"});case"f":return r({type:"toggle_active_agent_is_obscured"});case"q":return r({type:"rotate_active_agent",by:.01});case"Q":return r({type:"rotate_active_agent",by:.1});case"e":return r({type:"rotate_active_agent",by:-.01});case"E":return r({type:"rotate_active_agent",by:-.1});case"w":return r({type:"move_active_agent",y:-1});case"W":return r({type:"move_active_agent",y:-10});case"a":return r({type:"move_active_agent",x:-1});case"A":return r({type:"move_active_agent",x:-10});case"s":return r({type:"move_active_agent",y:1});case"S":return r({type:"move_active_agent",y:10});case"d":return r({type:"move_active_agent",x:1});case"D":return r({type:"move_active_agent",x:10})}return te}();return t!==te&&e.preventDefault(),t}return document.addEventListener("keypress",e),function(){return document.removeEventListener("keypress",e)}}),[]);var j=!!d;return Object(n.useEffect)((function(){if(j&&d.settings){var e=Object.fromEntries(["activeFrame","activeAgent","agentPresent","frames"].map((function(e){return[e,a[e]]})));fetch("".concat(C,"/api/set_label?id=").concat(v),{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)}).catch((function(e){alert("Failed to save changes: ".concat(e))}))}}),[j,a.activeFrame,v]),d?Object(g.jsx)(o.a,{fluid:!0,className:"h-100",children:Object(g.jsx)(u.a,{className:"h-100",children:Object(g.jsxs)(b.Provider,{value:r,children:[Object(g.jsx)(x,{state:a}),Object(g.jsx)(z,{sample:d,state:a,returnToIndex:function(){window.location="".concat(C,"/")}})]})})}):Object(g.jsx)("p",{children:"Loading\u2026"})}a(108),a(109);var ne=function(){return Object(g.jsx)("div",{className:"App",children:Object(g.jsx)(ae,{})})},re=function(e){e&&e instanceof Function&&a.e(3).then(a.bind(null,127)).then((function(t){var a=t.getCLS,n=t.getFID,r=t.getFCP,c=t.getLCP,i=t.getTTFB;a(e),n(e),r(e),c(e),i(e)}))};i.a.render(Object(g.jsx)(r.a.StrictMode,{children:Object(g.jsx)(ne,{})}),document.getElementById("root")),re()},47:function(e){e.exports=JSON.parse('[{"name":"gripper","display_name":"Gripper 1","shape":[[-143.92413189141612,51.84335246093342],[-48.072342656447375,79.81538314258269],[45.72914296233611,47.88919803209455],[143.44817449766214,86.51549575525146],[147.47556283000537,22.736344434302506],[96.40098497990128,-5.199072108746524],[137.55354949126553,-24.237623370279092],[147.47556658087464,-86.51565783567874],[62.49771702868982,-29.949191749434274],[-83.73301142993273,-62.60763712671145],[-147.47555142543342,-29.47323514143342],[-46.4247729973664,4.0639111158393595],[-143.92413189141612,51.84335246093342]]},{"name":"hammer","display_name":"Hammer 1","symmetrical":true,"shape":[[-113.63075292686482,-9.350874622148904],[-116.24090468580708,3.186553654626621],[-99.65774142852855,9.350861919342712],[81.90005536895531,6.949524366319025],[116.24095042089394,-9.35087216357365],[-113.63075292686482,-9.350874622148904]]},{"name":"needle","display_name":"Needle","symmetrical":true,"shape":[[122.86275165514863,4.463351744530263],[124.32539849455918,-3.465120001220135],[-114.05223857267488,-4.463450383742782],[-124.3255881557796,-0.05229539402387677],[-115.5729269962321,4.463335528244747],[122.86275165514863,4.463351744530263]]},{"name":"pillcam","display_name":"Pillcam","symmetrical":true,"shape":[[4.585514267115303,-185.38631589799516],[30.79716156694573,-179.30770208979084],[58.632807234519504,-149.96188756251487],[66.15328787764503,-123.49601574811257],[60.67797622200067,118.25596658558737],[50.907420517050994,153.14917855033025],[17.137347004772277,181.6374592105472],[-14.405418787275961,185.38631586131314],[-44.38110096560142,172.17804277419],[-66.15331105269996,141.03368746021306],[-66.15330385277282,-122.5132723021791],[-50.81258336876257,-156.41994266409267],[-19.9945455511072,-180.40428224369262],[4.585514267115303,-185.38631589799516]]},{"name":"gripper 2","display_name":"Gripper 2","shape":[[17.235294117647054,95.35294117647058],[12.235294117647054,95.35294117647058],[-3.7647058823529447,40.35294117647058],[-13.764705882352946,38.35294117647058],[-44.76470588235294,89.35294117647058],[-57.76470588235294,86.35294117647058],[-36.76470588235294,-22.647058823529424],[-37.76470588235294,-52.64705882352942],[-54.76470588235294,-109.64705882352942],[-1.7647058823529445,-97.64705882352942],[8.235294117647054,-77.64705882352942],[15.235294117647054,-76.64705882352942],[30.235294117647054,-91.64705882352942],[83.23529411764706,-74.64705882352942],[48.23529411764706,-32.64705882352942],[19.235294117647054,95.35294117647058],[17.235294117647054,95.35294117647058]]},{"name":"hammer2","display_name":"Hammer 2","symmetrical":true,"shape":[[140.33333333333334,102.66666666666667],[-144.66666666666666,-88.33333333333333],[-149.66666666666666,-104.33333333333333],[-132.66666666666666,-103.33333333333333],[146.33333333333334,90.66666666666667],[140.33333333333334,102.66666666666667]]}]')},94:function(e,t,a){},95:function(e,t,a){}},[[110,1,2]]]);
//# sourceMappingURL=main.bdd168e7.chunk.js.map