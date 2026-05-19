
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/clientes" | "/clientes/[id]" | "/conexoes" | "/cursos" | "/dashboard" | "/disparo" | "/funcionarios" | "/leads" | "/nova-senha" | "/perfil" | "/projetos" | "/projetos/novo" | "/projetos/[id]" | "/super-admin" | "/tarefas" | "/tarefas/[id]";
		RouteParams(): {
			"/clientes/[id]": { id: string };
			"/projetos/[id]": { id: string };
			"/tarefas/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string };
			"/clientes": { id?: string };
			"/clientes/[id]": { id: string };
			"/conexoes": Record<string, never>;
			"/cursos": Record<string, never>;
			"/dashboard": Record<string, never>;
			"/disparo": Record<string, never>;
			"/funcionarios": Record<string, never>;
			"/leads": Record<string, never>;
			"/nova-senha": Record<string, never>;
			"/perfil": Record<string, never>;
			"/projetos": { id?: string };
			"/projetos/novo": Record<string, never>;
			"/projetos/[id]": { id: string };
			"/super-admin": Record<string, never>;
			"/tarefas": { id?: string };
			"/tarefas/[id]": { id: string }
		};
		Pathname(): "/" | "/clientes" | "/clientes/" | `/clientes/${string}` & {} | `/clientes/${string}/` & {} | "/conexoes" | "/conexoes/" | "/cursos" | "/cursos/" | "/dashboard" | "/dashboard/" | "/disparo" | "/disparo/" | "/funcionarios" | "/funcionarios/" | "/leads" | "/leads/" | "/nova-senha" | "/nova-senha/" | "/perfil" | "/perfil/" | "/projetos" | "/projetos/" | "/projetos/novo" | "/projetos/novo/" | `/projetos/${string}` & {} | `/projetos/${string}/` & {} | "/super-admin" | "/super-admin/" | "/tarefas" | "/tarefas/" | `/tarefas/${string}` & {} | `/tarefas/${string}/` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.png" | "/header.png" | string & {};
	}
}