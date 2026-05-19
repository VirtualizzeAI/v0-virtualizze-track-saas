import{a as h,b as u,s as f}from"./svelte-vendor.js";import"clsx";import"./environment.js";let g={};function C(n){}function P(n){g=n}let _=null;function S(n){_=n}function j(n){}function v(n){const e=h(n),t=(o,{context:a}={})=>{const s=u(n,{props:o,context:a}),i=Object.defineProperties({},{css:{value:{code:"",map:null}},head:{get:()=>s.head},html:{get:()=>s.body},then:{value:(l,r)=>{{const c=l({css:i.css,head:i.head,html:i.html});return Promise.resolve(c)}}}});return i};return e.render=t,e}function y(n,e){n.component(t=>{let{stores:o,page:a,constructors:s,components:i=[],form:l,data_0:r=null,data_1:c=null}=e;f("__svelte__",o),o.page.set(a);const m=s[1];if(s[1]){t.push("<!--[-->");const p=s[0];t.push("<!---->"),p(t,{data:r,form:l,params:a.params,children:d=>{d.push("<!---->"),m(d,{data:c,form:l,params:a.params}),d.push("<!---->")},$$slots:{default:!0}}),t.push("<!---->")}else{t.push("<!--[!-->");const p=s[0];t.push("<!---->"),p(t,{data:r,form:l,params:a.params}),t.push("<!---->")}t.push("<!--]--> "),t.push("<!--[!-->"),t.push("<!--]-->")})}const b=v(y),E={app_template_contains_nonce:!1,async:!1,csp:{mode:"auto",directives:{"upgrade-insecure-requests":!1,"block-all-mixed-content":!1},reportOnly:{"upgrade-insecure-requests":!1,"block-all-mixed-content":!1}},csrf_check_origin:!0,csrf_trusted_origins:[],embedded:!1,env_public_prefix:"PUBLIC_",env_private_prefix:"",hash_routing:!1,hooks:null,preload_strategy:"modulepreload",root:b,service_worker:!1,service_worker_options:void 0,templates:{app:({head:n,body:e,assets:t,nonce:o,env:a})=>`<!doctype html>
<html lang="pt-BR">
	<head>
		<meta charset="utf-8" />
		<link rel="icon" href="`+t+`/favicon.png" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="theme-color" content="#22c55e" />
		<meta name="description" content="Sistema de gestão de projetos e tarefas" />
		<meta name="mobile-web-app-capable" content="yes" />
		<meta name="apple-mobile-web-app-capable" content="yes" />
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
		<meta name="apple-mobile-web-app-title" content="VTrack" />
		<link rel="apple-touch-icon" href="`+t+`/favicon.png" />
		<!-- Adicionando Tailwind CSS via CDN para preview funcionar -->
		<script src="https://cdn.tailwindcss.com"><\/script>
		<script>
			tailwind.config = {
				darkMode: 'class',
				theme: {
					extend: {
						colors: {
							'primary': '#22c55e',
							'primary-dark': '#16a34a',
						}
					}
				}
			}
		<\/script>
		`+n+`
	</head>
	<body data-sveltekit-preload-data="hover" class="dark">
		<div style="display: contents">`+e+`</div>
	</body>
</html>
`,error:({status:n,message:e})=>`<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>`+e+`</title>

		<style>
			body {
				--bg: white;
				--fg: #222;
				--divider: #ccc;
				background: var(--bg);
				color: var(--fg);
				font-family:
					system-ui,
					-apple-system,
					BlinkMacSystemFont,
					'Segoe UI',
					Roboto,
					Oxygen,
					Ubuntu,
					Cantarell,
					'Open Sans',
					'Helvetica Neue',
					sans-serif;
				display: flex;
				align-items: center;
				justify-content: center;
				height: 100vh;
				margin: 0;
			}

			.error {
				display: flex;
				align-items: center;
				max-width: 32rem;
				margin: 0 1rem;
			}

			.status {
				font-weight: 200;
				font-size: 3rem;
				line-height: 1;
				position: relative;
				top: -0.05rem;
			}

			.message {
				border-left: 1px solid var(--divider);
				padding: 0 0 0 1rem;
				margin: 0 0 0 1rem;
				min-height: 2.5rem;
				display: flex;
				align-items: center;
			}

			.message h1 {
				font-weight: 400;
				font-size: 1em;
				margin: 0;
			}

			@media (prefers-color-scheme: dark) {
				body {
					--bg: #222;
					--fg: #ddd;
					--divider: #666;
				}
			}
		</style>
	</head>
	<body>
		<div class="error">
			<span class="status">`+n+`</span>
			<div class="message">
				<h1>`+e+`</h1>
			</div>
		</div>
	</body>
</html>
`},version_hash:"i0dy5y"};async function O(){return{handle:void 0,handleFetch:void 0,handleError:void 0,handleValidationError:void 0,init:void 0,reroute:void 0,transport:void 0}}export{P as a,S as b,j as c,O as g,E as o,g as p,_ as r,C as s};
